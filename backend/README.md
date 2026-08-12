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

Open <http://127.0.0.1:5000>.

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
│   └── predict.py       the answering path
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
