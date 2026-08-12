"""
repository.py — all database reads and writes for the application

The Flask routes call these functions rather than writing SQL inline, which
keeps the queries in one place and the routes readable. This is the server-side
counterpart of the frontend's store.js.
"""

from db import execute, query, query_one, query_value

# ==========================================================================
#  Lookups
# ==========================================================================


def all_categories():
    return query("SELECT id, name FROM categories ORDER BY id")


def all_departments():
    return query("SELECT id, name, short_name FROM departments ORDER BY id")


DESIGNATIONS = [
    "Professor & Head",
    "Professor",
    "Associate Professor",
    "Assistant Professor",
]


# ==========================================================================
#  Activity log
# ==========================================================================


def log_activity(actor, action, entity, entity_ref, label):
    execute(
        """INSERT INTO activity_log
             (actor_id, actor_name, action, entity, entity_ref, label)
           VALUES (%s, %s, %s, %s, %s, %s)""",
        (actor["id"], actor["name"], action, entity, entity_ref, label[:255]),
    )


def recent_activity(limit=7):
    return query(
        "SELECT * FROM activity_log ORDER BY timestamp DESC, id DESC LIMIT %s",
        (limit,)
    )


# ==========================================================================
#  Questions
# ==========================================================================

_QUESTION_SELECT = """
    SELECT q.id, q.code, q.question, q.answer, q.status,
           q.created_at, q.updated_at,
           c.id AS category_id, c.name AS category
    FROM questions q JOIN categories c ON c.id = q.category_id
"""

_SORTABLE = {
    "question": "q.question",
    "category": "c.name",
    "created_at": "q.created_at",
    "code": "q.code",
}


def list_questions(search="", category="all", status="all",
                   sort="created_at", direction="desc"):
    clauses, params = [], []

    if search:
        clauses.append("(q.question LIKE %s OR q.answer LIKE %s OR c.name LIKE %s)")
        like = f"%{search}%"
        params += [like, like, like]
    if category and category != "all":
        clauses.append("c.name = %s")
        params.append(category)
    if status and status != "all":
        clauses.append("q.status = %s")
        params.append(status)

    sql = _QUESTION_SELECT
    if clauses:
        sql += " WHERE " + " AND ".join(clauses)
    sql += f" ORDER BY {_SORTABLE.get(sort, 'q.created_at')} " \
           f"{'ASC' if direction == 'asc' else 'DESC'}"
    return query(sql, params)


def get_question(question_id):
    return query_one(_QUESTION_SELECT + " WHERE q.id = %s", (question_id,))


def _next_code(table, prefix):
    highest = query_value(
        f"SELECT MAX(CAST(SUBSTRING(code, 2) AS UNSIGNED)) FROM {table}"
    ) or 0
    return f"{prefix}{highest + 1:03d}"


def add_question(actor, question, answer, category_id, status):
    code = _next_code("questions", "Q")
    execute(
        """INSERT INTO questions (code, question, answer, category_id, status)
           VALUES (%s, %s, %s, %s, %s)""",
        (code, question.strip(), answer.strip(), category_id, status),
    )
    log_activity(actor, "added", "question", code, question)
    return code


def update_question(actor, question_id, question, answer, category_id, status):
    row = get_question(question_id)
    if not row:
        return None
    execute(
        """UPDATE questions
           SET question = %s, answer = %s, category_id = %s,
               status = %s, updated_at = CURRENT_DATE
           WHERE id = %s""",
        (question.strip(), answer.strip(), category_id, status, question_id),
    )
    log_activity(actor, "updated", "question", row["code"], question)
    return row["code"]


def delete_question(actor, question_id):
    row = get_question(question_id)
    if not row:
        return None
    execute("DELETE FROM questions WHERE id = %s", (question_id,))
    log_activity(actor, "deleted", "question", row["code"], row["question"])
    return row["code"]


# ==========================================================================
#  Faculty
# ==========================================================================

_FACULTY_SELECT = """
    SELECT f.id, f.code, f.name, f.designation, f.email, f.contact,
           f.photo, f.status, f.updated_at,
           d.id AS department_id, d.name AS department, d.short_name
    FROM faculty f JOIN departments d ON d.id = f.department_id
"""


def list_faculty(search="", department="all", status="all",
                 sort="name", direction="asc"):
    clauses, params = [], []

    if search:
        clauses.append(
            "(f.name LIKE %s OR f.email LIKE %s OR f.designation LIKE %s "
            "OR d.name LIKE %s)"
        )
        like = f"%{search}%"
        params += [like, like, like, like]
    if department and department != "all":
        clauses.append("d.name = %s")
        params.append(department)
    if status and status != "all":
        clauses.append("f.status = %s")
        params.append(status)

    sql = _FACULTY_SELECT
    if clauses:
        sql += " WHERE " + " AND ".join(clauses)
    column = {"name": "f.name", "department": "d.name",
              "designation": "f.designation"}.get(sort, "f.name")
    sql += f" ORDER BY {column} {'DESC' if direction == 'desc' else 'ASC'}"
    return query(sql, params)


def get_faculty(faculty_id):
    return query_one(_FACULTY_SELECT + " WHERE f.id = %s", (faculty_id,))


def add_faculty(actor, name, department_id, designation, email, contact,
                photo, status):
    code = _next_code("faculty", "F")
    execute(
        """INSERT INTO faculty
             (code, name, department_id, designation, email, contact,
              photo, status)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
        (code, name.strip(), department_id, designation, email.strip(),
         contact.strip(), (photo or "").strip() or None, status),
    )
    log_activity(actor, "added", "faculty", code, name)
    return code


def update_faculty(actor, faculty_id, name, department_id, designation,
                   email, contact, photo, status):
    row = get_faculty(faculty_id)
    if not row:
        return None
    execute(
        """UPDATE faculty
           SET name = %s, department_id = %s, designation = %s, email = %s,
               contact = %s, photo = %s, status = %s,
               updated_at = CURRENT_DATE
           WHERE id = %s""",
        (name.strip(), department_id, designation, email.strip(),
         contact.strip(), (photo or "").strip() or None, status, faculty_id),
    )
    log_activity(actor, "updated", "faculty", row["code"], name)
    return row["code"]


def delete_faculty(actor, faculty_id):
    row = get_faculty(faculty_id)
    if not row:
        return None
    execute("DELETE FROM faculty WHERE id = %s", (faculty_id,))
    log_activity(actor, "deleted", "faculty", row["code"], row["name"])
    return row["code"]


# ==========================================================================
#  Dashboard
# ==========================================================================


def dashboard_stats():
    return {
        "total_questions": query_value("SELECT COUNT(*) FROM questions"),
        "active_questions": query_value(
            "SELECT COUNT(*) FROM questions WHERE status = 'Active'"),
        "total_answers": query_value(
            "SELECT COUNT(*) FROM questions WHERE answer <> ''"),
        "total_categories": query_value("SELECT COUNT(*) FROM categories"),
        "total_faculty": query_value("SELECT COUNT(*) FROM faculty"),
        "active_faculty": query_value(
            "SELECT COUNT(*) FROM faculty WHERE status = 'Active'"),
        "recently_updated": query_value(
            """SELECT (SELECT COUNT(*) FROM questions
                       WHERE updated_at >= CURRENT_DATE - INTERVAL 30 DAY)
                    + (SELECT COUNT(*) FROM faculty
                       WHERE updated_at >= CURRENT_DATE - INTERVAL 30 DAY)"""),
        "questions_asked": query_value("SELECT COUNT(*) FROM chat_log"),
    }


def recent_questions(limit=5):
    return query(_QUESTION_SELECT + " ORDER BY q.created_at DESC, q.id DESC "
                                    "LIMIT %s", (limit,))


def recent_faculty(limit=5):
    return query(_FACULTY_SELECT + " ORDER BY f.updated_at DESC, f.id DESC "
                                   "LIMIT %s", (limit,))
