/* ==========================================================================
   server-chat.js — the chat interface when Flask is serving the pages
   --------------------------------------------------------------------------
   This is the same conversation UI as the prototype, with one difference that
   matters: the answer no longer comes from JavaScript.

   The typed question is posted to /student/ask, and the Python backend runs
   the real pipeline before replying:

       question
         -> NLP preprocessing (tokenise, stopword removal, Porter stemming)
         -> TF-IDF vectorisation
         -> Naive Bayes  -> category
         -> cosine similarity -> closest stored question
         -> answer read from the MySQL questions table

   Nothing about matching or answering happens in this file. It sends the
   question, shows the typing indicator while the backend thinks, and renders
   whatever comes back.
   ========================================================================== */

(function () {
  "use strict";

  const thread = document.getElementById("chatThread");
  const scroll = document.getElementById("chatScroll");
  const welcome = document.getElementById("chatWelcome");
  const form = document.getElementById("chatForm");
  const input = document.getElementById("chatInput");
  const sendBtn = document.getElementById("sendBtn");
  const chipRow = document.getElementById("chipRow");
  const suggest = document.getElementById("chatSuggest");

  let busy = false;

  /* ======================================================== rendering */

  function now() {
    return UI.formatTime(new Date().toISOString());
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
        '<div class="typing" aria-label="The chatbot is thinking">' +
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

  /* ========================================================== asking */

  function ask(text) {
    const question = String(text || "").trim();
    if (!question || busy) return;

    busy = true;
    if (welcome) welcome.classList.add("hidden");
    addUserMessage(question);
    input.value = "";
    autoGrow();
    updateSendState();
    removeChip(question);
    showTyping();

    fetch("/student/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: question }),
    })
      .then(function (response) {
        if (response.status === 401 || response.redirected) {
          window.location.href = "/student/login";
          throw new Error("session expired");
        }
        if (!response.ok) throw new Error("server returned " + response.status);
        return response.json();
      })
      .then(function (result) {
        hideTyping();
        addBotMessage(result.answer, result.category);
      })
      .catch(function (error) {
        hideTyping();
        if (error.message === "session expired") return;
        addBotMessage(
          "I could not reach the college server just now. Please check that " +
          "the application is running and try again.",
          null
        );
        console.error("[chat]", error);
      })
      .finally(function () {
        busy = false;
        input.focus();
      });
  }

  /* ======================================================= composer */

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

  /* ========================================================== chips */

  function removeChip(text) {
    Array.prototype.slice.call(chipRow.children).forEach(function (chip) {
      if (chip.dataset.question === text) chip.remove();
    });
    if (!chipRow.children.length && suggest) suggest.classList.add("hidden");
  }

  chipRow.addEventListener("click", function (event) {
    const chip = event.target.closest(".chip");
    if (chip) ask(chip.dataset.question);
  });

  /* ----------------------------------------------------------- boot */

  /* Give the chips their icon, matching the prototype's styling */
  Array.prototype.slice.call(chipRow.children).forEach(function (chip) {
    chip.insertAdjacentHTML("afterbegin", UI.icon("messageSquare", 13));
  });

  updateSendState();
  input.focus();
})();
