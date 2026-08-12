/* ==========================================================================
   server-admin.js — admin panel behaviour when Flask is serving the pages
   --------------------------------------------------------------------------
   The admin screens are ordinary server-rendered pages. Every change is a form
   POST to Flask, which writes to MySQL and redirects back with a flash
   message. This script only adds the interface polish around that:

     * turns Flask's flash messages into toasts
     * opens the add / edit modal and fills it from the row being edited
     * asks for confirmation before a delete, then submits the delete form
     * marks the active sidebar item and drives the responsive drawer

   No data is held in JavaScript. Reloading the page always shows exactly what
   is in the database.
   ========================================================================== */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {

    /* ------------------------------------------------ flash -> toast */
    const flashEl = document.getElementById("flashData");
    if (flashEl) {
      let messages = [];
      try {
        messages = JSON.parse(flashEl.textContent || "[]");
      } catch (err) {
        messages = [];
      }
      messages.forEach(function (entry, index) {
        const category = entry[0] === "error" ? "error" : "success";
        setTimeout(function () {
          UI.toast(entry[1], category, category === "error" ? 6000 : 3600);
        }, index * 220);
      });
    }

    /* -------------------------------------------------- active nav item */
    const page = document.body.dataset.page;
    document.querySelectorAll(".sidebar-nav a[data-nav]").forEach(function (link) {
      const active = link.dataset.nav === page;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "page");
    });

    /* ------------------------------------------- responsive sidebar */
    const toggle = document.getElementById("sidebarToggle");
    const scrim = document.getElementById("adminScrim");

    function closeSidebar() {
      document.body.classList.remove("sidebar-open");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
    }

    if (toggle) {
      toggle.addEventListener("click", function () {
        const open = document.body.classList.toggle("sidebar-open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }
    if (scrim) scrim.addEventListener("click", closeSidebar);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeSidebar();
    });

    /* ================================================== add / edit modal */
    const modal = document.querySelector("[data-record-modal]");
    if (modal) {
      const form = modal.querySelector("form");
      const titleEl = modal.querySelector("[data-modal-title]");
      const subEl = modal.querySelector("[data-modal-sub]");
      const saveBtn = modal.querySelector("[data-save]");

      UI.bindValidation(form);

      function openForm(trigger) {
        form.querySelectorAll(".field").forEach(function (field) {
          field.classList.remove("is-invalid");
        });

        const editing = trigger && trigger.dataset.edit !== undefined;

        if (editing) {
          form.action = trigger.dataset.action;
          titleEl.textContent = modal.dataset.editTitle;
          subEl.textContent = trigger.dataset.subtitle || "";
          saveBtn.textContent = "Save changes";
          /* every data-field-* attribute maps to the input of that name */
          Object.keys(trigger.dataset).forEach(function (key) {
            if (key.indexOf("field") !== 0) return;
            const name = key.slice(5, 6).toLowerCase() + key.slice(6);
            const input = form.elements[name];
            if (input) input.value = trigger.dataset[key];
          });
        } else {
          form.reset();
          form.action = modal.dataset.addAction;
          titleEl.textContent = modal.dataset.addTitle;
          subEl.textContent = modal.dataset.addSub;
          saveBtn.textContent = modal.dataset.addLabel;
        }

        UI.openModal(modal);
      }

      document.querySelectorAll("[data-add]").forEach(function (button) {
        button.addEventListener("click", function () { openForm(null); });
      });

      document.addEventListener("click", function (event) {
        const trigger = event.target.closest("[data-edit]");
        if (trigger) openForm(trigger);
      });

      form.addEventListener("submit", function (event) {
        if (!UI.validateForm(form)) {
          event.preventDefault();
          return;
        }
        UI.busy(saveBtn, true);
      });
    }

    /* ========================================================= deleting */
    document.addEventListener("click", function (event) {
      const button = event.target.closest("[data-delete-form]");
      if (!button) return;

      UI.confirm({
        title: button.dataset.confirmTitle || "Delete this record?",
        message: button.dataset.confirmMessage || "This cannot be undone.",
        confirmLabel: button.dataset.confirmLabel || "Delete",
      }).then(function (ok) {
        if (!ok) return;
        const form = document.getElementById(button.dataset.deleteForm);
        if (form) form.submit();
      });
    });

    /* ------------------------------------- submit filters as you type */
    const filterForm = document.getElementById("filterForm");
    if (filterForm) {
      const search = filterForm.querySelector('input[name="search"]');
      if (search) {
        search.addEventListener("input", UI.debounce(function () {
          filterForm.submit();
        }, 450));
      }
      filterForm.querySelectorAll("select").forEach(function (select) {
        select.addEventListener("change", function () { filterForm.submit(); });
      });
    }
  });
})();
