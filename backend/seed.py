"""
seed.py — load the sample dataset into MySQL

Reads data/seed_data.json (exported from the frontend's mock-data.js) and
populates categories, departments, questions, faculty and users.

    python seed.py            # insert, skipping anything already present
    python seed.py --reset    # empty the tables first, then insert

Passwords are hashed with Werkzeug before storage; the plain text demo
passwords exist only in this file's DEMO_USERS block.
"""

import argparse
import json
import sys

from werkzeug.security import generate_password_hash

from config import Config
from db import DatabaseError, execute, get_cursor, query_one, query_value


def load_seed():
    if not Config.SEED_FILE.exists():
        sys.exit(
            f"Missing {Config.SEED_FILE}\n"
            "Regenerate it from the frontend dataset with:\n"
            "  node -e 'const fs=require(\"fs\");"
            'eval(fs.readFileSync("../assets/js/mock-data.js","utf8")'
            '.replace("window.MOCK_DATA","global.MOCK_DATA"));'
            "fs.writeFileSync(\"data/seed_data.json\",JSON.stringify(MOCK_DATA,null,2))'"
        )
    with open(Config.SEED_FILE, encoding="utf-8") as handle:
        return json.load(handle)


CATEGORY_NOTES = {
    "Departments": "Department locations, heads of department and intake",
    "Faculty": "Faculty names, designations and contact details",
    "Timetable": "Class hours, breaks, working days and examinations",
    "College Information": "Affiliation, accreditation, admission and programmes",
    "Contact Information": "Office numbers, email addresses and directions",
    "Facilities": "Library, hostel, transport and sports facilities",
}

SHORT_NAMES = {
    "Information Science & Engineering": "ISE",
    "Computer Science & Engineering": "CSE",
    "Artificial Intelligence & Machine Learning": "AI&ML",
    "Artificial Intelligence & Data Science": "AI&DS",
    "Electronics & Communication Engineering": "ECE",
    "Mechanical Engineering": "MECH",
    "Civil Engineering": "CIVIL",
}


def reset_tables():
    """Empty every seeded table, children first so foreign keys stay valid."""
    with get_cursor(commit=True) as cursor:
        cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
        for table in (
            "chat_log",
            "activity_log",
            "training_data",
            "questions",
            "faculty",
            "users",
            "categories",
            "departments",
        ):
            cursor.execute(f"TRUNCATE TABLE {table}")
        cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
    print("  cleared existing rows")


def seed_categories(data):
    ids = {}
    for name in data["categories"]:
        existing = query_value("SELECT id FROM categories WHERE name = %s", (name,))
        if existing:
            ids[name] = existing
            continue
        ids[name] = execute(
            "INSERT INTO categories (name, description) VALUES (%s, %s)",
            (name, CATEGORY_NOTES.get(name)),
        )
    print(f"  categories   {len(ids)}")
    return ids


def seed_departments(data):
    ids = {}
    for name in data["departments"]:
        existing = query_value("SELECT id FROM departments WHERE name = %s", (name,))
        if existing:
            ids[name] = existing
            continue
        ids[name] = execute(
            "INSERT INTO departments (name, short_name) VALUES (%s, %s)",
            (name, SHORT_NAMES.get(name)),
        )
    print(f"  departments  {len(ids)}")
    return ids


def seed_questions(data, category_ids):
    inserted = 0
    for row in data["questions"]:
        if query_value("SELECT id FROM questions WHERE code = %s", (row["id"],)):
            continue
        execute(
            """INSERT INTO questions
                 (code, question, answer, category_id, status, created_at, updated_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (
                row["id"],
                row["question"],
                row["answer"],
                category_ids[row["category"]],
                row["status"],
                row["created_at"],
                row["updated_at"],
            ),
        )
        inserted += 1
    print(f"  questions    {inserted}")


def seed_faculty(data, department_ids):
    inserted = 0
    for row in data["faculty"]:
        if query_value("SELECT id FROM faculty WHERE code = %s", (row["id"],)):
            continue
        execute(
            """INSERT INTO faculty
                 (code, name, department_id, designation, email, contact,
                  photo, status, updated_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                row["id"],
                row["name"],
                department_ids[row["department"]],
                row["designation"],
                row["email"],
                row["contact"],
                row.get("photo") or None,
                row["status"],
                row["updated_at"],
            ),
        )
        inserted += 1
    print(f"  faculty      {inserted}")


def seed_users(data, department_ids):
    """
    Demo accounts. The plain passwords match what the login pages display;
    only the hashes are stored.
    """
    student = data["student"]
    admin = data["admin"]
    creds = data["credentials"]

    accounts = [
        {
            "role": "student",
            "name": student["name"],
            "email": creds["student"]["email"],
            "password": creds["student"]["password"],
            "usn": student["id"],
            "department": student["department"],
            "semester": student["semester"],
        },
        {
            "role": "admin",
            "name": admin["name"],
            "email": creds["admin"]["email"],
            "password": creds["admin"]["password"],
            "usn": None,
            "department": None,
            "semester": None,
        },
    ]

    inserted = 0
    for account in accounts:
        if query_value("SELECT id FROM users WHERE email = %s", (account["email"],)):
            continue
        execute(
            """INSERT INTO users
                 (role, name, email, password_hash, usn, department_id, semester)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (
                account["role"],
                account["name"],
                account["email"],
                generate_password_hash(account["password"], method='pbkdf2:sha256'),
                account["usn"],
                department_ids.get(account["department"]),
                account["semester"],
            ),
        )
        inserted += 1
    print(f"  users        {inserted}")


def summary():
    print("\nDatabase now contains:")
    for table in (
        "categories",
        "departments",
        "questions",
        "faculty",
        "users",
        "training_data",
    ):
        count = query_value(f"SELECT COUNT(*) FROM {table}")
        print(f"  {count:>4}  {table}")

    active = query_value("SELECT COUNT(*) FROM questions WHERE status = 'Active'")
    print(f"\n  {active} questions are Active and answerable by the chatbot")


def main():
    parser = argparse.ArgumentParser(description="Seed the college_chatbot database")
    parser.add_argument(
        "--reset", action="store_true", help="empty the tables before inserting"
    )
    args = parser.parse_args()

    try:
        data = load_seed()
        print(f"Seeding {Config.DB_NAME} from {Config.SEED_FILE.name}")

        if args.reset:
            reset_tables()

        category_ids = seed_categories(data)
        department_ids = seed_departments(data)
        seed_questions(data, category_ids)
        seed_faculty(data, department_ids)
        seed_users(data, department_ids)
        summary()
        print("\nDone.")
    except DatabaseError as err:
        sys.exit(f"\nDatabase error: {err}")


if __name__ == "__main__":
    main()
