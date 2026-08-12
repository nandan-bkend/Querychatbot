"""
preprocess.py — Natural Language Processing stage

Turns a raw question typed by a student into a normalised token string that
TF-IDF can vectorise:

    "What are the college TIMINGS?"
        -> lowercase           "what are the college timings?"
        -> tokenise            ["what", "are", "the", "college", "timings"]
        -> remove stopwords    ["what", "college", "timings"]
        -> stem                ["what", "colleg", "time"]
        -> join                "what colleg time"

Stemming is what lets "timings", "timing" and "timed" collapse to one feature,
so a question worded differently from the stored one still matches.

Note on stopwords: the usual English stopword lists include "who", "when",
"where", "which" and "how". Those are deliberately KEPT here, because they are
the strongest signal for which category a question belongs to — "when" points
at Timetable, "who" at Faculty. Removing them would throw away the most useful
feature the classifier has.

No NLTK corpora are downloaded. The Porter stemmer is pure code and the
stopword list is defined below, so the project runs with no internet access.
"""

import re

from nltk.stem import PorterStemmer

_stemmer = PorterStemmer()

# Generic English stopwords, minus the question words that carry intent.
STOPWORDS = frozenset(
    """
    a an the and or but if then than that this these those
    is am are was were be been being
    do does did doing done
    have has had having
    can could will would shall should may might must
    of in on at to for from by with about into over under
    as it its it's i me my mine we us our ours you your yours
    he him his she her hers they them their theirs
    there here also very just too so such only own same
    please tell give get got know want need
    s t don now
    """.split()
)

# Question words are kept as features (they tell Naive Bayes a lot about the
# category) but they carry no subject matter of their own. Tracked separately
# so the answer stage can tell "where is the ise department" — which names a
# real subject — from "where can i buy a laptop", which does not.
QUESTION_WORDS = frozenset(
    "who whom whose what when where which why how whether".split()
)

_TOKEN_RE = re.compile(r"[a-z0-9&]+")


def tokenize(text):
    """Lowercase and split into word tokens, dropping punctuation."""
    return _TOKEN_RE.findall(str(text).lower())


def remove_stopwords(tokens):
    return [t for t in tokens if t not in STOPWORDS and len(t) > 1]


def stem(tokens):
    return [_stemmer.stem(t) for t in tokens]


def preprocess(text):
    """
    Full pipeline. Returns a space-joined string of stems, which is what the
    TF-IDF vectoriser expects as a document.
    """
    return " ".join(stem(remove_stopwords(tokenize(text))))


def preprocess_many(texts):
    return [preprocess(t) for t in texts]


def content_stems(text):
    """
    The stems of a question with the question words removed — the part that
    actually names a subject. Used to reject questions whose subject matter
    appears nowhere in the knowledge base.
    """
    kept = [t for t in remove_stopwords(tokenize(text)) if t not in QUESTION_WORDS]
    return stem(kept)


def explain(text):
    """
    Return each stage separately. Used by the demo script so the preprocessing
    can be shown step by step during a review.
    """
    tokens = tokenize(text)
    kept = remove_stopwords(tokens)
    stems = stem(kept)
    return {
        "raw": text,
        "tokens": tokens,
        "without_stopwords": kept,
        "stems": stems,
        "document": " ".join(stems),
    }
