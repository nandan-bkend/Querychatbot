/* ==========================================================================
   admin-questions.js — Questions & Answers management
   View · Search · Filter · Sort · Add · Edit · Delete
   Every operation goes through Store, which is the layer that will later
   talk to the Python backend and the MySQL `questions` table.
   ========================================================================== */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {

    const tableWrap = document.getElementById("tableWrap");
    const tableBody = document.getElementById("tableBody");
    const stateBox = document.getElementById("stateBox");
    const resultCount = document.getElementById("resultCount");

    const searchInput = document.getElementById("searchInput");
    const categoryFilter = document.getElementById("categoryFilter");
    const statusFilter = document.getElementById("statusFilter");
    const clearFilters = document.getElementById("clearFilters");

    const modal = document.getElementById("questionModal");
    const modalTitle = document.getElementById("questionModalTitle");
    const modalSub = document.getElementById("questionModalSub");
    const form = document.getElementById("questionForm");
    const saveBtn = document.getElementById("saveBtn");

    const idField = document.getElementById("questionId");
    const questionText = document.getElementById("questionText");
    const answerText = document.getElementById("answerText");
    const categorySelect = document.getElementById("categorySelect");
    const statusSelect = document.getElementById("statusSelect");

    let sortKey = "created_at";
    let sortDir = "desc";

    /* ================================================== filter options */

    MOCK_DATA.categories.forEach(function (category) {
      categoryFilter.insertAdjacentHTML(
        "beforeend",
        '<option value="' + UI.escapeHtml(category) + '">' +
          UI.escapeHtml(category) + "</option>"
      );
      categorySelect.insertAdjacentHTML(
        "beforeend",
        '<option value="' + UI.escapeHtml(category) + '">' +
          UI.escapeHtml(category) + "</option>"
      );
    });

    UI.bindValidation(form);

    /* ========================================================= loading */

    function showSkeleton() {
      tableWrap.classList.add("hidden");
      stateBox.innerHTML =
        '<div class="skel-row"><div class="grow"><div class="skel skel-line w-80"></div><div class="skel skel-line w-40"></div></div></div>' +
        '<div class="skel-row"><div class="grow"><div class="skel skel-line w-60"></div><div class="skel skel-line w-80"></div></div></div>' +
        '<div class="skel-row"><div class="grow"><div class="skel skel-line w-80"></div><div class="skel skel-line w-40"></div></div></div>' +
        '<div class="skel-row"><div class="grow"><div class="skel skel-line w-40"></div><div class="skel skel-line w-60"></div></div></div>';
      resultCount.textContent = "Loading…";
    }

    /* ========================================================= render */

    function isFiltered() {
      return (
        searchInput.value.trim() !== "" ||
        categoryFilter.value !== "all" ||
        statusFilter.value !== "all"
      );
    }

    function renderEmpty() {
      tableWrap.classList.add("hidden");

      if (isFiltered()) {
        stateBox.innerHTML =
          '<div class="empty">' +
            '<div class="empty-icon">' + UI.icon("search") + "</div>" +
            "<h4>No matching questions</h4>" +
            "<p>Nothing matches the current search and filters. Try a different term or clear the filters.</p>" +
            '<button class="btn btn-outline btn-sm" type="button" id="emptyClear">Clear filters</button>' +
          "</div>";
        const btn = document.getElementById("emptyClear");
        if (btn) btn.addEventListener("click", resetFilters);
      } else {
        stateBox.innerHTML =
          '<div class="empty">' +
            '<div class="empty-icon">' + UI.icon("inbox") + "</div>" +
            "<h4>The question bank is empty</h4>" +
            "<p>Add the first question and answer so the chatbot has something to reply with.</p>" +
            '<button class="btn btn-primary btn-sm" type="button" id="emptyAdd">' +
              UI.icon("plus") + " Add Question</button>" +
          "</div>";
        const btn = document.getElementById("emptyAdd");
        if (btn) btn.addEventListener("click", function () { openForm(null); });
      }
    }

    function render() {
      showSkeleton();

      Store.getQuestions({
        search: searchInput.value,
        category: categoryFilter.value,
        status: statusFilter.value,
        sort: sortKey,
        dir: sortDir,
      }).then(function (rows) {
        stateBox.innerHTML = "";

        if (!rows.length) {
          renderEmpty();
          resultCount.textContent = "No questions to show";
          return;
        }

        tableWrap.classList.remove("hidden");
        tableBody.innerHTML = rows
          .map(function (row) {
            return (
              "<tr>" +
                '<td data-label="Question" class="q-cell">' +
                  '<div class="qt">' + UI.escapeHtml(row.question) + "</div>" +
                  '<div class="qid">' + UI.escapeHtml(row.id) + "</div>" +
                "</td>" +
                '<td data-label="Answer" class="a-cell">' +
                  '<div class="clamp-2">' + UI.escapeHtml(row.answer) + "</div>" +
                "</td>" +
                '<td data-label="Category">' +
                  '<span class="pill">' + UI.escapeHtml(row.category) + "</span>" +
                "</td>" +
                '<td data-label="Date Added" class="text-sm nowrap">' +
                  UI.formatDate(row.created_at) +
                "</td>" +
                '<td data-label="Status">' +
                  '<span class="badge badge-' +
                    (row.status === "Active" ? "active" : "inactive") + '">' +
                    UI.escapeHtml(row.status) +
                  "</span>" +
                "</td>" +
                '<td class="col-actions">' +
                  '<div class="row-actions">' +
                    '<button class="btn-icon" type="button" data-edit="' +
                      UI.escapeHtml(row.id) + '" aria-label="Edit question" title="Edit">' +
                      UI.icon("edit") +
                    "</button>" +
                    '<button class="btn-icon is-danger" type="button" data-delete="' +
                      UI.escapeHtml(row.id) + '" aria-label="Delete question" title="Delete">' +
                      UI.icon("trash") +
                    "</button>" +
                  "</div>" +
                "</td>" +
              "</tr>"
            );
          })
          .join("");

        resultCount.textContent =
          "Showing " + rows.length +
          (rows.length === 1 ? " question" : " questions") +
          (isFiltered() ? " matching the current filters" : "");
      });
    }

    /* ======================================================== filters */

    searchInput.addEventListener("input", UI.debounce(render, 260));
    categoryFilter.addEventListener("change", render);
    statusFilter.addEventListener("change", render);

    function resetFilters() {
      searchInput.value = "";
      categoryFilter.value = "all";
      statusFilter.value = "all";
      render();
    }

    clearFilters.addEventListener("click", resetFilters);

    /* ========================================================= sorting */

    document.querySelectorAll(".th-sort").forEach(function (th) {
      th.addEventListener("click", function () {
        const key = th.dataset.sort;
        if (sortKey === key) {
          sortDir = sortDir === "asc" ? "desc" : "asc";
        } else {
          sortKey = key;
          sortDir = "asc";
        }

        document.querySelectorAll(".th-sort").forEach(function (other) {
          other.setAttribute("aria-sort", "none");
        });
        th.setAttribute("aria-sort", sortDir === "asc" ? "ascending" : "descending");
        th.querySelector(".sort-ind").textContent = sortDir === "asc" ? "↑" : "↓";

        render();
      });
    });

    /* ==================================================== add / edit */

    function openForm(row) {
      form.querySelectorAll(".field").forEach(function (field) {
        field.classList.remove("is-invalid");
      });

      if (row) {
        modalTitle.textContent = "Edit Question";
        modalSub.textContent = "Editing " + row.id + " — changes apply to the chatbot immediately.";
        idField.value = row.id;
        questionText.value = row.question;
        answerText.value = row.answer;
        categorySelect.value = row.category;
        statusSelect.value = row.status;
        saveBtn.textContent = "Save changes";
      } else {
        modalTitle.textContent = "Add Question";
        modalSub.textContent = "This question becomes answerable by the chatbot.";
        form.reset();
        idField.value = "";
        categorySelect.value = MOCK_DATA.categories[0];
        statusSelect.value = "Active";
        saveBtn.textContent = "Save question";
      }

      UI.openModal(modal);
    }

    document.getElementById("addBtn").addEventListener("click", function () {
      openForm(null);
    });

    /* Row action buttons are delegated, since rows are re-rendered often */
    tableBody.addEventListener("click", function (event) {
      const editBtn = event.target.closest("[data-edit]");
      if (editBtn) {
        Store.getQuestion(editBtn.dataset.edit).then(function (row) {
          if (row) openForm(row);
        });
        return;
      }

      const deleteBtn = event.target.closest("[data-delete]");
      if (deleteBtn) {
        const id = deleteBtn.dataset.delete;
        Store.getQuestion(id).then(function (row) {
          if (!row) return;
          UI.confirm({
            title: "Delete this question?",
            message:
              '"' + row.question +
              '" will be permanently removed and the chatbot will no longer be able to answer it.',
            confirmLabel: "Delete question",
          }).then(function (ok) {
            if (!ok) return;
            Store.deleteQuestion(id)
              .then(function () {
                UI.toast("Question deleted successfully.", "success");
                render();
              })
              .catch(function (error) {
                UI.toast(error.message, "error");
              });
          });
        });
      }
    });

    /* ============================================================ save */

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!UI.validateForm(form)) return;

      const payload = {
        question: questionText.value,
        answer: answerText.value,
        category: categorySelect.value,
        status: statusSelect.value,
      };

      const id = idField.value;
      UI.busy(saveBtn, true);

      const request = id
        ? Store.updateQuestion(id, payload)
        : Store.addQuestion(payload);

      request
        .then(function () {
          UI.busy(saveBtn, false);
          UI.closeModal(modal);
          UI.toast(
            id ? "Question updated successfully." : "Question added successfully.",
            "success"
          );
          render();
        })
        .catch(function (error) {
          UI.busy(saveBtn, false);
          UI.toast(error.message, "error");
        });
    });

    /* ============================================================ boot */

    render();
  });
})();
