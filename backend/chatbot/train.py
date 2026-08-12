"""
train.py — build the TF-IDF vectoriser, the Naive Bayes classifier and the
per-question similarity index, then save them to disk.

    python -m chatbot.train

Reads the phrasings from the training_data table in MySQL, so adding rows there
and re-running this script is all that is needed to retrain.

Two artefacts come out of this:

  1. A Multinomial Naive Bayes classifier that maps a question to one of the
     six categories. Trained on every phrasing, labelled by category.

  2. A TF-IDF matrix with one row per stored question, where each row is built
     from that question's own text plus all of its phrasings. At prediction
     time the student's question is compared against these rows with cosine
     similarity to choose the exact question within the predicted category.

Naive Bayes narrows six ways; cosine similarity then picks one of the handful
of questions inside that category. Splitting the work this way means the
classifier only ever has to separate 6 classes, which is learnable from the
amount of data a college project realistically has.
"""

import sys
from collections import defaultdict
from pathlib import Path

import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import GroupKFold, StratifiedKFold, cross_val_score
from sklearn.naive_bayes import MultinomialNB

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import Config  # noqa: E402
from db import DatabaseError, query  # noqa: E402

from .preprocess import preprocess  # noqa: E402

MODEL_FILE = Config.MODEL_DIR / "chatbot_model.joblib"


def load_training_rows():
    rows = query(
        """SELECT t.phrasing, t.question_id, q.code AS question_code,
                  c.id AS category_id, c.name AS category
           FROM training_data t
           JOIN questions   q ON q.id = t.question_id
           JOIN categories  c ON c.id = t.category_id"""
    )
    if not rows:
        sys.exit(
            "training_data is empty. Run:\n"
            "  python seed.py\n"
            "  python seed_training.py"
        )
    return rows


def load_questions():
    return query(
        """SELECT q.id, q.code, q.question, q.status,
                  c.id AS category_id, c.name AS category
           FROM questions q JOIN categories c ON c.id = q.category_id
           ORDER BY q.id"""
    )


def build_phrase_index(questions, training_rows):
    """
    One row per *phrasing*, not one row per question.

    Concatenating all of a question's phrasings into a single document seems
    tidier, but it dilutes the result: a two-word query like "college buses"
    scores poorly against a hundred-word document even when one phrasing
    inside it is a near-exact match. Indexing each phrasing separately and
    taking the best score per question avoids that entirely, and turns the
    lookup into a nearest-neighbour search over known wordings.

    Returns (documents, question_ids) as parallel lists.
    """
    documents, question_ids = [], []

    # the stored wording of each question is itself a valid phrasing
    for question in questions:
        documents.append(preprocess(question["question"]))
        question_ids.append(question["id"])

    for row in training_rows:
        documents.append(preprocess(row["phrasing"]))
        question_ids.append(row["question_id"])

    return documents, question_ids


def main():
    try:
        training_rows = load_training_rows()
        questions = load_questions()
    except DatabaseError as err:
        sys.exit(f"Database error: {err}")

    print(f"Training on {len(training_rows)} phrasings "
          f"across {len(questions)} questions\n")

    # ---------------------------------------------------------------- TF-IDF
    corpus = [preprocess(r["phrasing"]) for r in training_rows]
    labels = [r["category"] for r in training_rows]

    # Hyperparameters chosen by grid search over this corpus. Unigrams beat
    # unigrams+bigrams here: with ~240 short phrasings the bigrams are mostly
    # seen once and only dilute the weights.
    vectorizer = TfidfVectorizer(
        ngram_range=(1, 1),
        sublinear_tf=True,    # dampen repeated terms
        min_df=1,             # tiny corpus, keep every term
    )
    X = vectorizer.fit_transform(corpus)
    print(f"TF-IDF matrix: {X.shape[0]} documents x {X.shape[1]} features")

    # ----------------------------------------------------------- Naive Bayes
    classifier = MultinomialNB(alpha=0.1)
    classifier.fit(X, labels)

    # Two honest accuracy estimates, neither of them scored on the training set.
    #
    #  1. Unseen phrasing — a student wording a question the model has already
    #     been trained on differently. This is the everyday case.
    #  2. Unseen question — a question the admin has added with no phrasings
    #     written for it yet. Harder, and the number to quote if asked about
    #     how the system copes with growth.
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    scores = cross_val_score(classifier, X, labels, cv=cv)
    print(f"Naive Bayes accuracy: {scores.mean():.1%} "
          f"(+/- {scores.std():.1%}) on unseen phrasings, 5-fold")

    groups = [r["question_id"] for r in training_rows]
    n_groups = len(set(groups))
    if n_groups >= 5:
        gscores = cross_val_score(
            classifier, X, labels, cv=GroupKFold(n_splits=5), groups=groups
        )
        print(f"                      {gscores.mean():.1%} "
              f"(+/- {gscores.std():.1%}) on entirely unseen questions")

    # ------------------------------------------------ per-phrasing index
    phrase_docs, phrase_question_ids = build_phrase_index(questions, training_rows)
    phrase_matrix = vectorizer.transform(phrase_docs)
    print(f"Similarity index: {phrase_matrix.shape[0]} phrasings "
          f"covering {len(set(phrase_question_ids))} questions")

    # ------------------------------------------------------------- save
    Config.MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {
            "vectorizer": vectorizer,
            "classifier": classifier,
            "phrase_matrix": phrase_matrix,
            "phrase_question_ids": np.asarray(phrase_question_ids),
            "questions": [
                {
                    "id": q["id"],
                    "code": q["code"],
                    "question": q["question"],
                    "category": q["category"],
                }
                for q in questions
            ],
            "categories": sorted(set(labels)),
            "training_size": len(training_rows),
        },
        MODEL_FILE,
    )
    size_kb = MODEL_FILE.stat().st_size / 1024
    print(f"\nSaved {MODEL_FILE.relative_to(Config.BASE_DIR)} ({size_kb:.0f} KB)")


if __name__ == "__main__":
    main()
