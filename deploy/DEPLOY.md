# Deploying to PythonAnywhere

A public URL you can share, that stays awake, costs nothing, and keeps the
Gemini fallback working. Budget about 30 minutes the first time.

Everything below assumes a **free** account. Nothing here needs a card.

---

## Why this host

| | |
|---|---|
| **Never sleeps** | The link works instantly when someone opens it. Free tiers elsewhere sleep after ~15 minutes idle and take about 50 seconds to wake, which reads as broken to anyone clicking a link on a CV. |
| **MySQL included** | No second provider to sign up for. |
| **Gemini reachable** | Free accounts can only reach whitelisted sites, and `.googleapis.com` is on that list — which covers `generativelanguage.googleapis.com`. |
| **Built for this** | Flask plus MySQL is the case PythonAnywhere is designed around. |

⚠️ **Free web apps expire after three months** unless you log in and press the
renewal button on the Web tab. Put a recurring reminder in your calendar — a
dead link on a CV is worse than no link.

---

## 1. Account and code

1. Sign up at [pythonanywhere.com](https://www.pythonanywhere.com/) (Beginner,
   free).
2. Open a **Bash console** from the Consoles tab and clone the project:

```bash
git clone https://github.com/nandan-bkend/Querychatbot.git
cd Querychatbot/backend
```

## 2. Database

1. **Databases** tab → set a MySQL password if prompted → create a database
   named `college_chatbot`.
2. PythonAnywhere prefixes it with your username, so the real name becomes
   **`YOURUSERNAME$college_chatbot`**. Note the `$`. Also note the host shown
   on that page: `YOURUSERNAME.mysql.pythonanywhere-services.com`.

## 3. Virtualenv and dependencies

Back in the Bash console:

```bash
mkvirtualenv chatbot --python=/usr/bin/python3.11
pip install -r requirements.txt
```

`mkvirtualenv` both creates and activates it. Later consoles need
`workon chatbot` first.

## 4. Configuration

Create `backend/.env`. Generate a real secret key rather than inventing one:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

```bash
cat > .env <<'EOF'
SECRET_KEY=paste-the-generated-value-here
FLASK_DEBUG=0

DB_HOST=YOURUSERNAME.mysql.pythonanywhere-services.com
DB_PORT=3306
DB_USER=YOURUSERNAME
DB_PASSWORD=your-mysql-password
DB_NAME=YOURUSERNAME$college_chatbot

MIN_CATEGORY_CONFIDENCE=0.20
MIN_SIMILARITY=0.35

GEMINI_API_KEY=your-key-if-you-want-the-fallback
GEMINI_MODEL=gemini-flash-lite-latest
LLM_TIMEOUT=12
LLM_ENABLED=1
LLM_DEBUG=0
EOF
```

Two things that will bite otherwise:

- **`FLASK_DEBUG=0` is not optional.** Flask's debugger hands an interactive
  Python console to anyone who triggers an error. On a public URL that is
  remote code execution. The application now defaults to off, but set it
  explicitly so nobody turns it on later by accident.
- **Quote the heredoc** (`<<'EOF'`, with the quotes) or the shell will try to
  expand `$college_chatbot` and silently write an empty database name.

## 5. Build the database contents

```bash
python init_db.py          # create the 8 tables
python seed.py             # questions, faculty, demo accounts
python seed_training.py    # the 292 phrasings
python -m chatbot.train    # build the model
python evaluate.py         # expect 33/33 and 10/10
```

Use `init_db.py`, **not** `mysql < schema.sql` — the schema file starts by
creating a database called `college_chatbot`, which a free account has no
permission to do and which is the wrong name here anyway. `init_db.py` runs
the same schema against the database you already made.

## 6. The web app

1. **Web** tab → *Add a new web app* → **Manual configuration** (not the Flask
   option — it writes a starter app over your own) → Python 3.11.
2. **Virtualenv** — enter `chatbot`.
3. **Code → WSGI configuration file** — click through, delete everything in it,
   and paste the contents of [`pythonanywhere_wsgi.py`](pythonanywhere_wsgi.py),
   changing `YOURUSERNAME`.
4. **Static files** — optional but worth it, it takes the CSS and images off
   the Python process:

   | URL | Directory |
   |---|---|
   | `/assets/` | `/home/YOURUSERNAME/Querychatbot/assets/` |

5. Press the green **Reload** button.

Open `https://YOURUSERNAME.pythonanywhere.com` — the home page should appear.

## 7. Keep the demo repairable

The login pages show the demo credentials on purpose: visitors are meant to try
the admin panel, and adding a question then watching the chatbot answer it is
the best thing the project does. The cost is that a visitor can also delete
everything and leave the site looking broken.

**Tasks** tab → add a daily task, any time you like:

```
/home/YOURUSERNAME/.virtualenvs/chatbot/bin/python /home/YOURUSERNAME/Querychatbot/backend/restore_demo.py --quiet
```

That reseeds the questions, faculty and phrasings and retrains the model, so
any damage lasts hours rather than forever. `--quiet` keeps the task log empty
unless something actually failed.

You can also run it by hand at any time:

```bash
workon chatbot && cd ~/Querychatbot/backend && python restore_demo.py
```

## 8. Check it properly

Open the site and confirm, in this order:

1. **Home page** loads with the college logo.
2. **Student login** with `student@seacet.edu.in` / `student123`.
3. **Ask a stored question** — *"what are the college timings"* — answers
   instantly, with no network call.
4. **Ask something unmatched** — *"who is the hod of the ai and ml
   department"*. Answered means the Gemini fallback is working. A polite
   decline means it is not, and everything else still works.
5. **Admin login** with `admin@seacet.edu.in` / `admin123`, add a question,
   then ask the chatbot that question straight away. It should answer.

If step 4 declines and you wanted the fallback, set `LLM_DEBUG=1` in `.env`,
reload, ask again, and read the **Error log** on the Web tab. It will say
whether the cause was a rate limit, a bad key, or a genuine "not covered by
the facts".

---

## Updating the deployed site later

```bash
workon chatbot && cd ~/Querychatbot
git pull
pip install -r backend/requirements.txt     # only if requirements changed
```

Then **Reload** on the Web tab. If the pull changed `schema.sql`, run
`python backend/init_db.py` too.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| "Something went wrong" page | Read the **Error log** on the Web tab — it names the exception and line. |
| `Unknown database` | `DB_NAME` needs the `YOURUSERNAME$` prefix, and the heredoc must be quoted or `$college_chatbot` gets eaten. |
| `Access denied for user` | The MySQL password is the one from the Databases tab, not your account password. |
| Chatbot answers nothing at all | The model was not built. Run `python -m chatbot.train`. |
| CSS missing, page unstyled | The static files mapping in step 6.4 is wrong, or the trailing slashes are missing. |
| Fallback always declines | `LLM_DEBUG=1`, reload, check the error log. Most likely the free quota — 20 requests per day per model. |
| Site was working, now 502 | Free web apps expire after three months. Press the renewal button on the Web tab. |
