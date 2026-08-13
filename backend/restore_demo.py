"""
restore_demo.py — put the public demo back the way it started

The deployed copy hands out the admin password on its own login page, because
visitors are meant to try the admin half of the project — adding a question and
watching the chatbot answer it straight away is the most convincing thing it
does. The cost of that openness is that somebody can also delete every question
and leave the site looking broken to the next person who opens the link.

This script makes that damage temporary. Run daily as a scheduled task and the
worst case becomes "the demo was odd for a few hours", rather than "the link on
my CV shows an empty chatbot".

    python restore_demo.py            # restore, with a summary
    python restore_demo.py --quiet    # only speak up if something failed

It is three steps that already existed, in the order that matters:

    seed.py --reset      questions, faculty, users back to the shipped set
    seed_training.py     the phrasings the model learns from
    chatbot.train        rebuild the model so the chatbot matches the data

The last step is not optional. Reseeding gives every question a new id, so a
model trained against the old ids would point at rows that no longer exist.
"""

import argparse
import subprocess
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

STEPS = [
    ("restoring questions, faculty and users", [sys.executable, "seed.py", "--reset"]),
    ("restoring the training phrasings", [sys.executable, "seed_training.py"]),
    ("retraining the model", [sys.executable, "-m", "chatbot.train"]),
]


def run(quiet=False):
    for description, command in STEPS:
        if not quiet:
            print(f"  {description} ...")
        result = subprocess.run(
            command, cwd=BASE_DIR, capture_output=True, text=True
        )
        if result.returncode != 0:
            # Always speak on failure, even with --quiet: a scheduled task
            # that fails silently is worse than no scheduled task at all,
            # because it looks like it is still protecting the demo.
            print(f"FAILED: {description}", file=sys.stderr)
            print(result.stdout[-1500:], file=sys.stderr)
            print(result.stderr[-1500:], file=sys.stderr)
            return 1

    if not quiet:
        print("  demo data restored")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Restore the public demo data")
    parser.add_argument("--quiet", action="store_true",
                        help="print only on failure, for scheduled runs")
    raise SystemExit(run(parser.parse_args().quiet))
