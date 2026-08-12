"""
db.py — MySQL connection and query helpers

Everything that touches the database goes through this module, so connection
handling and cursor cleanup live in one place rather than in every route.

    rows = query("SELECT * FROM questions WHERE status = %s", ("Active",))
    row  = query_one("SELECT * FROM questions WHERE id = %s", (question_id,))
    new_id = execute("INSERT INTO questions (...) VALUES (...)", (...))

Parameters are always passed separately, never formatted into the SQL string,
so the queries are not open to SQL injection.
"""

from contextlib import contextmanager

import mysql.connector
from mysql.connector import errorcode

from config import Config


class DatabaseError(Exception):
    """Raised with a readable message when the database cannot be reached."""


def connect(include_database=True):
    """Open a single connection. Callers should prefer get_cursor()."""
    try:
        return mysql.connector.connect(**Config.db_params(include_database))
    except mysql.connector.Error as err:
        if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
            raise DatabaseError(
                "MySQL refused the credentials in backend/.env "
                "(check DB_USER and DB_PASSWORD)."
            ) from err
        if err.errno == errorcode.ER_BAD_DB_ERROR:
            raise DatabaseError(
                f"Database '{Config.DB_NAME}' does not exist. "
                "Run:  mysql -u root -p < backend/schema.sql"
            ) from err
        raise DatabaseError(
            f"Could not connect to MySQL at "
            f"{Config.DB_HOST}:{Config.DB_PORT} — is the server running? "
            f"({err})"
        ) from err


@contextmanager
def get_cursor(dictionary=True, commit=False):
    """
    Yield a cursor and always close it, committing on success when asked and
    rolling back if the block raises.
    """
    conn = connect()
    cursor = conn.cursor(dictionary=dictionary)
    try:
        yield cursor
        if commit:
            conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


def query(sql, params=None):
    """Return all rows as a list of dicts."""
    with get_cursor() as cursor:
        cursor.execute(sql, params or ())
        return cursor.fetchall()


def query_one(sql, params=None):
    """Return the first row as a dict, or None."""
    with get_cursor() as cursor:
        cursor.execute(sql, params or ())
        row = cursor.fetchone()
        cursor.fetchall()  # drain, so the connection can be reused
        return row


def query_value(sql, params=None, default=None):
    """Return the first column of the first row."""
    with get_cursor(dictionary=False) as cursor:
        cursor.execute(sql, params or ())
        row = cursor.fetchone()
        cursor.fetchall()
        return row[0] if row else default


def execute(sql, params=None):
    """Run a write statement. Returns lastrowid for INSERT, rowcount otherwise."""
    with get_cursor(commit=True) as cursor:
        cursor.execute(sql, params or ())
        return cursor.lastrowid or cursor.rowcount


def execute_many(sql, seq_of_params):
    """Run one statement over many parameter sets. Returns rows affected."""
    with get_cursor(commit=True) as cursor:
        cursor.executemany(sql, seq_of_params)
        return cursor.rowcount


def healthcheck():
    """Return (ok, message) describing whether the database is usable."""
    try:
        version = query_value("SELECT VERSION()")
        tables = query_value(
            "SELECT COUNT(*) FROM information_schema.TABLES "
            "WHERE TABLE_SCHEMA = %s",
            (Config.DB_NAME,),
        )
        return True, f"MySQL {version} · {Config.DB_NAME} · {tables} tables"
    except DatabaseError as err:
        return False, str(err)
