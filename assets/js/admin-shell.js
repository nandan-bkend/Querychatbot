/* ==========================================================================
   admin-shell.js — Behaviour shared by every admin page
   Session guard · profile area · responsive sidebar · logout · demo reset
   Loaded before each page's own controller.
   ========================================================================== */

window.AdminShell = (function () {
  "use strict";

  /* Guard first: an unauthenticated visitor never sees the admin markup. */
  const admin = Auth.requireAdmin();
  if (!admin) return null;

  document.addEventListener("DOMContentLoaded", function () {
    /* ---------------------------------------------------- profile area */
    const nameEls = document.querySelectorAll("[data-admin-name]");
    const emailEls = document.querySelectorAll("[data-admin-email]");
    const avatarEls = document.querySelectorAll("[data-admin-avatar]");

    nameEls.forEach(function (el) { el.textContent = admin.name; });
    emailEls.forEach(function (el) { el.textContent = admin.email; });
    avatarEls.forEach(function (el) { el.textContent = UI.initials(admin.name); });

    /* -------------------------------------------------- active nav item */
    const page = document.body.dataset.page;
    document.querySelectorAll(".sidebar-nav a[data-nav]").forEach(function (link) {
      const active = link.dataset.nav === page;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "page");
    });

    /* --------------------------------------------- responsive sidebar */
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

    /* Close the drawer when a nav link is followed on a small screen */
    document.querySelectorAll(".sidebar-nav a").forEach(function (link) {
      link.addEventListener("click", closeSidebar);
    });

    /* ------------------------------------------------------------ logout */
    document.querySelectorAll("[data-logout]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        UI.confirm({
          title: "Log out of the admin panel?",
          message:
            "You will be returned to the administrator login page. Any unsaved changes will be lost.",
          confirmLabel: "Log out",
          cancelLabel: "Stay signed in",
          danger: false,
        }).then(function (ok) {
          if (ok) Auth.logout("admin-login.html");
        });
      });
    });

    /* -------------------------------------------------- reset demo data */
    document.querySelectorAll("[data-reset-demo]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        UI.confirm({
          title: "Restore the original demo data?",
          message:
            "Every question and faculty record will be reset to the sample dataset. Anything you added or edited during this session will be discarded.",
          confirmLabel: "Reset data",
          cancelLabel: "Cancel",
        }).then(function (ok) {
          if (!ok) return;
          Store.reset();
          UI.toast("Demo data restored. Reloading…", "success", 1500);
          setTimeout(function () { window.location.reload(); }, 700);
        });
      });
    });
  });

  return { admin: admin };
})();
