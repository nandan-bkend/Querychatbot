"""
pythonanywhere_wsgi.py — the file PythonAnywhere runs to start the site

This is a template, not a file the application imports. Copy its contents into
the WSGI configuration file that PythonAnywhere creates for you — the Web tab
links to it, and it lives at:

    /var/www/YOURUSERNAME_pythonanywhere_com_wsgi.py

Replace YOURUSERNAME below with your PythonAnywhere username, delete whatever
sample code is already in that file, and reload the web app.

Why the path juggling: the application lives in backend/, imports its
neighbours as plain modules (`import repository`, `from config import Config`),
and is normally started from inside that folder. A WSGI server starts from
somewhere else entirely, so backend/ has to be on sys.path before `app` can be
imported. Everything else the project needs — .env, the templates, ../assets —
is located relative to the source files themselves, so nothing further is
required.
"""

import sys
from pathlib import Path

# ---- the one line to edit -------------------------------------------------
PROJECT = Path("/home/YOURUSERNAME/Querychatbot/backend")
# ---------------------------------------------------------------------------

if str(PROJECT) not in sys.path:
    sys.path.insert(0, str(PROJECT))

from app import app as application       # noqa: E402  (must follow sys.path)
