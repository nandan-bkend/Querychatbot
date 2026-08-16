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

One optional extra sits behind that last step. If a Gemini key is configured,
llm.py gets a chance to answer from the college's own records before the
apology is sent — see _decline() below and the long comment at the top of
llm.py. It is off unless a key is present, it never runs when the classifier
found a match, and it cannot change an answer the classifier produced.

    python -m chatbot.predict "what are the college timings"
"""

import random
import re
import sys
from pathlib import Path

import joblib
from sklearn.metrics.pairwise import cosine_similarity

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import COLLEGE, Config  # noqa: E402
from db import execute, query  # noqa: E402

from . import llm  # noqa: E402
from .preprocess import content_stems, preprocess  # noqa: E402

MODEL_FILE = Config.MODEL_DIR / "chatbot_model.joblib"

# ==========================================================================
#  What the assistant says when it cannot answer
#
#  Declining well matters as much as answering well. A blunt "not found in my
#  knowledge base" reads like an error message and makes the whole system feel
#  brittle. These are apologetic, offer a way forward, and rotate so that
#  asking two unknown questions in a row does not produce the same sentence
#  twice — repetition is what makes a chatbot feel mechanical.
# ==========================================================================

FALLBACKS = [
    "Sorry, I don't know that one yet. I'm best with things like departments, "
    "faculty, class timings, facilities and contact details — happy to help "
    "with any of those.",

    "I'm afraid that's outside what I've been taught so far. Ask me about the "
    "departments, our faculty, class timings or campus facilities and I should "
    "be able to help.",

    "That one's not in my notes yet, sorry. I can tell you about departments, "
    "faculty members, timings, admissions or how to contact the college.",

    "Apologies — I don't have an answer for that. Try asking about the "
    "departments, the faculty, class timings or campus facilities, and I'll do "
    "my best.",
]

OFFICE_NOTE = (
    f" If it's something urgent, the college office is on {COLLEGE['phone']}."
)

# Regex is used rather than word matching so that "how are you" is recognised
# while "how many seats are there" is left alone for the classifier.
SMALL_TALK = [
    (r"^(hi|hii+|hey+|hello|helo|yo|namaste|greetings)\b|"
     r"^good (morning|afternoon|evening|day)\b",
     "Hello! I'm the SEA College enquiry assistant. Ask me anything about the "
     "departments, faculty, class timings, facilities or contact details."),

    (r"^how (are|r) (you|u)\b|^how do you do\b|^how('s| is| are) (it going|things)\b|"
     r"^hows it going\b|^what('?s| is) up\b|^wassup\b|^sup\b|^whatsup\b",
     "I'm doing well, thank you for asking! Ready whenever you are — what "
     "would you like to know about the college?"),

    (r"^(who|what) (are|r) (you|u)\b|^what('s| is) your name\b|^your name\b|"
     r"^introduce yourself\b|^tell me about yourself\b",
     "I'm the SEA College of Engineering and Technology enquiry assistant. I'm "
     "here to answer questions about the departments, faculty, timings, "
     "facilities and contact details, so you don't have to visit the office "
     "counter for everyday queries."),

    (r"^what can (you|u) (do|answer|help)|^what do you know\b|"
     r"^how can you help\b|^help$|^help me\b|^options$|^menu$",
     "I can help with six areas: Departments, Faculty, Timetable, College "
     "Information, Contact Information and Facilities. Try one of the "
     "suggested questions below, or just type your question in your own words."),

    (r"^(thanks|thank you|thankyou|thank u|ty|thx|tq)\b",
     "You're very welcome. Ask me anything else whenever you like."),

    (r"^(bye|goodbye|good bye|see you|see ya|cya|tata)\b",
     "Goodbye, and all the best with your studies. Come back any time you "
     "have a question."),

    (r"^(ok|okay|k|cool|nice|great|good|awesome|super|fine|alright)\b\W*$",
     "Glad that helped. Anything else you'd like to know?"),

    (r"^sorry\b|^my (bad|mistake)\b",
     "No need to apologise at all. What would you like to ask?"),

    (r"^(yes|yeah|yep|ya|no|nope|nah)\b\W*$",
     "Just type your question whenever you're ready — I'm listening."),
]

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


def reload_model():
    """Drop the cached model so the next question uses the newly trained one."""
    global _model
    _model = None
    # The grounded fallback reads the same question bank, so it has to forget
    # its copy at the same moment — otherwise a question deleted in the admin
    # panel would still be answerable through the fallback.
    llm.reset_facts()


def small_talk(text):
    """
    Handle conversational openers before the classifier is consulted.

    A student who types "how are you" should get a human reply, not a message
    about the knowledge base. Matching is anchored to the start of the sentence
    so that a genuine question beginning with the same word — "how many seats
    are there" — still goes to the model.
    """
    cleaned = re.sub(r"[^\w\s']", " ", str(text).lower()).strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    if not cleaned or len(cleaned.split()) > 6:
        return None
    for pattern, reply in SMALL_TALK:
        if re.search(pattern, cleaned):
            return reply
    return None


def soft_decline():
    """
    Build a reply for a question the assistant cannot answer.

    An earlier version offered the nearest stored question as a "did you mean"
    suggestion. It was removed: at this similarity range the nearest match is
    often unrelated — "parking facility" suggested "What are the library
    timings?" — and a confidently wrong suggestion makes the assistant look
    more confused than a straightforward apology does. When it does not know,
    it says so pleasantly and points at what it does know.
    """
    return random.choice(FALLBACKS) + (OFFICE_NOTE if random.random() < 0.4 else "")


def _decline(text, category=None, confidence=0.0, similarity=0.0,
             source="fallback"):
    """
    The single place the assistant gives up — and therefore the single place
    the optional grounded fallback is offered a turn.

    Every path that used to return soft_decline() now comes through here, so
    the fallback covers all of them and there is exactly one line of code to
    delete if the feature is ever removed. If it is not configured, or has
    nothing grounded to say, the polite apology is returned exactly as before.
    """
    grounded = llm.answer(text)
    if grounded:
        return {"answer": grounded, "category": category, "matched": None,
                "confidence": confidence, "similarity": similarity,
                "source": "llm"}

    return {"answer": soft_decline(), "category": category, "matched": None,
            "confidence": confidence, "similarity": similarity,
            "source": source}


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


def _log_turn(user_id, text, result, category=None):
    """
    Record the turn in chat_log so the admin can see what students actually
    ask. Logging must never break an answer, so every failure is swallowed.

    Called from each returning branch rather than once at the end, because the
    early returns are exactly the questions worth seeing: they are the ones
    the knowledge base did not cover.
    """
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
                round(result.get("confidence") or 0.0, 4),
                # A grounded fallback reply is a real answer even though no
                # stored question matched, so it counts as answered. The NULL
                # matched_question_id is what tells the two apart in the log.
                1 if (result.get("matched")
                      or result.get("source") == "llm") else 0,
            ),
        )
    except Exception:
        pass


def ask(text, user_id=None, log=True):
    """
    Answer a question. Returns a dict the chat route can send straight to the
    browser:

        {answer, category, matched, confidence, similarity, source}
    """
    text = (text or "").strip()
    if not text:
        return {"answer": soft_decline(), "category": None, "matched": None,
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
        result = _decline(text, source="no_tokens")
        if log:
            _log_turn(user_id, text, result)
        return result

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
        result = _decline(text, source="out_of_scope")
        if log:
            _log_turn(user_id, text, result)
        return result

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
        result = _decline(text, category, confidence, float(score), "fallback")
    else:
        rows = answer_for(matched["id"])
        if not rows:
            result = _decline(text, category, confidence, float(score),
                              "missing_row")
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
        _log_turn(user_id, text, result, category)

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
