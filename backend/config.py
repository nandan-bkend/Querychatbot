"""
config.py — application settings

Values are read from a .env file so credentials never enter version control.
Copy .env.example to .env and edit it for your machine.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent

load_dotenv(BASE_DIR / ".env")


class Config:
    BASE_DIR = BASE_DIR
    PROJECT_ROOT = PROJECT_ROOT

    # ---- Flask ----
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-change-me")
    DEBUG = os.getenv("FLASK_DEBUG", "1") == "1"
    # Not 5000: macOS runs AirPlay Receiver on that port, which answers with
    # 403 and makes it look as though the application failed to start.
    PORT = int(os.getenv("PORT", "8000"))

    # ---- MySQL ----
    DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
    DB_PORT = int(os.getenv("DB_PORT", "3306"))
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_NAME = os.getenv("DB_NAME", "college_chatbot")

    # ---- Chatbot ----
    # Below this Naive Bayes confidence the question is treated as unknown and
    # the fallback reply is sent instead of a possibly wrong answer.
    MIN_CATEGORY_CONFIDENCE = float(os.getenv("MIN_CATEGORY_CONFIDENCE", "0.20"))
    # Below this TF-IDF cosine similarity no stored question is close enough.
    MIN_SIMILARITY = float(os.getenv("MIN_SIMILARITY", "0.35"))

    MODEL_DIR = BASE_DIR / "chatbot" / "model"
    SEED_FILE = BASE_DIR / "data" / "seed_data.json"
    TRAINING_FILE = BASE_DIR / "data" / "training_data.csv"

    # ---- Optional grounded fallback (Google AI Studio / Gemini) ----
    # Used only when TF-IDF and Naive Bayes find no match. Leave the key blank
    # and the application behaves exactly as it did before: the assistant
    # declines politely instead. Nothing else in the project depends on it.
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()
    # Seconds. Deliberately short: a student waiting on a chat reply would
    # rather have the ordinary decline quickly than the perfect answer late.
    LLM_TIMEOUT = float(os.getenv("LLM_TIMEOUT", "8"))
    # Escape hatch to switch the fallback off without deleting the key.
    LLM_ENABLED = os.getenv("LLM_ENABLED", "1") == "1"

    # ---- Paths to the existing frontend ----
    TEMPLATE_DIR = BASE_DIR / "templates"
    STATIC_DIR = PROJECT_ROOT / "assets"

    @classmethod
    def db_params(cls, include_database=True):
        params = {
            "host": cls.DB_HOST,
            "port": cls.DB_PORT,
            "user": cls.DB_USER,
            "password": cls.DB_PASSWORD,
        }
        if include_database:
            params["database"] = cls.DB_NAME
        return params


# ==========================================================================
#  College identity
#
#  Lives here rather than in app.py because two unrelated parts of the
#  application need it: the page templates, and the grounded fallback, which
#  has to tell the language model which institution it is speaking for.
# ==========================================================================

COLLEGE = {
    "name": "SEA College of Engineering and Technology",
    "short_name": "SEA",
    "tagline": "Affiliated to VTU, Belagavi · Approved by AICTE, New Delhi",
    "address": "Ayappa Nagar, K. R. Puram, Bengaluru – 560 049, Karnataka",
    "phone": "+91 80 2321 4500",
    "alt_phone": "+91 80 2321 4501",
    "email": "info@seacet.edu.in",
    "website": "www.seacet.edu.in",
}
