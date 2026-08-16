# College Enquiry Chatbot with Admin Panel — Frontend

A frontend prototype of a college enquiry chatbot for **SEA College of
Engineering & Technology (SEA)**, built for the Department of Information
Science & Engineering.

Students sign in and ask questions about departments, faculty, class timings,
facilities and contact details. Administrators sign in to a separate panel to
manage the questions, answers and faculty records the chatbot draws on.

> **This folder is the frontend prototype.** It runs on sample data with no
> server, so the complete interface can be demonstrated from a file.
>
> The working system — Flask, MySQL and the NLP + TF-IDF + Naive Bayes
> pipeline — lives in [`backend/`](backend/README.md). Both are kept working:
>
> | Mode | How to run | Needs |
> |---|---|---|
> | Prototype | open `index.html` | nothing |
> | Full system | `cd backend && python app.py` | Python, MySQL |
>
> Keep the prototype as a fallback for your review. If anything goes wrong with
> the server on the day, the interface still runs from a file.

---

## Running it

No installation, no build step, no Node, no internet connection required.

```bash
git clone <your-repo-url>
cd chatbot
```

Then **double-click `index.html`**, or drag it into any browser.

<details>
<summary>Optional: run it through a local server instead</summary>

Some browsers restrict local storage on `file://` URLs. The app falls back to
in-memory storage automatically, but if you would rather avoid that:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.
</details>

### Demo logins

| Role | Email | Password |
|---|---|---|
| Student | `student@seacet.edu.in` | `student123` |
| Administrator | `admin@seacet.edu.in` | `admin123` |

Both are printed on their login pages so nothing has to be memorised during a
demonstration.

---

## Suggested demo order

1. **Home** — project introduction, two clearly separated entry points.
2. **Student Login** — try an empty submit to show validation, then sign in.
3. **Chatbot** — tap the suggested chips, then type a question of your own.
   Ask something unrelated (*"what is the wifi password"*) to show the
   graceful fallback.
4. **Logout**, then **Admin Login** — note that the admin entrance looks
   completely different.
5. **Admin Dashboard** — statistics and recent activity.
6. **Questions & Answers** — add a new question, e.g.
   *"Who is the principal of the college?"*
7. **Back to the student chatbot** — ask the question you just added. It
   answers. *This is the point worth making: the admin panel and the chatbot
   share one data source.*
8. **Faculty Details** — search, filter by department, switch to card view,
   edit and delete a record.

Use **Reset demo data** in the admin sidebar to restore the original dataset
before the next run-through.

---

## Screens

### Student side
| Page | File |
|---|---|
| Home | `index.html` |
| Student login | `student-login.html` |
| Chatbot dashboard | `student-chat.html` |

### Admin side
| Page | File |
|---|---|
| Administrator login | `admin-login.html` |
| Dashboard | `admin-dashboard.html` |
| Questions & Answers | `admin-questions.html` |
| Faculty Details | `admin-faculty.html` |

Student and admin code are kept separate throughout — separate pages, separate
stylesheets, separate controllers.

---

## Project structure

```
.
├── index.html                  Home
├── student-login.html
├── student-chat.html           Chatbot dashboard
├── admin-login.html
├── admin-dashboard.html
├── admin-questions.html        Q&A management (CRUD)
├── admin-faculty.html          Faculty management (CRUD)
│
└── assets/
    ├── css/
    │   ├── tokens.css          Colour, type, spacing, radius, shadow
    │   ├── base.css            Reset and layout primitives
    │   ├── components.css      Buttons, forms, tables, modals, toasts…
    │   ├── auth.css            Login page layout (shared by both roles)
    │   ├── student.css         Navigation, home page, chat interface
    │   └── admin.css           Sidebar, topbar, dashboard, admin tables
    │
    └── js/
        ├── mock-data.js        ★ Sample dataset — the stand-in database
        ├── store.js            ★ Data access layer — the backend seam
        ├── auth.js             Mock session handling
        ├── ui.js               Icons, toasts, modals, validation, formatting
        ├── site.js             Home page navigation
        ├── login.js            Shared login controller
        ├── chat.js             ★ Chat interface + the ML seam
        ├── admin-shell.js      Sidebar, profile menu, logout, demo reset
        ├── admin-dashboard.js
        ├── admin-questions.js
        └── admin-faculty.js
```

Built with plain HTML, CSS and JavaScript — no framework and no build tooling,
so the files map directly onto Flask/Django templates later and the project
runs anywhere without setup.

---

## How the sample data works

`assets/js/mock-data.js` holds the seed dataset: **28 questions** across six
categories and **18 faculty members** across seven departments.

On first load, `store.js` copies that seed into the browser's `localStorage`
and works from the copy. That is why adding a question in the admin panel makes
it appear in the dashboard counts, the activity feed **and** the chatbot's
answers, and why it survives a page refresh.

Because the seed lives in a file in this repository, **anyone who clones the
project gets the full dataset automatically** — nothing needs to be exported or
shared. The `localStorage` copy is only a working copy created on first open.

- **Reset demo data** (admin sidebar) rebuilds the copy from `mock-data.js`.
- To change what everyone sees after cloning, edit `mock-data.js`, not the
  browser.
- Records added at run time live only in that one browser, by design.

Renaming the college, the HOD or the faculty is a find-and-replace inside this
single file.

---

## Connecting the backend

The frontend was written so the real system replaces **two files** and nothing
else. Every page already calls these through Promises, which is the shape the
real, asynchronous backend will need — so no page code changes.

### 1. `assets/js/store.js` — the database seam

Every read and write in the application goes through `Store`. No page touches
`localStorage` or `mock-data.js` directly. Each method maps onto one operation
against MySQL:

```
Store.getQuestions()    →  SELECT * FROM questions …
Store.addQuestion()     →  INSERT INTO questions …
Store.updateQuestion()  →  UPDATE questions SET … WHERE id = ?
Store.deleteQuestion()  →  DELETE FROM questions WHERE id = ?
Store.getFaculty()      →  SELECT * FROM faculty …
Store.getStats()        →  SELECT COUNT(*) …
```

The objects already match the intended table columns:

| Table | Columns |
|---|---|
| `questions` | `id, question, answer, category, status, created_at, updated_at` |
| `faculty` | `id, name, department, designation, email, contact, photo, status, updated_at` |
| `admin` | `id, name, email` |
| `activity` | `id, action, entity, entity_id, actor, timestamp` |

### 2. `assets/js/chat.js` — the machine learning seam

The function `resolveAnswer()` decides which stored answer replies to a typed
question. In this prototype it is a **plain word count** against the question
bank — deliberately simple, clearly marked, and not a model. It does no
training, no probability estimation and no feature weighting.

In the real system, `resolveAnswer()` hands the question to the Python backend,
which performs the actual pipeline:

```
student's question
  → NLP preprocessing (tokenising, stopword removal, stemming)
  → TF-IDF feature extraction
  → Naive Bayes classification
  → matching answer retrieved from the MySQL `questions` table
  → answer returned to the chat interface
```

**No machine learning is implemented in JavaScript anywhere in this project.**
The NLP, TF-IDF and Naive Bayes work belongs in Python and is intentionally
absent here.

### 3. `assets/js/auth.js` — authentication

Credentials are currently compared against a demo pair in `mock-data.js` and
the session is a flag in `sessionStorage`. In the real system the Python
backend validates against the user table, and the client-side page guards
become server-side route protection. Passwords are never handled in the
browser in the final build.

---

## Putting it online

There are two different things you might mean by this, and they need
different hosts.

### The full application — a link people can actually test

Flask, MySQL, the trained model and the admin panel, all working. This is the
one to share and to put on a CV.

**→ [`deploy/DEPLOY.md`](deploy/DEPLOY.md)** — a step-by-step guide using
three free accounts: Render for the app, Aiven for MySQL, and a free scheduler
to keep it awake. No credit card, about 40 minutes.

### The static prototype — the frontend only

The pages in this folder run with no backend at all, so GitHub can host them
for free:

**Settings → Pages → Source: Deploy from a branch → `main` / `root` → Save**

After a minute the site is live at
`https://<username>.github.io/<repository>/`. Useful as a fallback if the
laptop misbehaves on presentation day, but the answers come from the seeded
browser data rather than the real Naive Bayes model — so it is not the version
to hand to someone evaluating the project.

---

## Notes

- Responsive from 360px upwards. The admin sidebar collapses to a drawer and
  the data tables become stacked cards on phones.
- Fonts load from Google Fonts with a full system-font fallback, so the design
  still holds up with no internet connection.
- Keyboard accessible: focus rings, `Escape` closes dialogs, the chat log is
  announced to screen readers.

---

*Frontend prototype · Department of Information Science & Engineering ·
SEA College of Engineering and Technology*
