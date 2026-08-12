/* ==========================================================================
   admin-faculty.js — Faculty details management
   Table or card layout · Search · Department filter · Add · Edit · Delete
   Every operation goes through Store, which is the layer that will later
   talk to the Python backend and the MySQL `faculty` table.
   ========================================================================== */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {

    const tableWrap = document.getElementById("tableWrap");
    const tableBody = document.getElementById("tableBody");
    const cardGrid = document.getElementById("cardGrid");
    const stateBox = document.getElementById("stateBox");
    const resultCount = document.getElementById("resultCount");

    const searchInput = document.getElementById("searchInput");
    const departmentFilter = document.getElementById("departmentFilter");
    const statusFilter = document.getElementById("statusFilter");
    const clearFilters = document.getElementById("clearFilters");

    const viewTable = document.getElementById("viewTable");
    const viewCards = document.getElementById("viewCards");

    const modal = document.getElementById("facultyModal");
    const modalTitle = document.getElementById("facultyModalTitle");
    const modalSub = document.getElementById("facultyModalSub");
    const form = document.getElementById("facultyForm");
    const saveBtn = document.getElementById("saveBtn");

    const idField = document.getElementById("facultyId");
    const nameInput = document.getElementById("nameInput");
    const departmentSelect = document.getElementById("departmentSelect");
    const designationSelect = document.getElementById("designationSelect");
    const emailInput = document.getElementById("emailInput");
    const contactInput = document.getElementById("contactInput");
    const photoInput = document.getElementById("photoInput");
    const statusSelect = document.getElementById("statusSelect");

    let layout = "table";
    let sortKey = "name";
    let sortDir = "asc";

    /* ============================================ selects and filters */

    MOCK_DATA.departments.forEach(function (department) {
      departmentFilter.insertAdjacentHTML(
        "beforeend",
        '<option value="' + UI.escapeHtml(department) + '">' +
          UI.escapeHtml(department) + "</option>"
      );
      departmentSelect.insertAdjacentHTML(
        "beforeend",
        '<option value="' + UI.escapeHtml(department) + '">' +
          UI.escapeHtml(department) + "</option>"
      );
    });

    MOCK_DATA.designations.forEach(function (designation) {
      designationSelect.insertAdjacentHTML(
        "beforeend",
        '<option value="' + UI.escapeHtml(designation) + '">' +
          UI.escapeHtml(designation) + "</option>"
      );
    });

    UI.bindValidation(form);

    /* ========================================================= helpers */

    function avatarMarkup(row, className) {
      if (row.photo) {
        return (
          '<img class="avatar ' + className + '" src="' + UI.escapeHtml(row.photo) +
          '" alt="" style="object-fit:cover" ' +
          "onerror=\"this.replaceWith(Object.assign(document.createElement('span')," +
          "{className:'avatar " + className + "',textContent:'" +
          UI.escapeHtml(UI.initials(row.name)) + "'}))\" />"
        );
      }
      return (
        '<span class="avatar ' + className + '" style="' + UI.avatarStyle(row.name) + '">' +
        UI.escapeHtml(UI.initials(row.name)) +
        "</span>"
      );
    }

    function actionButtons(row) {
      return (
        '<div class="row-actions">' +
          '<button class="btn-icon" type="button" data-edit="' +
            UI.escapeHtml(row.id) + '" aria-label="Edit faculty" title="Edit">' +
            UI.icon("edit") +
          "</button>" +
          '<button class="btn-icon is-danger" type="button" data-delete="' +
            UI.escapeHtml(row.id) + '" aria-label="Delete faculty" title="Delete">' +
            UI.icon("trash") +
          "</button>" +
        "</div>"
      );
    }

    function statusBadge(status) {
      return (
        '<span class="badge badge-' + (status === "Active" ? "active" : "inactive") +
        '">' + UI.escapeHtml(status) + "</span>"
      );
    }

    function isFiltered() {
      return (
        searchInput.value.trim() !== "" ||
        departmentFilter.value !== "all" ||
        statusFilter.value !== "all"
      );
    }

    /* ========================================================= loading */

    function showSkeleton() {
      tableWrap.classList.add("hidden");
      cardGrid.classList.add("hidden");
      stateBox.innerHTML =
        '<div class="skel-row"><div class="skel skel-avatar"></div><div class="grow"><div class="skel skel-line w-40"></div><div class="skel skel-line w-60"></div></div></div>' +
        '<div class="skel-row"><div class="skel skel-avatar"></div><div class="grow"><div class="skel skel-line w-60"></div><div class="skel skel-line w-40"></div></div></div>' +
        '<div class="skel-row"><div class="skel skel-avatar"></div><div class="grow"><div class="skel skel-line w-40"></div><div class="skel skel-line w-80"></div></div></div>' +
        '<div class="skel-row"><div class="skel skel-avatar"></div><div class="grow"><div class="skel skel-line w-80"></div><div class="skel skel-line w-40"></div></div></div>';
      resultCount.textContent = "Loading…";
    }

    function renderEmpty() {
      tableWrap.classList.add("hidden");
      cardGrid.classList.add("hidden");

      if (isFiltered()) {
        stateBox.innerHTML =
          '<div class="empty">' +
            '<div class="empty-icon">' + UI.icon("search") + "</div>" +
            "<h4>No matching faculty members</h4>" +
            "<p>Nothing matches the current search and filters. Try a different term or clear the filters.</p>" +
            '<button class="btn btn-outline btn-sm" type="button" id="emptyClear">Clear filters</button>' +
          "</div>";
        const btn = document.getElementById("emptyClear");
        if (btn) btn.addEventListener("click", resetFilters);
      } else {
        stateBox.innerHTML =
          '<div class="empty">' +
            '<div class="empty-icon">' + UI.icon("users") + "</div>" +
            "<h4>No faculty records yet</h4>" +
            "<p>Add faculty members so the chatbot can answer questions about departments and staff.</p>" +
            '<button class="btn btn-primary btn-sm" type="button" id="emptyAdd">' +
              UI.icon("plus") + " Add Faculty</button>" +
          "</div>";
        const btn = document.getElementById("emptyAdd");
        if (btn) btn.addEventListener("click", function () { openForm(null); });
      }
    }

    /* ========================================================== render */

    function renderTable(rows) {
      tableBody.innerHTML = rows
        .map(function (row) {
          return (
            "<tr>" +
              '<td data-label="Name">' +
                '<div class="person">' +
                  avatarMarkup(row, "") +
                  "<div>" +
                    '<div class="pn">' + UI.escapeHtml(row.name) + "</div>" +
                    '<div class="pe">' + UI.escapeHtml(row.email) + "</div>" +
                  "</div>" +
                "</div>" +
              "</td>" +
              '<td data-label="Department">' + UI.escapeHtml(row.department) + "</td>" +
              '<td data-label="Designation" class="nowrap">' + UI.escapeHtml(row.designation) + "</td>" +
              '<td data-label="Contact" class="text-sm nowrap">' + UI.escapeHtml(row.contact) + "</td>" +
              '<td data-label="Status">' + statusBadge(row.status) + "</td>" +
              '<td class="col-actions">' + actionButtons(row) + "</td>" +
            "</tr>"
          );
        })
        .join("");
    }

    function renderCards(rows) {
      cardGrid.innerHTML = rows
        .map(function (row) {
          return (
            '<article class="fac-card">' +
              '<div class="fac-top">' +
                avatarMarkup(row, "avatar-lg") +
                "<div>" +
                  '<div class="fac-name">' + UI.escapeHtml(row.name) + "</div>" +
                  '<div class="fac-desig">' + UI.escapeHtml(row.designation) + "</div>" +
                "</div>" +
              "</div>" +
              '<div class="fac-meta">' +
                "<div>" + UI.icon("building", 14) +
                  '<span class="truncate">' + UI.escapeHtml(row.department) + "</span></div>" +
                "<div>" + UI.icon("mail", 14) +
                  '<span class="truncate">' + UI.escapeHtml(row.email) + "</span></div>" +
                "<div>" + UI.icon("phone", 14) +
                  "<span>" + UI.escapeHtml(row.contact) + "</span></div>" +
              "</div>" +
              '<div class="fac-foot">' +
                statusBadge(row.status) +
                actionButtons(row) +
              "</div>" +
            "</article>"
          );
        })
        .join("");
    }

    function render() {
      showSkeleton();

      Store.getFaculty({
        search: searchInput.value,
        department: departmentFilter.value,
        status: statusFilter.value,
        sort: sortKey,
        dir: sortDir,
      }).then(function (rows) {
        stateBox.innerHTML = "";

        if (!rows.length) {
          renderEmpty();
          resultCount.textContent = "No faculty members to show";
          return;
        }

        if (layout === "table") {
          renderTable(rows);
          tableWrap.classList.remove("hidden");
          cardGrid.classList.add("hidden");
        } else {
          renderCards(rows);
          cardGrid.classList.remove("hidden");
          tableWrap.classList.add("hidden");
        }

        resultCount.textContent =
          "Showing " + rows.length +
          (rows.length === 1 ? " faculty member" : " faculty members") +
          (isFiltered() ? " matching the current filters" : "");
      });
    }

    /* ==================================================== layout toggle */

    function setLayout(next) {
      layout = next;
      viewTable.setAttribute("aria-pressed", next === "table" ? "true" : "false");
      viewCards.setAttribute("aria-pressed", next === "cards" ? "true" : "false");
      render();
    }

    viewTable.addEventListener("click", function () { setLayout("table"); });
    viewCards.addEventListener("click", function () { setLayout("cards"); });

    /* ========================================================= filters */

    searchInput.addEventListener("input", UI.debounce(render, 260));
    departmentFilter.addEventListener("change", render);
    statusFilter.addEventListener("change", render);

    function resetFilters() {
      searchInput.value = "";
      departmentFilter.value = "all";
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

    /* ====================================================== add / edit */

    function openForm(row) {
      form.querySelectorAll(".field").forEach(function (field) {
        field.classList.remove("is-invalid");
      });

      if (row) {
        modalTitle.textContent = "Edit Faculty";
        modalSub.textContent = "Editing " + row.id + " — " + row.name + ".";
        idField.value = row.id;
        nameInput.value = row.name;
        departmentSelect.value = row.department;
        designationSelect.value = row.designation;
        emailInput.value = row.email;
        contactInput.value = row.contact;
        photoInput.value = row.photo || "";
        statusSelect.value = row.status;
        saveBtn.textContent = "Save changes";
      } else {
        modalTitle.textContent = "Add Faculty";
        modalSub.textContent = "Records shown here are used to answer faculty enquiries.";
        form.reset();
        idField.value = "";
        departmentSelect.value = MOCK_DATA.departments[0];
        designationSelect.value = MOCK_DATA.designations[3];
        statusSelect.value = "Active";
        saveBtn.textContent = "Save faculty";
      }

      UI.openModal(modal);
    }

    document.getElementById("addBtn").addEventListener("click", function () {
      openForm(null);
    });

    /* Row and card actions share one delegated handler */
    function bindActions(container) {
      container.addEventListener("click", function (event) {
        const editBtn = event.target.closest("[data-edit]");
        if (editBtn) {
          Store.getFacultyById(editBtn.dataset.edit).then(function (row) {
            if (row) openForm(row);
          });
          return;
        }

        const deleteBtn = event.target.closest("[data-delete]");
        if (deleteBtn) {
          const id = deleteBtn.dataset.delete;
          Store.getFacultyById(id).then(function (row) {
            if (!row) return;
            UI.confirm({
              title: "Delete this faculty record?",
              message:
                row.name + " (" + row.department +
                ") will be permanently removed from the faculty list.",
              confirmLabel: "Delete faculty",
            }).then(function (ok) {
              if (!ok) return;
              Store.deleteFaculty(id)
                .then(function () {
                  UI.toast("Faculty record deleted successfully.", "success");
                  render();
                })
                .catch(function (error) {
                  UI.toast(error.message, "error");
                });
            });
          });
        }
      });
    }

    bindActions(tableBody);
    bindActions(cardGrid);

    /* ============================================================ save */

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!UI.validateForm(form)) return;

      const payload = {
        name: nameInput.value,
        department: departmentSelect.value,
        designation: designationSelect.value,
        email: emailInput.value,
        contact: contactInput.value,
        photo: photoInput.value.trim(),
        status: statusSelect.value,
      };

      const id = idField.value;
      UI.busy(saveBtn, true);

      const request = id
        ? Store.updateFaculty(id, payload)
        : Store.addFaculty(payload);

      request
        .then(function () {
          UI.busy(saveBtn, false);
          UI.closeModal(modal);
          UI.toast(
            id
              ? "Faculty record updated successfully."
              : "Faculty member added successfully.",
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
