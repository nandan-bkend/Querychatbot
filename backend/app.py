"""
app.py — College Enquiry Chatbot, Flask application

    python app.py           then open http://127.0.0.1:8000

Route map
---------
Public
    GET  /                          home page

Student
    GET  POST /student/login
    GET       /student/chat         chatbot dashboard
    POST      /student/ask          the one JSON route: question in, answer out
    GET       /student/logout

Admin
    GET  POST /admin/login
    GET       /admin/dashboard
    GET       /admin/questions              list, with search and filters
    POST      /admin/questions/add
    POST      /admin/questions/<id>/edit
    POST      /admin/questions/<id>/delete
    GET       /admin/faculty
    POST      /admin/faculty/add
    POST      /admin/faculty/<id>/edit
    POST      /admin/faculty/<id>/delete
    GET       /admin/logout

Everything except /student/ask is a normal page render or a form post followed
by a redirect. The chat route returns JSON so that asking a question does not
reload the page.
"""

import threading

from flask import (Flask, flash, jsonify, redirect, render_template, request,
                   session, url_for)

import repository as repo
import restore_demo
from auth import (admin_required, authenticate, current_user, login_user,
                  logout_user, student_required)
from chatbot import llm
from chatbot import predict
from chatbot import train
from config import COLLEGE, Config
from db import DatabaseError, healthcheck

app = Flask(
    __name__,
    template_folder=str(Config.TEMPLATE_DIR),
    static_folder=str(Config.STATIC_DIR),
    static_url_path="/assets",
)
app.config.from_object(Config)


# ==========================================================================
#  Shared template values
#
#  COLLEGE now lives in config.py, because the grounded fallback needs the
#  same details and importing them from app.py would be circular.
# ==========================================================================


def ensure_model():
    """
    Train the model if it is not on disk yet.

    The .joblib is gitignored — it is build output, not source — so a fresh
    clone or a fresh deployment has no model at all, and the first student to
    ask a question would meet a FileNotFoundError. Training takes about a
    second, so building it during startup is cheaper than any of the
    alternatives, and it makes deployment a git pull rather than a git pull
    plus a remembered command.

    Runs at import so it happens under a WSGI server too, not only when this
    file is executed directly. A database that is not ready yet is not fatal
    here: the error surfaces properly on the first question instead.
    """
    try:
        predict.load_model()
    except FileNotFoundError:
        app.logger.info("no trained model found — training one now")
        try:
            train.retrain()
            predict.reload_model()
        except Exception as err:
            app.logger.warning("could not train at startup: %s", err)


ensure_model()


@app.context_processor
def inject_globals():
    return {"college": COLLEGE, "user": current_user()}


@app.template_filter("initials")
def initials(name):
    parts = [p for p in str(name or "").replace("Dr.", "").replace("Prof.", "")
             .split() if p]
    if not parts:
        return "?"
    if len(parts) == 1:
        return parts[0][:2].upper()
    return (parts[0][0] + parts[-1][0]).upper()


@app.template_filter("nice_date")
def nice_date(value):
    return value.strftime("%-d %b %Y") if hasattr(value, "strftime") else value


@app.template_filter("nice_datetime")
def nice_datetime(value):
    return value.strftime("%-d %b %Y, %-I:%M %p") if hasattr(value, "strftime") \
        else value


@app.errorhandler(DatabaseError)
def handle_db_error(error):
    return render_template("error.html", message=str(error)), 500


# ==========================================================================
#  Public
# ==========================================================================


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/healthz")
def healthz():
    """
    Cheap liveness check, and the target for the keep-warm ping.

    Free hosting sleeps an idle app and takes about a minute to wake, which
    to somebody opening the link looks like a broken site. A free scheduler
    hitting this every ten minutes keeps it awake. Deliberately does no
    database work: waking the process is the whole job, and a ping that fails
    when MySQL hiccups would defeat the point.
    """
    return jsonify({"status": "ok"})


@app.route("/tasks/restore")
def tasks_restore():
    """
    Reseed the public demo. Protected by a token, because the alternative is
    a URL that lets any passer-by wipe the database on a loop.

    Exists because the free hosting tier has no scheduler. An external cron
    service calls this once a day; on a paid tier you would run
    restore_demo.py directly instead.

    Returns straight away and does the work on a background thread: reseeding
    and retraining takes longer than a cron service will wait, and a timeout
    would leave it retrying a job that was already running.
    """
    token = Config.TASK_TOKEN
    if not token:
        return jsonify({"error": "TASK_TOKEN is not configured"}), 503
    if request.args.get("token") != token:
        return jsonify({"error": "bad token"}), 403

    threading.Thread(target=restore_demo.restore,
                     kwargs={"log": app.logger.info},
                     daemon=True).start()
    return jsonify({"status": "restore started"}), 202


# ==========================================================================
#  Student
# ==========================================================================


@app.route("/student/login", methods=["GET", "POST"])
def student_login():
    if session.get("role") == "student":
        return redirect(url_for("student_chat"))

    error = None
    email = ""
    if request.method == "POST":
        email = request.form.get("email", "")
        user, error = authenticate(email, request.form.get("password"), "student")
        if user:
            login_user(user)
            return redirect(url_for("student_chat"))

    return render_template("student_login.html", error=error, email=email)


@app.route("/student/chat")
@student_required
def student_chat():
    suggestions = [
        "Who is the HOD of the ISE department?",
        "What are the college timings?",
        "Who are the faculty members in ISE?",
        "Where is the ISE department located?",
        "What are the contact details of the college?",
        "What are the library timings?",
    ]
    return render_template(
        "student_chat.html",
        suggestions=suggestions,
        knowledge_size=repo.dashboard_stats()["active_questions"],
    )


@app.route("/student/ask", methods=["POST"])
@student_required
def student_ask():
    """
    The single JSON route in the application. The browser posts the typed
    question here and receives the answer, so the chat does not reload the
    page on every message.

    This is where the pipeline runs: NLP preprocessing, TF-IDF, Naive Bayes
    for the category, cosine similarity for the question, answer from MySQL.
    """
    payload = request.get_json(silent=True) or {}
    question = (payload.get("question") or "").strip()

    if not question:
        return jsonify({"error": "empty question"}), 400

    result = predict.ask(question, user_id=session.get("user_id"))
    return jsonify(result)


@app.route("/student/logout")
def student_logout():
    logout_user()
    return redirect(url_for("student_login"))


# ==========================================================================
#  Admin
# ==========================================================================


@app.route("/admin/login", methods=["GET", "POST"])
def admin_login():
    if session.get("role") == "admin":
        return redirect(url_for("admin_dashboard"))

    error = None
    email = ""
    if request.method == "POST":
        email = request.form.get("email", "")
        user, error = authenticate(email, request.form.get("password"), "admin")
        if user:
            login_user(user)
            return redirect(url_for("admin_dashboard"))

    return render_template("admin_login.html", error=error, email=email)


@app.route("/admin/dashboard")
@admin_required
def admin_dashboard():
    return render_template(
        "admin_dashboard.html",
        page="dashboard",
        stats=repo.dashboard_stats(),
        recent_questions=repo.recent_questions(5),
        recent_faculty=repo.recent_faculty(5),
        activity=repo.recent_activity(7),
    )


# ------------------------------------------------------ questions & answers


@app.route("/admin/questions")
@admin_required
def admin_questions():
    search = request.args.get("search", "").strip()
    category = request.args.get("category", "all")
    status = request.args.get("status", "all")
    sort = request.args.get("sort", "created_at")
    direction = request.args.get("dir", "desc")

    return render_template(
        "admin_questions.html",
        page="questions",
        questions=repo.list_questions(search, category, status, sort, direction),
        categories=repo.all_categories(),
        search=search, category=category, status=status,
        sort=sort, direction=direction,
    )


def refresh_model():
    """
    Rebuild the model after the question bank changes, so a question added in
    the admin panel is answerable by the chatbot straight away rather than
    after the next manual training run. Takes a fraction of a second on a
    dataset this size.
    """
    try:
        train.retrain()
        predict.reload_model()
    except Exception as err:            # never let this break a save
        app.logger.warning("could not retrain: %s", err)


def _question_form():
    return (
        request.form.get("question", "").strip(),
        request.form.get("answer", "").strip(),
        request.form.get("category_id", type=int),
        request.form.get("status", "Active"),
    )


def _question_errors(question, answer, category_id):
    problems = []
    if len(question) < 10:
        problems.append("The question must be at least 10 characters.")
    if len(answer) < 15:
        problems.append("The answer must be at least 15 characters.")
    if not category_id:
        problems.append("Choose a category.")
    return problems


@app.route("/admin/questions/add", methods=["POST"])
@admin_required
def admin_questions_add():
    question, answer, category_id, status = _question_form()
    problems = _question_errors(question, answer, category_id)
    if problems:
        flash(" ".join(problems), "error")
    else:
        code = repo.add_question(current_user(), question, answer,
                                 category_id, status)
        refresh_model()
        flash(f"Question {code} added successfully. "
              "The chatbot can answer it now.", "success")
    return redirect(url_for("admin_questions"))


@app.route("/admin/questions/<int:question_id>/edit", methods=["POST"])
@admin_required
def admin_questions_edit(question_id):
    question, answer, category_id, status = _question_form()
    problems = _question_errors(question, answer, category_id)
    if problems:
        flash(" ".join(problems), "error")
    else:
        code = repo.update_question(current_user(), question_id, question,
                                    answer, category_id, status)
        refresh_model()
        flash(f"Question {code} updated successfully." if code
              else "That question no longer exists.",
              "success" if code else "error")
    return redirect(url_for("admin_questions"))


@app.route("/admin/questions/<int:question_id>/delete", methods=["POST"])
@admin_required
def admin_questions_delete(question_id):
    code = repo.delete_question(current_user(), question_id)
    refresh_model()
    flash(f"Question {code} deleted successfully." if code
          else "That question no longer exists.",
          "success" if code else "error")
    return redirect(url_for("admin_questions"))


# ------------------------------------------------------------- faculty


@app.route("/admin/faculty")
@admin_required
def admin_faculty():
    search = request.args.get("search", "").strip()
    department = request.args.get("department", "all")
    status = request.args.get("status", "all")
    view = request.args.get("view", "table")

    return render_template(
        "admin_faculty.html",
        page="faculty",
        faculty=repo.list_faculty(search, department, status),
        departments=repo.all_departments(),
        designations=repo.DESIGNATIONS,
        search=search, department=department, status=status, view=view,
    )


def _faculty_form():
    return {
        "name": request.form.get("name", "").strip(),
        "department_id": request.form.get("department_id", type=int),
        "designation": request.form.get("designation", ""),
        "email": request.form.get("email", "").strip(),
        "contact": request.form.get("contact", "").strip(),
        "photo": request.form.get("photo", "").strip(),
        "status": request.form.get("status", "Active"),
    }


def _faculty_errors(data):
    problems = []
    if len(data["name"]) < 3:
        problems.append("Enter the faculty member's full name.")
    if not data["department_id"]:
        problems.append("Choose a department.")
    if "@" not in data["email"] or "." not in data["email"]:
        problems.append("Enter a valid email address.")
    if len(data["contact"]) < 8:
        problems.append("Enter a valid contact number.")
    return problems


@app.route("/admin/faculty/add", methods=["POST"])
@admin_required
def admin_faculty_add():
    data = _faculty_form()
    problems = _faculty_errors(data)
    if problems:
        flash(" ".join(problems), "error")
    else:
        code = repo.add_faculty(current_user(), **data)
        flash(f"Faculty member {code} added successfully.", "success")
    return redirect(url_for("admin_faculty"))


@app.route("/admin/faculty/<int:faculty_id>/edit", methods=["POST"])
@admin_required
def admin_faculty_edit(faculty_id):
    data = _faculty_form()
    problems = _faculty_errors(data)
    if problems:
        flash(" ".join(problems), "error")
    else:
        code = repo.update_faculty(current_user(), faculty_id, **data)
        flash(f"Faculty record {code} updated successfully." if code
              else "That faculty record no longer exists.",
              "success" if code else "error")
    return redirect(url_for("admin_faculty"))


@app.route("/admin/faculty/<int:faculty_id>/delete", methods=["POST"])
@admin_required
def admin_faculty_delete(faculty_id):
    code = repo.delete_faculty(current_user(), faculty_id)
    flash(f"Faculty record {code} deleted successfully." if code
          else "That faculty record no longer exists.",
          "success" if code else "error")
    return redirect(url_for("admin_faculty"))


@app.route("/admin/logout")
def admin_logout():
    logout_user()
    return redirect(url_for("admin_login"))


# ==========================================================================


if __name__ == "__main__":
    ok, message = healthcheck()
    print(f"  database : {message}")
    if not ok:
        raise SystemExit("\nFix the database connection before starting.\n")
    try:
        model = predict.load_model()
        print(f"  model    : trained on {model['training_size']} phrasings, "
              f"{len(model['categories'])} categories")
    except FileNotFoundError as err:
        raise SystemExit(f"\n{err}\n")

    print(f"  fallback : {'on, ' + Config.GEMINI_MODEL if llm.available() else 'off'}")
    for problem in Config.production_problems():
        print(f"  note     : {problem.splitlines()[0]}")

    print(f"  serving  : http://127.0.0.1:{Config.PORT}\n")
    app.run(debug=Config.DEBUG, port=Config.PORT)
