"""
seed_training.py — load the question phrasings into the training_data table

The CSV in data/training_data.csv is the editable source; this script copies it
into MySQL, where the training script reads it from. Keeping the phrasings in
the database means new ones can be added through SQL (or later, through the
admin panel) without editing files.

    python seed_training.py            # replace the table contents
"""

import csv
import sys
from collections import Counter

from config import Config
from db import DatabaseError, execute, execute_many, query, query_value


def load_rows():
    if not Config.TRAINING_FILE.exists():
        sys.exit(f"Missing {Config.TRAINING_FILE}")

    with open(Config.TRAINING_FILE, newline="", encoding="utf-8") as handle:
        rows = [
            (r["phrasing"].strip().lower(), r["question_code"].strip())
            for r in csv.DictReader(handle)
            if r.get("phrasing") and r.get("question_code")
        ]
    return rows


def main():
    try:
        rows = load_rows()

        # question code -> (question id, category id)
        lookup = {
            r["code"]: (r["id"], r["category_id"])
            for r in query("SELECT id, code, category_id FROM questions")
        }

        unknown = sorted({code for _, code in rows if code not in lookup})
        if unknown:
            sys.exit(
                "These question codes are in the CSV but not in the database: "
                + ", ".join(unknown)
                + "\nRun seed.py first."
            )

        duplicates = [p for p, n in Counter(p for p, _ in rows).items() if n > 1]
        if duplicates:
            print(f"Warning: {len(duplicates)} duplicate phrasings will be skipped")
            seen = set()
            deduped = []
            for phrasing, code in rows:
                if phrasing in seen:
                    continue
                seen.add(phrasing)
                deduped.append((phrasing, code))
            rows = deduped

        execute("DELETE FROM training_data")
        execute_many(
            "INSERT INTO training_data (phrasing, question_id, category_id) "
            "VALUES (%s, %s, %s)",
            [(phrasing, *lookup[code]) for phrasing, code in rows],
        )

        total = query_value("SELECT COUNT(*) FROM training_data")
        print(f"Loaded {total} phrasings into training_data\n")

        print("Per category:")
        for row in query(
            """SELECT c.name, COUNT(*) AS n
               FROM training_data t JOIN categories c ON c.id = t.category_id
               GROUP BY c.id ORDER BY n DESC"""
        ):
            print(f"  {row['n']:>4}  {row['name']}")

        thin = query(
            """SELECT q.code, q.question, COUNT(t.id) AS n
               FROM questions q LEFT JOIN training_data t ON t.question_id = q.id
               GROUP BY q.id HAVING n < 5 ORDER BY n"""
        )
        if thin:
            print("\nQuestions with fewer than 5 phrasings (weak recognition):")
            for row in thin:
                print(f"  {row['n']}  {row['code']}  {row['question']}")
        else:
            print("\nEvery question has at least 5 phrasings.")

    except DatabaseError as err:
        sys.exit(f"Database error: {err}")


if __name__ == "__main__":
    main()
