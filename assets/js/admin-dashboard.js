/* ==========================================================================
   admin-dashboard.js — Admin dashboard home
   Summary cards, recently added questions, recently updated faculty and the
   recent administrative activity feed. All figures come from Store, so they
   reflect anything added or edited elsewhere in the panel.
   ========================================================================== */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {

    /* ==================================================== summary cards */

    function setKpi(key, value, sub) {
      const el = document.querySelector('[data-kpi="' + key + '"]');
      const subEl = document.querySelector('[data-kpi-sub="' + key + '"]');
      if (el) {
        el.classList.remove("skel", "skel-line", "w-40");
        el.removeAttribute("style");
        el.textContent = value;
      }
      if (subEl) subEl.textContent = sub;
    }

    Store.getStats().then(function (stats) {
      setKpi(
        "questions",
        stats.totalQuestions,
        stats.activeQuestions + " active in the chatbot"
      );
      setKpi(
        "answers",
        stats.totalAnswers,
        "across " + stats.categories.length + " categories"
      );
      setKpi(
        "faculty",
        stats.totalFaculty,
        stats.activeFaculty + " currently active"
      );
      setKpi("updated", stats.recentlyUpdated, "records in the last 30 days");
    });

    /* ========================================= recently added questions */

    Store.getRecentQuestions(5).then(function (rows) {
      const box = document.getElementById("recentQuestions");

      if (!rows.length) {
        box.innerHTML =
          '<div class="empty">' +
            '<div class="empty-icon">' + UI.icon("inbox") + "</div>" +
            "<h4>No questions yet</h4>" +
            "<p>Add the first question and answer so the chatbot has something to reply with.</p>" +
            '<a class="btn btn-primary btn-sm" href="admin-questions.html">' +
              UI.icon("plus") + " Add question</a>" +
          "</div>";
        return;
      }

      box.innerHTML = rows
        .map(function (row) {
          return (
            '<div class="mini-item">' +
              '<div class="mi-body">' +
                '<div class="mi-title">' + UI.escapeHtml(row.question) + "</div>" +
                '<div class="mi-meta">' +
                  '<span class="pill">' + UI.escapeHtml(row.category) + "</span>" +
                  "<span>Added " + UI.formatDate(row.created_at) + "</span>" +
                "</div>" +
              "</div>" +
              '<span class="badge badge-' +
                (row.status === "Active" ? "active" : "inactive") + '">' +
                UI.escapeHtml(row.status) +
              "</span>" +
            "</div>"
          );
        })
        .join("");
    });

    /* ======================================= recently updated faculty */

    Store.getRecentFaculty(5).then(function (rows) {
      const box = document.getElementById("recentFaculty");

      if (!rows.length) {
        box.innerHTML =
          '<div class="empty">' +
            '<div class="empty-icon">' + UI.icon("users") + "</div>" +
            "<h4>No faculty records</h4>" +
            "<p>Add faculty members so the chatbot can answer questions about the departments.</p>" +
            '<a class="btn btn-primary btn-sm" href="admin-faculty.html">' +
              UI.icon("plus") + " Add faculty</a>" +
          "</div>";
        return;
      }

      box.innerHTML = rows
        .map(function (row) {
          return (
            '<div class="mini-item">' +
              '<span class="avatar" style="' + UI.avatarStyle(row.name) + '">' +
                UI.escapeHtml(UI.initials(row.name)) +
              "</span>" +
              '<div class="mi-body">' +
                '<div class="mi-title">' + UI.escapeHtml(row.name) + "</div>" +
                '<div class="mi-meta">' +
                  "<span>" + UI.escapeHtml(row.designation) + "</span>" +
                  "<span>·</span>" +
                  "<span>" + UI.escapeHtml(row.department) + "</span>" +
                "</div>" +
              "</div>" +
              '<span class="text-sm text-muted">' +
                UI.formatDate(row.updated_at) +
              "</span>" +
            "</div>"
          );
        })
        .join("");
    });

    /* ========================================== recent admin activity */

    const VERB = {
      added: "added",
      updated: "updated",
      deleted: "deleted",
    };

    const ACT_ICON = {
      added: "plus",
      updated: "edit",
      deleted: "trash",
    };

    Store.getActivity(7).then(function (rows) {
      const box = document.getElementById("recentActivity");

      if (!rows.length) {
        box.innerHTML =
          '<div class="empty" style="padding:var(--sp-10) var(--sp-4)">' +
            '<div class="empty-icon">' + UI.icon("clock") + "</div>" +
            "<h4>No activity yet</h4>" +
            "<p>Changes made in the admin panel will be listed here.</p>" +
          "</div>";
        return;
      }

      box.innerHTML = rows
        .map(function (row) {
          const what = row.entity === "faculty" ? "faculty record" : "question";
          return (
            '<div class="tl-item">' +
              '<span class="tl-dot act-' + UI.escapeHtml(row.action) + '">' +
                UI.icon(ACT_ICON[row.action] || "edit") +
              "</span>" +
              '<div class="tl-body">' +
                '<div class="tl-text">' +
                  "<b>" + UI.escapeHtml(row.actor) + "</b> " +
                  UI.escapeHtml(VERB[row.action] || row.action) + " a " + what +
                  " — " + UI.escapeHtml(row.label) +
                "</div>" +
                '<div class="tl-time">' + UI.relativeTime(row.timestamp) + "</div>" +
              "</div>" +
            "</div>"
          );
        })
        .join("");
    });
  });
})();
