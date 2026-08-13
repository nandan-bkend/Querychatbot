"""
init_db.py — create the tables in whatever database .env points at

schema.sql starts by dropping and creating a database called college_chatbot,
which is right on a laptop where you own the MySQL server. On shared hosting
you usually do not: PythonAnywhere, for one, creates the database for you
through its own control panel and names it `yourname$college_chatbot`, and the
account has no permission to CREATE DATABASE at all.

So this script runs the same schema.sql, minus the three statements that
assume ownership of the server — the connection is already pointed at the
right database by DB_NAME in .env.

    python init_db.py             # create the tables
    python init_db.py --drop      # drop them first, then create

Locally, `mysql -u root -p < schema.sql` still works and does the same thing.
Use this when the database already exists and only needs its tables.
"""

import argparse
import re
import sys

from config import Config
from db import DatabaseError, get_cursor, query

# Statements that assume you own the MySQL server rather than one database
# inside it. Everything else in schema.sql is portable as written.
SERVER_LEVEL = re.compile(r"^\s*(DROP\s+DATABASE|CREATE\s+DATABASE|USE)\b",
                          re.IGNORECASE)

TABLES = ["categories", "departments", "questions", "faculty", "users",
          "training_data", "chat_log", "activity_log"]


def statements():
    """
    schema.sql split into runnable statements, server-level ones removed and
    every CREATE TABLE made repeatable.

    The IF NOT EXISTS matters more than it looks: deployment steps get re-run
    — a half-finished setup, a second attempt after fixing a password — and a
    script that only works on a virgin database is a script that fails exactly
    when someone is already flustered.
    """
    sql = (Config.BASE_DIR / "schema.sql").read_text(encoding="utf-8")
    sql = re.sub(r"^\s*--.*$", "", sql, flags=re.MULTILINE)   # strip comments
    sql = re.sub(r"\bCREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS)",
                 "CREATE TABLE IF NOT EXISTS ", sql, flags=re.IGNORECASE)
    for statement in sql.split(";"):
        if statement.strip() and not SERVER_LEVEL.match(statement):
            yield statement.strip()


def drop_tables():
    """Children first, so foreign keys never block the drop."""
    with get_cursor(commit=True) as cursor:
        cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
        for table in reversed(TABLES):
            cursor.execute(f"DROP TABLE IF EXISTS {table}")
        cursor.execute("SET FOREIGN_KEY_CHECKS = 1")


def main(drop=False):
    print(f"  database : {Config.DB_NAME} on {Config.DB_HOST}")

    if drop:
        print("  dropping existing tables ...")
        drop_tables()

    before = {row["t"] for row in
              query("SELECT TABLE_NAME AS t FROM information_schema.TABLES "
                    "WHERE TABLE_SCHEMA = %s", (Config.DB_NAME,))}

    with get_cursor(commit=True) as cursor:
        for statement in statements():
            cursor.execute(statement)

    created = len([t for t in TABLES if t not in before])

    present = {row["t"] for row in
               query("SELECT TABLE_NAME AS t FROM information_schema.TABLES "
                     "WHERE TABLE_SCHEMA = %s", (Config.DB_NAME,))}
    missing = [t for t in TABLES if t not in present]

    print(f"  created  : {created} new, {len(TABLES) - created} already there")
    if missing:
        print(f"  MISSING  : {', '.join(missing)}", file=sys.stderr)
        return 1
    print("  all 8 tables present\n"
          "  next:  python seed.py  &&  python seed_training.py  "
          "&&  python -m chatbot.train")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Create the chatbot tables in the configured database")
    parser.add_argument("--drop", action="store_true",
                        help="drop the tables first (destroys existing data)")
    try:
        raise SystemExit(main(parser.parse_args().drop))
    except DatabaseError as err:
        raise SystemExit(f"\n{err}\n")
