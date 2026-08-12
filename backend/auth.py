"""
auth.py — session handling and route protection

Replaces the browser-side auth.js from the frontend prototype. Credentials are
checked against the users table and the session cookie is signed by Flask, so
a student cannot reach an admin page by editing anything in the browser.
"""

from functools import wraps

from flask import flash, redirect, session, url_for
from werkzeug.security import check_password_hash

from db import query_one


def authenticate(email, password, role):
    """
    Return the user row on success, or an error message on failure.
    The two failure cases are kept separate so the login page can say which
    one it was, matching the behaviour the frontend already had.
    """
    email = (email or "").strip().lower()
    user = query_one(
        """SELECT u.*, d.name AS department
           FROM users u LEFT JOIN departments d ON d.id = u.department_id
           WHERE LOWER(u.email) = %s AND u.role = %s""",
        (email, role),
    )
    if not user:
        return None, (
            "No administrator account found with that email address."
            if role == "admin"
            else "No student account found with that email address."
        )
    if user["status"] != "Active":
        return None, "This account has been deactivated. Contact the college office."
    if not check_password_hash(user["password_hash"], password or ""):
        return None, "Incorrect password. Please try again."
    return user, None


def login_user(user):
    session.clear()
    session["user_id"] = user["id"]
    session["role"] = user["role"]
    session.permanent = False


def logout_user():
    session.clear()


def current_user():
    """The signed-in user, re-read from the database on each request."""
    user_id = session.get("user_id")
    if not user_id:
        return None
    return query_one(
        """SELECT u.*, d.name AS department
           FROM users u LEFT JOIN departments d ON d.id = u.department_id
           WHERE u.id = %s""",
        (user_id,),
    )


def login_required(role):
    """
    Protect a route. Anyone without a session of the right role is sent to the
    matching login page, so a student cannot open an admin URL directly.
    """
    def decorator(view):
        @wraps(view)
        def wrapper(*args, **kwargs):
            if session.get("role") != role:
                flash("Please sign in to continue.", "error")
                return redirect(
                    url_for("admin_login" if role == "admin" else "student_login")
                )
            return view(*args, **kwargs)
        return wrapper
    return decorator


student_required = login_required("student")
admin_required = login_required("admin")
