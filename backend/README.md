# Backend — Flask + MySQL + NLP

The working system behind the College Enquiry Chatbot. Flask serves the pages,
MySQL holds the data, and a TF-IDF + Naive Bayes pipeline decides which stored
answer replies to a student's question.

The project can be demonstrated two ways:

| Mode | How | Needs |
|---|---|---|
| **Static prototype** | open `../index.html` | nothing |
| **Full system** | `python app.py` | Python, MySQL |

The static prototype is unchanged and still works. Keep it as a fallback for a
demonstration — if anything goes wrong with the server on the day, the
interface still runs from a file.

---

## Setup

### 1. MySQL

```bash
brew install mysql          # macOS
brew services start mysql
```

Set a root password:

```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY 'your-password';
```

### 2. Python

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Configuration

```bash
cp .env.example .env
```

Edit `.env` and set `DB_PASSWORD` to the password you chose. This file is not
committed, so each machine keeps its own credentials.

### 4. Database

```bash
mysql -u root -p < schema.sql     # creates college_chatbot and its 8 tables
python seed.py                    # 28 questions, 18 faculty, 2 users
python seed_training.py           # 292 question phrasings
python -m chatbot.train           # fits the model
```

### 5. Run

```bash
python app.py
```

Open <http://127.0.0.1:8000>.

| Role | Email | Password |
|---|---|---|
| Student | `student@seacet.edu.in` | `student123` |
| Administrator | `admin@seacet.edu.in` | `admin123` |

---

## How a question is answered

```
student types "college timings?"
   │
   ├─ preprocess.py     tokenise → remove stopwords → Porter stem
   │                    "college timings?"  →  "colleg time"
   │
   ├─ TF-IDF            vectorise against the fitted vocabulary
   │
   ├─ Naive Bayes       → "Timetable"          (category + confidence)
   │
   ├─ cosine similarity → nearest stored phrasing inside that category
   │
   └─ MySQL             SELECT answer FROM questions WHERE id = …
```

Naive Bayes narrows the search to one of six categories; cosine similarity then
picks the exact question. Splitting the work means the classifier only ever has
to separate six classes, which is learnable from the amount of data a college
project realistically has.

### Not answering is a feature

Two guards stop the system returning a confident wrong answer:

- **Vocabulary gate** — question words like *what* and *where* appear in almost
  every stored question, so on their own they match everything. If none of the
  words that name a *subject* are known to the model, the question is refused
  outright. Without this, "where can I buy a laptop" answered with the ISE
  department's location.
- **Coverage weighting** — unknown words vanish during vectorisation, so
  "how do I apply for a bank loan" collapses to "how apply" and then looks like
  a perfect match for "how do I apply for admission". The similarity is scaled
  by the share of the question that was actually recognised.

### Measured accuracy

```bash
python evaluate.py            # recall and rejection
python evaluate.py --sweep    # tune the similarity threshold
```

| Measure | Result |
|---|---|
| Naive Bayes category accuracy | 87.7% (5-fold cross validation) |
| Recall on independently written phrasings | 75% |
| Rejection of out-of-scope questions | 100% |

The 75% is the honest figure: it was measured on phrasings written after the
threshold was tuned, verified not to appear in the training data. Every miss is
a vocabulary gap — "semester **tests**" when the data says *exam*, "**weekend**
classes", "boys **residential** block. The fix is always to add phrasings to
`data/training_data.csv` and retrain, which takes under a second.

---

## Optional: the grounded fallback

The pipeline above refuses anything it cannot match, which is correct but
narrow — a student asking something the question bank does not cover gets an
apology. The grounded fallback widens that last step, without touching the
classifier.

**It runs only after TF-IDF and Naive Bayes have already failed.** If a stored
question matches, no external call is made. The classifier is still what
answers every question it can answer, and the fallback cannot override, re-rank
or reword any answer it produces.

### Why it cannot invent facts about the college

The model is never asked what it knows. On each call it is handed the contents
of the database — departments, active faculty, and every active question and
answer, about 10,000 characters — and instructed to answer from that text
alone. Anything not in there must come back as the literal token `NO_ANSWER`,
which `llm.py` turns into a normal decline.

So the worst it can do is rephrase or combine facts the administrator entered.
It has no licence to produce a faculty name, phone number or fee that is not
already in MySQL. Deactivate a question in the admin panel and it disappears
from the fallback's facts at the same moment it disappears from the classifier.

Three further guards, all in `llm.py`: replies over 700 characters are
discarded (the longest stored answer is 378, so a model writing paragraphs has
stopped following instructions and is no longer trustworthy on the grounding
rule either); markdown is stripped; and every failure path returns `None`.

### Turning it on

```bash
# 1. free key, no card required
open https://aistudio.google.com/apikey

# 2. paste it into backend/.env  (gitignored — it never reaches GitHub)
GEMINI_API_KEY=your-key-here

# 3. check it
python -m chatbot.llm "who is the hod of the ai and ml department"
```

Leave `GEMINI_API_KEY` blank and the feature is simply off. No key, no
internet, a rate limit, a timeout or a malformed reply all produce exactly the
behaviour the project had before this file existed — the polite decline. It is
wired in at a single function, `_decline()` in `predict.py`, which is also the
only line to delete to remove the feature entirely.

| Setting | Default | Meaning |
|---|---|---|
| `GEMINI_API_KEY` | *(blank)* | Blank switches the fallback off |
| `GEMINI_MODEL` | `gemini-flash-lite-latest` | An alias, not a pinned version — see below |
| `LLM_TIMEOUT` | `12` | Seconds before giving up and declining. The API rejects anything under 10 |
| `LLM_ENABLED` | `1` | Set to `0` to disable without removing the key |
| `LLM_DEBUG` | `0` | Set to `1` to log *why* a decline happened |

Answers from this path are returned with `"source": "llm"` and logged in
`chat_log` with `answered = 1` but a `NULL` `matched_question_id`, so the two
kinds of answer stay distinguishable in the data.

### Measured

| Check | Result |
|---|---|
| Rejection suite (`evaluate.py`) with the fallback **on** | **10/10** — no out-of-scope question started being answered |
| Recall and rejection with the fallback **off** | 33/33 and 10/10 — unchanged from before the feature |
| Refusing facts absent from the database | 4/4 — wifi password, principal, swimming pool, canteen |
| Answering facts present but with no stored question | AI&ML HOD, ISE HOD's email — read from the `faculty` table |
| Repeat question | 0.000s, served from cache, no request spent |

The last two are the point of the feature. *"Who is the HOD of the AI and ML
department?"* has no row in `questions`, so TF-IDF and Naive Bayes decline it —
but Dr. Manjunath H. R. is in the `faculty` table, so the fallback answers it,
with his real email and extension. Meanwhile *"what is the wifi password"* is
in neither, and gets refused rather than guessed.

### Free-tier limits, and why they matter more than the cost

The free tier allows **20 requests per day and 5 per minute, per model.**
That is the real constraint on this feature — not money.

It is less restrictive than it first sounds, because the fallback only runs
for questions the classifier could not match. Every question in the demo
script is answered by TF-IDF and Naive Bayes without touching the network.
Repeats are free too: answers and refusals are cached in memory, so asking the
same thing twice costs one request, not two.

But it is a real limit, and worth knowing before a demonstration:

- **Rehearsing burns the same quota as presenting.** Twenty unmatched
  questions in the morning leaves none for the afternoon.
- **The quota is per model.** If one runs dry, change `GEMINI_MODEL` in `.env`
  to another — `gemini-flash-latest`, `gemini-3.5-flash`, `gemini-3.6-flash`
  — and the allowance starts fresh. `python -m chatbot.llm` lists nothing, but
  the Google AI Studio console shows what a key can reach.
- **Running dry is not a failure.** A 429 is caught like any other error: the
  student gets the ordinary polite decline, and the classifier keeps working
  normally. Nothing visibly breaks.

Set `LLM_DEBUG=1` to tell the two apart — a genuine "not covered by the facts"
refusal and a "rate limited" decline look identical to the student, and
identical in the log, without it.

### Why the model is an alias, not a version

`GEMINI_MODEL` defaults to `gemini-flash-lite-latest` rather than a numbered
release. Google retires specific versions to new keys — `gemini-2.5-flash`
already returns 404 for a key issued today — and a project that sits untouched
between semesters should not stop working because a version number went stale.

The *lite* tier is deliberate. This is a grounded lookup, not a reasoning
problem: the answer is already in the facts and the model only has to find it
and say it plainly. In testing, lite ran roughly twice as fast and scored the
same on refusing what it should not answer.

---

## Adding a question makes the chatbot answer it immediately

When an administrator adds, edits or deletes a question, the model is retrained
inline before the redirect. A question added in the admin panel is answerable
in the chat straight away, and a question set to **Inactive** stops being
answered. Retraining takes about 0.04 seconds on this dataset, which is why it
is done in the request rather than as a background job.

---

## Files

```
backend/
├── app.py               Flask routes
├── auth.py              login, sessions, route guards
├── repository.py        every SQL read and write
├── db.py                connection handling
├── config.py            settings, read from .env
├── schema.sql           the 8 tables
├── seed.py              loads the sample dataset
├── seed_training.py     loads the question phrasings
├── evaluate.py          accuracy measurement
├── chatbot/
│   ├── preprocess.py    NLP: tokenise, stopwords, stemming
│   ├── train.py         TF-IDF + Naive Bayes, saves the model
│   ├── predict.py       the answering path
│   └── llm.py           optional grounded fallback, off without a key
├── data/
│   ├── seed_data.json   exported from the frontend's mock-data.js
│   └── training_data.csv 292 phrasings
└── templates/           the frontend HTML, as Jinja templates
```

Static files are served from `../assets`, the same folder the standalone
prototype uses, so there is one copy of the CSS and images.

### Database tables

| Table | Holds |
|---|---|
| `categories` | the six enquiry areas |
| `departments` | the seven branches |
| `questions` | the chatbot knowledge base |
| `faculty` | staff records |
| `users` | students and administrators, passwords hashed with scrypt |
| `training_data` | question phrasings used to train the model |
| `chat_log` | every question asked, with what the model decided |
| `activity_log` | administrative audit trail |

---

## Security notes

- Passwords are stored as scrypt hashes and compared with
  `check_password_hash`. Plain passwords exist only in `seed.py`.
- Every query passes parameters separately from the SQL, so the application is
  not open to SQL injection.
- Session cookies are signed by Flask. A student session cannot open an admin
  page, and admin routes are protected server-side rather than by hiding links.
- `SECRET_KEY` and the database password live in `.env`, which is not committed.

For a college demonstration this is appropriate. Before anything resembling
real use, `SECRET_KEY` must be changed, `FLASK_DEBUG` turned off, and the
application run behind a proper WSGI server rather than the development one.
