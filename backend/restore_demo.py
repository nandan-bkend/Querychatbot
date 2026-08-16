"""
restore_demo.py — put the public demo back the way it started

The deployed copy hands out the admin password on its own login page, because
visitors are meant to try the admin half of the project — adding a question and
watching the chatbot answer it straight away is the most convincing thing it
does. The cost of that openness is that somebody can also delete every question
and leave the site looking broken to the next person who opens the link.

This makes that damage temporary.

    python restore_demo.py            # restore, with a summary
    python restore_demo.py --quiet    # only speak up if something failed

    from restore_demo import restore  # same work, in this process
    restore()

Three steps, in the order that matters:

    seed        questions, faculty and users back to the shipped set
    training    the phrasings the model learns from
    train       rebuild the model so the chatbot matches the data

The last step is not optional. Reseeding gives every question a new id, so a
model trained against the old ids would point at rows that no longer exist.

Everything runs in the calling process rather than as subprocesses. On a small
free-tier instance the web process has already loaded scikit-learn, and a
subprocess would load a second copy of it — enough, on a 512 MB box, to be
killed halfway through and leave the database half-restored.
"""

import argparse
import sys
import threading

_lock = threading.Lock()


def restore(log=print):
    """
    Reseed and retrain. Returns True on success.

    Guarded by a lock: the restore route can be triggered by anything that can
    reach the URL, and two of these running at once would have one wiping the
    tables while the other was filling them.
    """
    if not _lock.acquire(blocking=False):
        log("  a restore is already running — skipping this one")
        return False

    try:
        import seed
        import seed_training
        from chatbot import predict, train

        log("  restoring questions, faculty and users ...")
        data = seed.load_seed()
        seed.reset_tables()
        category_ids = seed.seed_categories(data)
        department_ids = seed.seed_departments(data)
        seed.seed_questions(data, category_ids)
        seed.seed_faculty(data, department_ids)
        seed.seed_users(data, department_ids)

        log("  restoring the training phrasings ...")
        seed_training.main()

        log("  retraining the model ...")
        train.retrain()
        predict.reload_model()

        log("  demo data restored")
        return True
    except Exception as err:
        # Always speak on failure, whatever the caller asked for: a scheduled
        # restore that fails silently is worse than none at all, because it
        # looks like it is still protecting the demo.
        print(f"RESTORE FAILED: {type(err).__name__}: {err}", file=sys.stderr)
        return False
    finally:
        _lock.release()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Restore the public demo data")
    parser.add_argument("--quiet", action="store_true",
                        help="print only on failure, for scheduled runs")
    quiet = parser.parse_args().quiet
    ok = restore(log=(lambda *a: None) if quiet else print)
    raise SystemExit(0 if ok else 1)
