"""
evaluate.py — measure how well the chatbot actually answers

Two things are scored:

  * recall   — questions the system should answer, worded the way a student
               would type them rather than the way they are stored
  * rejection — questions with no answer in the knowledge base, which must
               produce the fallback rather than a confident wrong answer

Run after training:

    python evaluate.py
    python evaluate.py --sweep     # try similarity thresholds and report each
"""

import argparse

from config import Config
from chatbot import predict

# Questions the system is expected to answer, phrased differently from both the
# stored wording and the training phrasings wherever possible.
SHOULD_ANSWER = [
    ("who is the hod of the ise department", "Q001"),
    ("ise hod", "Q001"),
    ("head of information science", "Q001"),
    ("where is the ise department located", "Q002"),
    ("which block is ise in", "Q002"),
    ("what branches does this college have", "Q003"),
    ("how many seats does ise have", "Q004"),
    ("cse hod", "Q005"),
    ("who are the faculty members in ise", "Q006"),
    ("ise teaching staff list", "Q006"),
    ("how do i contact the ise hod", "Q007"),
    ("placement coordinator ise", "Q008"),
    ("phd faculty in ise", "Q009"),
    ("who is my class advisor", "Q010"),
    ("what are the college timings", "Q011"),
    ("college timing", "Q011"),
    ("when does college start in the morning", "Q011"),
    ("lunch break time", "Q012"),
    ("when do semester exams start", "Q013"),
    ("ise fifth semester timetable", "Q014"),
    ("is saturday working", "Q015"),
    ("which university is this college affiliated to", "Q016"),
    ("when was this college established", "Q017"),
    ("how do i get admission here", "Q018"),
    ("naac accreditation", "Q019"),
    ("what courses does the college offer", "Q020"),
    ("college contact number", "Q021"),
    ("college email address", "Q022"),
    ("how do i reach the campus", "Q023"),
    ("office timings", "Q024"),
    ("is hostel available", "Q025"),
    ("library timings", "Q026"),
    ("does the college have buses", "Q027"),
]

# Nothing in the knowledge base covers these, so the fallback is the right answer.
SHOULD_REJECT = [
    "what is the wifi password",
    "who won the cricket match yesterday",
    "tell me a joke",
    "how do i apply for a bank loan",
    "book a cab to the airport",
    "what is the price of bitcoin",
    "can you write my assignment",
    "where can i buy a laptop",
    "what is the weather today",
    "how do i cook biryani",
]


def run(verbose=True):
    hits, misses = 0, []
    for text, expected in SHOULD_ANSWER:
        result = predict.ask(text, log=False)
        if result["matched"] == expected:
            hits += 1
        else:
            misses.append((text, expected, result["matched"], result["similarity"]))

    rejected, false_positives = 0, []
    for text in SHOULD_REJECT:
        result = predict.ask(text, log=False)
        if result["matched"] is None:
            rejected += 1
        else:
            false_positives.append((text, result["matched"], result["similarity"]))

    if verbose:
        total = len(SHOULD_ANSWER)
        print(f"Recall     {hits}/{total} ({hits / total:.0%}) "
              "— known questions answered correctly")
        for text, expected, got, sim in misses:
            print(f"   miss  \"{text}\"  expected {expected}, got {got} ({sim:.2f})")

        total_r = len(SHOULD_REJECT)
        print(f"\nRejection  {rejected}/{total_r} ({rejected / total_r:.0%}) "
              "— out-of-scope questions correctly refused")
        for text, got, sim in false_positives:
            print(f"   wrong \"{text}\"  answered with {got} ({sim:.2f})")

    return hits, len(SHOULD_ANSWER), rejected, len(SHOULD_REJECT)


def sweep():
    print(f"{'threshold':>10} {'recall':>8} {'rejection':>11} {'combined':>10}")
    best = None
    for threshold in [round(0.10 + i * 0.025, 3) for i in range(19)]:
        Config.MIN_SIMILARITY = threshold
        hits, total, rejected, total_r = run(verbose=False)
        recall = hits / total
        rejection = rejected / total_r
        combined = (recall + rejection) / 2
        marker = ""
        if best is None or combined > best[1]:
            best = (threshold, combined)
            marker = "  <-"
        print(f"{threshold:>10.3f} {recall:>8.0%} {rejection:>11.0%} "
              f"{combined:>10.0%}{marker}")
    print(f"\nBest combined score at MIN_SIMILARITY = {best[0]}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--sweep", action="store_true",
                        help="try a range of similarity thresholds")
    args = parser.parse_args()
    sweep() if args.sweep else run()
