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
