#!/usr/bin/env bash
#
# setup_pythonanywhere.sh — everything that can be automated, in one command
#
# Run this in a PythonAnywhere Bash console. It does the whole command-line
# half of the deployment: clone, virtualenv, dependencies, .env, database,
# seed data, model, and a verification run. Then it prints the two things you
# still have to paste into the web interface, already filled in with your
# username, because those parts have no command-line equivalent.
#
#     bash <(curl -sL https://raw.githubusercontent.com/nandan-bkend/Querychatbot/main/deploy/setup_pythonanywhere.sh)
#
# Safe to run twice. It reuses an existing clone and virtualenv, and the
# database step is idempotent.

set -euo pipefail

REPO="https://github.com/nandan-bkend/Querychatbot.git"
PROJECT="$HOME/Querychatbot"
VENV_NAME="chatbot"

say()  { printf '\n\033[1m%s\033[0m\n' "$*"; }
step() { printf '  %s\n' "$*"; }
warn() { printf '  \033[33m%s\033[0m\n' "$*"; }

USERNAME="${USER:-$(whoami)}"

say "SEA College Enquiry Chatbot — PythonAnywhere setup"
step "user: $USERNAME"

# --------------------------------------------------------------------------
# 1. Code
# --------------------------------------------------------------------------
say "1/6  Getting the code"
if [ -d "$PROJECT/.git" ]; then
  step "already cloned — pulling the latest"
  git -C "$PROJECT" pull --ff-only
else
  git clone "$REPO" "$PROJECT"
fi
cd "$PROJECT/backend"

# --------------------------------------------------------------------------
# 2. Virtualenv
# --------------------------------------------------------------------------
say "2/6  Python environment"
# virtualenvwrapper is present on PythonAnywhere but not sourced in a
# non-interactive shell, so drive virtualenv directly and keep the same
# location the Web tab expects.
VENV="$HOME/.virtualenvs/$VENV_NAME"
if [ -d "$VENV" ]; then
  step "reusing $VENV"
else
  PY=$(command -v python3.11 || command -v python3.10 || command -v python3)
  step "creating $VENV with $($PY --version)"
  "$PY" -m venv "$VENV"
fi
# --no-cache-dir matters here. The free account has a 512 MB disk quota, the
# installed packages come to roughly 340 MB of it, and pip's download cache
# would otherwise hold a second copy of every wheel while it works.
"$VENV/bin/pip" install --quiet --no-cache-dir --upgrade pip
step "installing dependencies (a couple of minutes — scipy is large)"
"$VENV/bin/pip" install --quiet --no-cache-dir -r requirements.txt
step "installed, using $(du -sh "$VENV" | cut -f1) of disk"

# --------------------------------------------------------------------------
# 3. Configuration
# --------------------------------------------------------------------------
say "3/6  Configuration"
if [ -f .env ] && grep -q '^DB_PASSWORD=..' .env; then
  step ".env already set up — leaving it alone"
else
  echo
  step "Your MySQL password is the one you set on the Databases tab,"
  step "not your PythonAnywhere account password."
  read -rsp "  MySQL password: " DB_PASS; echo
  echo
  step "Gemini key (from https://aistudio.google.com/apikey)."
  step "Press Enter to skip — the chatbot works without it, it just"
  step "declines politely instead of using the grounded fallback."
  read -rsp "  Gemini API key (optional): " GEMINI; echo

  SECRET=$("$VENV/bin/python" -c "import secrets; print(secrets.token_hex(32))")

  cat > .env <<ENVFILE
SECRET_KEY=$SECRET
FLASK_DEBUG=0

DB_HOST=$USERNAME.mysql.pythonanywhere-services.com
DB_PORT=3306
DB_USER=$USERNAME
DB_PASSWORD=$DB_PASS
DB_NAME=${USERNAME}\$college_chatbot

MIN_CATEGORY_CONFIDENCE=0.20
MIN_SIMILARITY=0.35

GEMINI_API_KEY=$GEMINI
GEMINI_MODEL=gemini-flash-lite-latest
LLM_TIMEOUT=12
LLM_ENABLED=1
LLM_DEBUG=0
ENVFILE
  chmod 600 .env
  unset DB_PASS GEMINI SECRET
  step "written, with a freshly generated SECRET_KEY and debug off"
fi

# --------------------------------------------------------------------------
# 4. Database
# --------------------------------------------------------------------------
say "4/6  Database"
step "creating tables"
"$VENV/bin/python" init_db.py
step "loading questions, faculty and demo accounts"
"$VENV/bin/python" seed.py > /dev/null
step "loading training phrasings"
"$VENV/bin/python" seed_training.py > /dev/null

# --------------------------------------------------------------------------
# 5. Model
# --------------------------------------------------------------------------
say "5/6  Training the model"
"$VENV/bin/python" -m chatbot.train > /dev/null
step "trained"

# --------------------------------------------------------------------------
# 6. Verify
# --------------------------------------------------------------------------
say "6/6  Checking it works"
"$VENV/bin/python" evaluate.py || warn "evaluation reported a problem — read the output above"

# --------------------------------------------------------------------------
# What is left, which needs the web interface
# --------------------------------------------------------------------------
cat <<INSTRUCTIONS

$(printf '\033[1m')Command-line setup is complete. Two things left, both in the Web tab.$(printf '\033[0m')

  Open:  https://www.pythonanywhere.com/user/$USERNAME/webapps/

  a) Add a new web app
       - Manual configuration   (NOT "Flask" — that overwrites the project)
       - Python 3.11

  b) Virtualenv — enter exactly:

       $VENV

  c) WSGI configuration file — click it, delete everything, paste this:

-------------------------------------------------------------------------
import sys
from pathlib import Path

PROJECT = Path("$PROJECT/backend")
if str(PROJECT) not in sys.path:
    sys.path.insert(0, str(PROJECT))

from app import app as application
-------------------------------------------------------------------------

  d) Static files — optional, keeps CSS off the Python process:

       URL:        /assets/
       Directory:  $PROJECT/assets/

  e) Press the green Reload button, then open:

       https://$USERNAME.pythonanywhere.com

$(printf '\033[1m')Then protect the demo$(printf '\033[0m') — Tasks tab, add a daily task:

  $VENV/bin/python $PROJECT/backend/restore_demo.py --quiet

That restores the questions if a visitor deletes them, since the login page
shows the admin password on purpose.

$(printf '\033[1m')Remember:$(printf '\033[0m') free web apps expire after 3 months unless you press
the renewal button on the Web tab. Put it in your calendar.

INSTRUCTIONS
