/* ==========================================================================
   store.js — Data access layer
   --------------------------------------------------------------------------
   ★ THIS IS THE SINGLE POINT WHERE THE BACKEND GETS CONNECTED. ★

   Every screen in this application reads and writes through Store. No page
   touches localStorage or mock-data.js directly. That means the migration to
   the real system is confined to this one file:

       today  →  Store.getQuestions()  reads from browser localStorage
       later  →  Store.getQuestions()  asks the Python backend, which queries
                                       the MySQL `questions` table

   Every method already returns a Promise, so the pages are written in the
   asynchronous style the real backend will require. When the backend is
   wired up, the page code does not change at all — only the bodies below.

   The chatbot's answer selection is NOT here. It lives in chat.js, which is
   the seam for the NLP + TF-IDF + Naive Bayes pipeline.
   ========================================================================== */

window.Store = (function () {
  "use strict";

  const KEYS = {
    questions: "viet.questions",
    faculty: "viet.faculty",
    activity: "viet.activity",
    seeded: "viet.seeded",
  };

  /* Simulated round-trip time so loading states are visible during the demo.
     Set both to 0 to make the prototype instant. */
  const READ_DELAY = 260;
  const WRITE_DELAY = 420;

  /* ---------------------------------------------------------------- utils */

  function later(value, ms) {
    return new Promise((resolve) => setTimeout(() => resolve(value), ms));
  }

  /* Some browsers block localStorage in private mode, or when the pages are
     opened straight off the disk with file://. Rather than letting the demo
     break, fall back to an in-memory store for the life of the tab. */
  const memory = {};
  let usingMemory = false;

  (function detectStorage() {
    try {
      const probe = "viet.probe";
      localStorage.setItem(probe, "1");
      localStorage.removeItem(probe);
    } catch (err) {
      usingMemory = true;
      console.warn(
        "[Store] localStorage is unavailable, using in-memory storage. " +
          "Records will reset when this tab is closed."
      );
    }
  })();

  function read(key, fallback) {
    if (usingMemory) {
      return Object.prototype.hasOwnProperty.call(memory, key)
        ? memory[key]
        : fallback;
    }
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      console.warn("[Store] could not read " + key, err);
      return fallback;
    }
  }

  function write(key, value) {
    if (usingMemory) {
      memory[key] = value;
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn("[Store] could not write " + key, err);
    }
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function nextId(rows, prefix) {
    let max = 0;
    rows.forEach((row) => {
      const n = parseInt(String(row.id).replace(/\D/g, ""), 10);
      if (!isNaN(n) && n > max) max = n;
    });
    return prefix + String(max + 1).padStart(3, "0");
  }

  /* ------------------------------------------------------------ seeding */

  function seed(force) {
    if (!window.MOCK_DATA) {
      console.error("[Store] mock-data.js must be loaded before store.js");
      return;
    }
    if (force || !read(KEYS.seeded, null)) {
      write(KEYS.questions, clone(window.MOCK_DATA.questions));
      write(KEYS.faculty, clone(window.MOCK_DATA.faculty));
      write(KEYS.activity, clone(window.MOCK_DATA.activity));
      write(KEYS.seeded, 1);
    }
  }

  function init() {
    seed(false);
  }

  function reset() {
    seed(true);
  }

  /* ----------------------------------------------------------- activity */

  function logActivity(action, entity, entityId, label) {
    const rows = read(KEYS.activity, []);
    rows.unshift({
      id: nextId(rows, "A"),
      action: action,
      entity: entity,
      entity_id: entityId,
      label: label,
      actor: window.MOCK_DATA.admin.name,
      timestamp: new Date().toISOString().slice(0, 19),
    });
    write(KEYS.activity, rows.slice(0, 60));
  }

  /* =====================================================================
     QUESTIONS  →  MySQL table `questions`
     ===================================================================== */

  function getQuestions(opts) {
    const o = opts || {};
    let rows = read(KEYS.questions, []);

    if (o.search) {
      const q = o.search.toLowerCase().trim();
      rows = rows.filter(
        (r) =>
          r.question.toLowerCase().includes(q) ||
          r.answer.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q)
      );
    }
    if (o.category && o.category !== "all") {
      rows = rows.filter((r) => r.category === o.category);
    }
    if (o.status && o.status !== "all") {
      rows = rows.filter((r) => r.status === o.status);
    }

    const dir = o.dir === "desc" ? -1 : 1;
    const key = o.sort || "id";
    rows.sort((a, b) => {
      const av = String(a[key] || "").toLowerCase();
      const bv = String(b[key] || "").toLowerCase();
      return av < bv ? -dir : av > bv ? dir : 0;
    });

    return later(rows, READ_DELAY);
  }

  /* Active questions only — this is what the chatbot is allowed to answer
     from. Deactivating a question in the admin panel immediately removes it
     from the chatbot's knowledge. */
  function getActiveQuestions() {
    const rows = read(KEYS.questions, []).filter((r) => r.status === "Active");
    return later(rows, 0);
  }

  function getQuestion(id) {
    const row = read(KEYS.questions, []).find((r) => r.id === id) || null;
    return later(row, 0);
  }

  function addQuestion(data) {
    const rows = read(KEYS.questions, []);
    const row = {
      id: nextId(rows, "Q"),
      question: data.question.trim(),
      answer: data.answer.trim(),
      category: data.category,
      status: data.status,
      created_at: today(),
      updated_at: today(),
    };
    rows.push(row);
    write(KEYS.questions, rows);
    logActivity("added", "question", row.id, row.question);
    return later(row, WRITE_DELAY);
  }

  function updateQuestion(id, data) {
    const rows = read(KEYS.questions, []);
    const i = rows.findIndex((r) => r.id === id);
    if (i === -1) return Promise.reject(new Error("Question not found"));

    rows[i] = Object.assign({}, rows[i], {
      question: data.question.trim(),
      answer: data.answer.trim(),
      category: data.category,
      status: data.status,
      updated_at: today(),
    });
    write(KEYS.questions, rows);
    logActivity("updated", "question", id, rows[i].question);
    return later(rows[i], WRITE_DELAY);
  }

  function deleteQuestion(id) {
    const rows = read(KEYS.questions, []);
    const row = rows.find((r) => r.id === id);
    if (!row) return Promise.reject(new Error("Question not found"));

    write(
      KEYS.questions,
      rows.filter((r) => r.id !== id)
    );
    logActivity("deleted", "question", id, row.question);
    return later(true, WRITE_DELAY);
  }

  /* =====================================================================
     FACULTY  →  MySQL table `faculty`
     ===================================================================== */

  function getFaculty(opts) {
    const o = opts || {};
    let rows = read(KEYS.faculty, []);

    if (o.search) {
      const q = o.search.toLowerCase().trim();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.designation.toLowerCase().includes(q) ||
          r.department.toLowerCase().includes(q)
      );
    }
    if (o.department && o.department !== "all") {
      rows = rows.filter((r) => r.department === o.department);
    }
    if (o.status && o.status !== "all") {
      rows = rows.filter((r) => r.status === o.status);
    }

    const dir = o.dir === "desc" ? -1 : 1;
    const key = o.sort || "id";
    rows.sort((a, b) => {
      const av = String(a[key] || "").toLowerCase();
      const bv = String(b[key] || "").toLowerCase();
      return av < bv ? -dir : av > bv ? dir : 0;
    });

    return later(rows, READ_DELAY);
  }

  function getFacultyById(id) {
    const row = read(KEYS.faculty, []).find((r) => r.id === id) || null;
    return later(row, 0);
  }

  function addFaculty(data) {
    const rows = read(KEYS.faculty, []);
    const row = {
      id: nextId(rows, "F"),
      name: data.name.trim(),
      department: data.department,
      designation: data.designation,
      email: data.email.trim(),
      contact: data.contact.trim(),
      photo: data.photo || "",
      status: data.status,
      updated_at: today(),
    };
    rows.push(row);
    write(KEYS.faculty, rows);
    logActivity("added", "faculty", row.id, row.name);
    return later(row, WRITE_DELAY);
  }

  function updateFaculty(id, data) {
    const rows = read(KEYS.faculty, []);
    const i = rows.findIndex((r) => r.id === id);
    if (i === -1) return Promise.reject(new Error("Faculty member not found"));

    rows[i] = Object.assign({}, rows[i], {
      name: data.name.trim(),
      department: data.department,
      designation: data.designation,
      email: data.email.trim(),
      contact: data.contact.trim(),
      photo: data.photo || rows[i].photo || "",
      status: data.status,
      updated_at: today(),
    });
    write(KEYS.faculty, rows);
    logActivity("updated", "faculty", id, rows[i].name);
    return later(rows[i], WRITE_DELAY);
  }

  function deleteFaculty(id) {
    const rows = read(KEYS.faculty, []);
    const row = rows.find((r) => r.id === id);
    if (!row) return Promise.reject(new Error("Faculty member not found"));

    write(
      KEYS.faculty,
      rows.filter((r) => r.id !== id)
    );
    logActivity("deleted", "faculty", id, row.name);
    return later(true, WRITE_DELAY);
  }

  /* =====================================================================
     DASHBOARD AGGREGATES
     Later these become a single SELECT COUNT(*) query per card.
     ===================================================================== */

  function getStats() {
    const questions = read(KEYS.questions, []);
    const faculty = read(KEYS.faculty, []);

    /* "Recently updated" = records touched in the last 30 days */
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const isRecent = (d) => new Date(d) >= cutoff;

    return later(
      {
        totalQuestions: questions.length,
        totalAnswers: questions.filter((q) => q.answer && q.answer.trim()).length,
        activeQuestions: questions.filter((q) => q.status === "Active").length,
        totalFaculty: faculty.length,
        activeFaculty: faculty.filter((f) => f.status === "Active").length,
        recentlyUpdated:
          questions.filter((q) => isRecent(q.updated_at)).length +
          faculty.filter((f) => isRecent(f.updated_at)).length,
        categories: window.MOCK_DATA.categories.map((c) => ({
          name: c,
          count: questions.filter((q) => q.category === c).length,
        })),
      },
      READ_DELAY
    );
  }

  function getRecentQuestions(limit) {
    const rows = read(KEYS.questions, [])
      .slice()
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, limit || 5);
    return later(rows, READ_DELAY);
  }

  function getRecentFaculty(limit) {
    const rows = read(KEYS.faculty, [])
      .slice()
      .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
      .slice(0, limit || 5);
    return later(rows, READ_DELAY);
  }

  function getActivity(limit) {
    const rows = read(KEYS.activity, [])
      .slice()
      .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
      .slice(0, limit || 8);
    return later(rows, READ_DELAY);
  }

  /* ------------------------------------------------------------- public */

  return {
    init: init,
    reset: reset,

    getQuestions: getQuestions,
    getActiveQuestions: getActiveQuestions,
    getQuestion: getQuestion,
    addQuestion: addQuestion,
    updateQuestion: updateQuestion,
    deleteQuestion: deleteQuestion,

    getFaculty: getFaculty,
    getFacultyById: getFacultyById,
    addFaculty: addFaculty,
    updateFaculty: updateFaculty,
    deleteFaculty: deleteFaculty,

    getStats: getStats,
    getRecentQuestions: getRecentQuestions,
    getRecentFaculty: getRecentFaculty,
    getActivity: getActivity,
  };
})();

window.Store.init();
