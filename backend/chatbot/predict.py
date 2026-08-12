"""
predict.py — answer a student's question

This is the module the chat route calls. It replaces resolveAnswer() from the
frontend prototype, and it is where the algorithms the project is built on
actually run:

    student's question
      -> NLP preprocessing        (preprocess.py: tokenise, stopwords, stem)
      -> TF-IDF vectorisation     (vectoriser fitted in train.py)
      -> Naive Bayes              -> predicted category + confidence
      -> cosine similarity        -> closest question inside that category
      -> answer read from MySQL

Two safeguards keep it from confidently returning nonsense:

  * If Naive Bayes is unsure, or the closest question inside the predicted
    category is still not close enough, the search is repeated across every
    category. A misclassification therefore degrades the answer rather than
    losing it.
  * If nothing anywhere clears the similarity threshold the fallback reply is
    returned instead of the least-bad guess.

    python -m chatbot.predict "what are the college timings"
"""

import sys
from pathlib import Path

import joblib
from sklearn.metrics.pairwise import cosine_similarity

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import Config  # noqa: E402
from db import execute, query  # noqa: E402

from .preprocess import content_stems, preprocess  # noqa: E402

MODEL_FILE = Config.MODEL_DIR / "chatbot_model.joblib"

FALLBACK = (
    "I could not find that in my knowledge base yet. I can answer questions "
    "about departments, faculty, class timings, college information, contact "
    "details and campus facilities. Try rephrasing your question, or contact "
    "the college office at +91 80 2321 4500."
)

GREETINGS = {
    "hi": "Hello! I am the college enquiry assistant. You can ask me about "
          "departments, faculty, class timings, facilities or contact details.",
    "hello": None, "hey": None, "hii": None, "namaste": None, "greetings": None,
}
THANKS = {"thanks", "thank", "thankyou", "ty"}
BYES = {"bye", "goodbye", "ok", "okay"}

_model = None


def load_model(force=False):
    """Load the trained model once and keep it in memory."""
    global _model
    if _model is None or force:
        if not MODEL_FILE.exists():
            raise FileNotFoundError(
                f"No trained model at {MODEL_FILE}.\n"
                "Train it with:  python -m chatbot.train"
            )
        _model = joblib.load(MODEL_FILE)
    return _model


def small_talk(text):
    """Handle greetings before the classifier is consulted."""
    words = [w for w in str(text).lower().replace("?", " ").split() if w.isalpha()]
    if not words or len(words) > 3:
        return None
    for word in words:
        if word in GREETINGS:
            return GREETINGS["hi"]
        if word in THANKS:
            return "You are welcome. Feel free to ask anything else about the college."
        if word in BYES:
            return "Glad to help. You can come back any time you have a question."
        if word in {"help", "options", "menu"}:
            return (
                "I can answer questions about Departments, Faculty, Timetable, "
                "College Information, Contact Information and Facilities."
            )
    return None


def active_question_ids():
    rows = query("SELECT id FROM questions WHERE status = 'Active'")
    return {r["id"] for r in rows}


def answer_for(question_id):
    return query(
        """SELECT q.id, q.code, q.question, q.answer, c.name AS category
           FROM questions q JOIN categories c ON c.id = q.category_id
           WHERE q.id = %s""",
        (question_id,),
    )


def _best_match(similarities, model, allowed_ids, restrict_to=None):
    """
    The similarity scores are per *phrasing*. Collapse them to per question by
    taking each question's best-scoring phrasing, then return the highest
    scoring question that is Active and, optionally, inside a given category.

    Returns (question dict, score) or (None, 0.0).
    """
    by_id = {q["id"]: q for q in model["questions"]}
    question_ids = model["phrase_question_ids"]

    best_question, best_score = None, 0.0
    for position, question_id in enumerate(question_ids):
        question = by_id.get(int(question_id))
        if question is None or question["id"] not in allowed_ids:
            continue
        if restrict_to and question["category"] != restrict_to:
            continue
        score = float(similarities[position])
        if score > best_score:
            best_question, best_score = question, score
    return best_question, best_score


def ask(text, user_id=None, log=True):
    """
    Answer a question. Returns a dict the chat route can send straight to the
    browser:

        {answer, category, matched, confidence, similarity, source}
    """
    text = (text or "").strip()
    if not text:
        return {"answer": FALLBACK, "category": None, "matched": None,
                "confidence": 0.0, "similarity": 0.0, "source": "empty"}

    chit = small_talk(text)
    if chit:
        return {"answer": chit, "category": None, "matched": None,
                "confidence": 1.0, "similarity": 0.0, "source": "greeting"}

    model = load_model()
    vectorizer = model["vectorizer"]
    classifier = model["classifier"]
    questions = model["questions"]

    document = preprocess(text)
    if not document:
        return {"answer": FALLBACK, "category": None, "matched": None,
                "confidence": 0.0, "similarity": 0.0, "source": "no_tokens"}

    # ---- vocabulary gate ----
    # Question words ("what", "where", "how") appear in nearly every stored
    # question, so on their own they match everything. If none of the words
    # that actually name a subject are known to the model, the question is
    # about something the knowledge base does not cover, and answering from
    # the question word alone would produce a confident wrong answer.
    vocabulary = vectorizer.vocabulary_
    subject = content_stems(text)
    known_subject = [t for t in subject if t in vocabulary]
    if not known_subject:
        return {"answer": FALLBACK, "category": None, "matched": None,
                "confidence": 0.0, "similarity": 0.0, "source": "out_of_scope"}

    # ---- coverage ----
    # Words the model has never seen simply disappear during vectorisation, so
    # "how do i apply for a bank loan" reduces to "how apply" and then looks
    # like a near-perfect match for "how do i apply for admission". Scaling the
    # similarity by the share of the question we actually recognised stops a
    # partly-understood question from scoring like a fully-understood one.
    coverage = len(known_subject) / len(subject)

    vector = vectorizer.transform([document])

    # ---- Naive Bayes: which category is this question about? ----
    probabilities = classifier.predict_proba(vector)[0]
    best = probabilities.argmax()
    category = classifier.classes_[best]
    confidence = float(probabilities[best])

    # ---- cosine similarity: which stored question is closest? ----
    similarities = cosine_similarity(vector, model["phrase_matrix"])[0] * coverage
    allowed = active_question_ids()

    source = "category"
    matched, score = (None, 0.0)
    if confidence >= Config.MIN_CATEGORY_CONFIDENCE:
        matched, score = _best_match(similarities, model, allowed, category)

    # Category was unhelpful — search everything rather than give up.
    if matched is None or score < Config.MIN_SIMILARITY:
        wider, wider_score = _best_match(similarities, model, allowed)
        if wider_score > score:
            matched, score, source = wider, wider_score, "global"

    if matched is None or score < Config.MIN_SIMILARITY:
        result = {"answer": FALLBACK, "category": category, "matched": None,
                  "confidence": confidence, "similarity": float(score),
                  "source": "fallback"}
    else:
        rows = answer_for(matched["id"])
        if not rows:
            result = {"answer": FALLBACK, "category": category, "matched": None,
                      "confidence": confidence, "similarity": float(score),
                      "source": "missing_row"}
        else:
            row = rows[0]
            result = {
                "answer": row["answer"],
                "category": row["category"],
                "matched": row["code"],
                "matched_id": row["id"],
                "confidence": confidence,
                "similarity": float(score),
                "source": source,
            }

    if log:
        try:
            execute(
                """INSERT INTO chat_log
                     (user_id, question_text, matched_question_id,
                      predicted_category, confidence, answered)
                   VALUES (%s, %s, %s, %s, %s, %s)""",
                (
                    user_id,
                    text[:255],
                    result.get("matched_id"),
                    category,
                    round(confidence, 4),
                    1 if result.get("matched") else 0,
                ),
            )
        except Exception:
            pass  # logging must never break an answer

    result.pop("matched_id", None)
    return result


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit('Usage: python -m chatbot.predict "your question"')
    outcome = ask(" ".join(sys.argv[1:]), log=False)
    print(f"\ncategory   : {outcome['category']}  "
          f"(confidence {outcome['confidence']:.1%})")
    print(f"matched    : {outcome['matched']}  "
          f"(similarity {outcome['similarity']:.2f}, via {outcome['source']})")
    print(f"\n{outcome['answer']}\n")
