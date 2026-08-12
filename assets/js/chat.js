/* ==========================================================================
   chat.js — Student chatbot interface
   --------------------------------------------------------------------------
   Two clearly separated responsibilities:

     1. The conversation UI  — bubbles, typing indicator, chips, composer.
        This part is final. It does not change when the backend arrives.

     2. resolveAnswer()      — decides which stored answer replies to a
        question. ★ THIS IS THE MACHINE LEARNING SEAM. ★

   For the prototype, resolveAnswer() does a plain keyword count against the
   question bank in the browser. It is deliberately simple and is NOT a model.
   In the real system this function hands the question to the Python backend,
   which performs the actual pipeline:

        raw question
          → NLP preprocessing (tokenise, stopword removal, stemming)
          → TF-IDF feature extraction
          → Naive Bayes classification
          → answer looked up in the MySQL `questions` table
          → answer returned here

   Nothing else in this file needs to change for that swap. No machine
   learning is implemented in JavaScript anywhere in this project.
   ========================================================================== */

(function () {
  "use strict";

  /* Redirect to the login page if there is no student session */
  const student = Auth.requireStudent();
  if (!student) return;

  const thread = document.getElementById("chatThread");
  const scroll = document.getElementById("chatScroll");
  const welcome = document.getElementById("chatWelcome");
  const form = document.getElementById("chatForm");
  const input = document.getElementById("chatInput");
  const sendBtn = document.getElementById("sendBtn");
  const chipRow = document.getElementById("chipRow");
  const suggest = document.getElementById("chatSuggest");
  const kbCount = document.getElementById("kbCount");

  let questionBank = [];
  let busy = false;

  /* ======================================================================
     Header — student profile area
     ====================================================================== */

  document.getElementById("studentName").textContent = student.name;
  document.getElementById("studentMeta").textContent =
    student.id + " · " + student.semester;
  document.getElementById("studentAvatar").textContent = UI.initials(student.name);

  document.getElementById("logoutBtn").addEventListener("click", function () {
    UI.confirm({
      title: "Log out of the chatbot?",
      message: "You will be returned to the student login page.",
      confirmLabel: "Log out",
      cancelLabel: "Stay signed in",
      danger: false,
    }).then(function (ok) {
      if (ok) Auth.logout("student-login.html");
    });
  });

  /* ======================================================================
     Rendering
     ====================================================================== */

  function now() {
    return UI.formatTime(new Date().toISOString());
  }

  function hideWelcome() {
    if (welcome && !welcome.classList.contains("hidden")) {
      welcome.classList.add("hidden");
    }
  }

  function scrollToEnd() {
    requestAnimationFrame(function () {
      scroll.scrollTop = scroll.scrollHeight;
    });
  }

  function addUserMessage(text) {
    const row = document.createElement("div");
    row.className = "msg msg-user";
    row.innerHTML =
      '<div class="msg-body">' +
        '<div class="bubble">' + UI.escapeHtml(text) + "</div>" +
        '<div class="msg-meta"><span>' + now() + "</span></div>" +
      "</div>";
    thread.appendChild(row);
    scrollToEnd();
  }

  function addBotMessage(text, category) {
    const row = document.createElement("div");
    row.className = "msg msg-bot";
    row.innerHTML =
      '<div class="msg-avatar">' + UI.icon("bot") + "</div>" +
      '<div class="msg-body">' +
        '<div class="bubble">' + UI.escapeHtml(text) + "</div>" +
        '<div class="msg-meta">' +
          "<span>" + now() + "</span>" +
          (category
            ? '<span class="msg-source">' + UI.icon("tag", 12) +
              UI.escapeHtml(category) + "</span>"
            : "") +
        "</div>" +
      "</div>";
    thread.appendChild(row);
    scrollToEnd();
  }

  function showTyping() {
    const row = document.createElement("div");
    row.className = "msg msg-bot";
    row.id = "typingRow";
    row.innerHTML =
      '<div class="msg-avatar">' + UI.icon("bot") + "</div>" +
      '<div class="msg-body">' +
        '<div class="typing" aria-label="The chatbot is typing">' +
          "<i></i><i></i><i></i>" +
        "</div>" +
      "</div>";
    thread.appendChild(row);
    scrollToEnd();
  }

  function hideTyping() {
    const row = document.getElementById("typingRow");
    if (row) row.remove();
  }

  /* ======================================================================
     ★ ANSWER RESOLUTION — replaced by the Python NLP pipeline ★
     ====================================================================== */

  const STOPWORDS = [
    "a","an","the","is","are","was","were","am","be","been","of","in","on",
    "at","to","for","from","by","with","about","and","or","but","if","this",
    "that","these","those","it","its","i","me","my","we","our","you","your",
    "he","she","they","them","do","does","did","can","could","will","would",
    "shall","should","may","might","must","have","has","had","what","when",
    "where","who","whom","which","how","why","please","tell","give","know",
    "want","need","get","there","here","any","all","some","also","much","many",
  ];

  function tokenize(text) {
    return String(text)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(function (word) {
        return word.length > 1 && STOPWORDS.indexOf(word) === -1;
      });
  }

  /* Small talk handled before the question bank is consulted */
  const SMALL_TALK = [
    {
      match: ["hi", "hello", "hey", "hii", "namaste", "greetings"],
      reply:
        "Hello! I am the college enquiry assistant. You can ask me about departments, faculty, class timings, facilities or contact details.",
    },
    {
      match: ["thanks", "thank", "thankyou", "ty"],
      reply: "You are welcome. Feel free to ask anything else about the college.",
    },
    {
      match: ["bye", "goodbye", "ok", "okay"],
      reply: "Glad to help. You can come back any time you have a question.",
    },
    {
      match: ["help", "options", "menu"],
      reply:
        "I can answer questions in six areas: Departments, Faculty, Timetable, College Information, Contact Information and Facilities. Try one of the suggested questions below.",
    },
  ];

  function smallTalkReply(text) {
    const words = String(text).toLowerCase().replace(/[^a-z\s]/g, "").trim().split(/\s+/);
    if (words.length > 3) return null; /* a real question, not a greeting */
    for (let i = 0; i < SMALL_TALK.length; i++) {
      for (let j = 0; j < words.length; j++) {
        if (SMALL_TALK[i].match.indexOf(words[j]) !== -1) {
          return SMALL_TALK[i].reply;
        }
      }
    }
    return null;
  }

  /* Two words count as the same if they are identical, or if they share their
     first four letters — enough to tie "timing"/"timings" and "located"/
     "location" together without a real stemmer. */
  function similar(a, b) {
    if (a === b) return true;
    if (a.length < 4 || b.length < 4) return false;
    return a.slice(0, 4) === b.slice(0, 4);
  }

  function countHits(asked, stored, covered) {
    let hits = 0;
    asked.forEach(function (word) {
      for (let i = 0; i < stored.length; i++) {
        if (similar(word, stored[i])) {
          hits++;
          if (covered) covered[word] = true;
          return;
        }
      }
    });
    return hits;
  }

  /*
   * MOCK ONLY — picks the stored record that shares the most words with what
   * the student typed. Records are ranked first by how many *different* words
   * they account for, then by a weighted count where a word found in the
   * stored question or its category counts double and a word found only in
   * the answer text counts once.
   *
   * This is a placeholder so the interface can be demonstrated. It performs no
   * learning, no training, no probability estimation and no feature weighting
   * — it is a word count and nothing more. The real matching is done by
   * TF-IDF + Naive Bayes in the Python backend, and this function is the
   * single place that gets rewired.
   */
  function resolveAnswer(text) {
    const asked = tokenize(text);
    if (!asked.length) return null;

    let best = null;
    let bestCovered = 0;
    let bestScore = 0;

    questionBank.forEach(function (row) {
      const covered = {};
      const titleHits = countHits(
        asked, tokenize(row.question + " " + row.category), covered
      );
      const answerHits = countHits(asked, tokenize(row.answer), covered);

      /* A record is only a candidate if the question itself was recognised.
         Without this, a stray word in a long answer could win. */
      if (!titleHits) return;

      const distinct = Object.keys(covered).length;
      const score = titleHits * 2 + answerHits;

      if (distinct > bestCovered || (distinct === bestCovered && score > bestScore)) {
        bestCovered = distinct;
        bestScore = score;
        best = row;
      }
    });

    /* A one-word question only has to match one word, but anything longer must
       match at least two — otherwise unrelated questions fall through to the
       "not in the knowledge base" reply instead of returning something that
       merely shares a single common word. */
    const needed = Math.min(2, asked.length);
    return bestCovered >= needed ? best : null;
  }

  const FALLBACK =
    "I could not find that in my knowledge base yet. I can currently answer questions about departments, faculty, class timings, college information, contact details and campus facilities. Try rephrasing your question, or contact the college office at +91 80 2321 4500.";

  /* ======================================================================
     Send flow
     ====================================================================== */

  function ask(text) {
    const question = String(text).trim();
    if (!question || busy) return;

    busy = true;
    hideWelcome();
    addUserMessage(question);
    input.value = "";
    autoGrow();
    updateSendState();
    removeChip(question);

    showTyping();

    /* The delay stands in for the backend round trip. */
    setTimeout(function () {
      hideTyping();

      const chit = smallTalkReply(question);
      if (chit) {
        addBotMessage(chit, null);
      } else {
        const match = resolveAnswer(question);
        if (match) {
          addBotMessage(match.answer, match.category);
        } else {
          addBotMessage(FALLBACK, null);
        }
      }

      busy = false;
      input.focus();
    }, 900);
  }

  /* ======================================================================
     Composer
     ====================================================================== */

  function autoGrow() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 132) + "px";
  }

  function updateSendState() {
    sendBtn.disabled = !input.value.trim();
  }

  input.addEventListener("input", function () {
    autoGrow();
    updateSendState();
  });

  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      ask(input.value);
    }
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    ask(input.value);
  });

  /* ======================================================================
     Suggested question chips
     ====================================================================== */

  const SUGGESTIONS = [
    "Who is the HOD of the ISE department?",
    "What are the college timings?",
    "Who are the faculty members in ISE?",
    "Where is the ISE department located?",
    "What are the contact details of the college?",
    "What are the library timings?",
  ];

  function renderChips() {
    chipRow.innerHTML = SUGGESTIONS.map(function (text) {
      return (
        '<button class="chip" type="button" data-question="' +
        UI.escapeHtml(text) + '">' +
        UI.icon("messageSquare", 13) +
        UI.escapeHtml(text) +
        "</button>"
      );
    }).join("");
  }

  function removeChip(text) {
    Array.prototype.slice.call(chipRow.children).forEach(function (chip) {
      if (chip.dataset.question === text) chip.remove();
    });
    if (!chipRow.children.length) suggest.classList.add("hidden");
  }

  chipRow.addEventListener("click", function (event) {
    const chip = event.target.closest(".chip");
    if (chip) ask(chip.dataset.question);
  });

  /* ======================================================================
     Boot
     ====================================================================== */

  renderChips();
  updateSendState();

  /* Load the active question bank. Deactivating a question in the admin
     panel removes it from the chatbot immediately. */
  Store.getActiveQuestions().then(function (rows) {
    questionBank = rows;
    kbCount.textContent = rows.length + " questions in the knowledge base";

    setTimeout(function () {
      addBotMessage(
        "Namaskara " + student.name.split(" ")[0] +
          "! I am the Vidyaranya Institute enquiry assistant. Ask me about the " +
          "departments, faculty, class timings, campus facilities or contact " +
          "details of the college.",
        null
      );
      input.focus();
    }, 400);
  });
})();
