/* ==========================================================================
   ui.js — Shared interface helpers
   Icons · Toasts · Modals · Confirm dialog · Form validation · Formatting
   Used by both the student and the admin side.
   ========================================================================== */

window.UI = (function () {
  "use strict";

  /* ======================================================================
     ICONS — inline SVG, no external icon library or CDN
     ====================================================================== */

  const PATHS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z"/>',
    trash:
      '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>',
    close: '<path d="M18 6L6 18M6 6l12 12"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    checkCircle:
      '<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
    alertCircle:
      '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/>',
    alertTriangle:
      '<path d="M10.3 4.3L2.6 17.5A2 2 0 004.3 20.5h15.4a2 2 0 001.7-3L13.7 4.3a2 2 0 00-3.4 0z"/><path d="M12 9.5v4M12 17v.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.01"/>',
    chevronDown: '<path d="M6 9l6 6 6-6"/>',
    chevronRight: '<path d="M9 6l6 6-6 6"/>',
    arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    logout:
      '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
    messageSquare:
      '<path d="M21 15a2 2 0 01-2 2H8l-4 4V5a2 2 0 012-2h13a2 2 0 012 2z"/>',
    helpCircle:
      '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.5a2.5 2.5 0 014.9.6c0 1.7-2.5 2.4-2.5 2.4"/><path d="M12 17h.01"/>',
    users:
      '<path d="M16 20v-1.5a4 4 0 00-4-4H6a4 4 0 00-4 4V20"/><circle cx="9" cy="7" r="3.5"/><path d="M22 20v-1.5a4 4 0 00-3-3.87"/><path d="M16.5 3.6a4 4 0 010 6.8"/>',
    userCheck:
      '<path d="M15 20v-1.5a4 4 0 00-4-4H6a4 4 0 00-4 4V20"/><circle cx="8.5" cy="7" r="3.5"/><path d="M17 11l2 2 4-4"/>',
    eye: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/>',
    eyeOff:
      '<path d="M10.6 6.1A9.9 9.9 0 0112 6c6.4 0 10 6 10 6a17 17 0 01-3.3 4"/><path d="M6.3 7.9A16.6 16.6 0 002 12s3.6 6 10 6a9.6 9.6 0 004.2-.9"/><path d="M3 3l18 18"/>',
    send: '<path d="M21.5 2.5L10.5 13.5"/><path d="M21.5 2.5l-7 19-4-8.5-8.5-4z"/>',
    inbox:
      '<path d="M21 12h-5l-2 3h-4l-2-3H3"/><path d="M5.5 5h13l2.5 7v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6z"/>',
    mail: '<rect x="2.5" y="4.5" width="19" height="15" rx="2"/><path d="M3 6.5l9 6 9-6"/>',
    phone:
      '<path d="M22 16.9v2.6a2 2 0 01-2.2 2 19.6 19.6 0 01-8.5-3A19.3 19.3 0 015 12 19.6 19.6 0 012 3.2 2 2 0 014 1h2.6a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L7.7 8.7a16 16 0 006 6l1.1-1.1a2 2 0 012.1-.5c.9.3 1.8.6 2.8.7a2 2 0 011.7 2z"/>',
    mapPin:
      '<path d="M20 10.5c0 5.5-8 11.5-8 11.5s-8-6-8-11.5a8 8 0 1116 0z"/><circle cx="12" cy="10.5" r="2.8"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.2 2"/>',
    building:
      '<path d="M4 21V6.5L12 3l8 3.5V21"/><path d="M2.5 21h19"/><path d="M9.5 21v-4.5h5V21"/><path d="M8.5 9h.01M12 9h.01M15.5 9h.01M8.5 12.5h.01M12 12.5h.01M15.5 12.5h.01"/>',
    bookOpen:
      '<path d="M12 6.5S10 4.5 3.5 4.5v13C10 17.5 12 19.5 12 19.5s2-2 8.5-2v-13C14 4.5 12 6.5 12 6.5z"/><path d="M12 6.5v13"/>',
    shield:
      '<path d="M12 22s8-3.5 8-9.5V5.5L12 2.5 4 5.5V12.5C4 18.5 12 22 12 22z"/>',
    settings:
      '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5V21a2 2 0 11-4 0v-.1A1.6 1.6 0 007 19.4a1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1H1a2 2 0 110-4h.1A1.6 1.6 0 002.6 9a1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3H7a1.6 1.6 0 001-1.5V3a2 2 0 114 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8V9a1.6 1.6 0 001.5 1H21a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z"/>',
    refresh:
      '<path d="M3 12a9 9 0 0115.5-6.2L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 01-15.5 6.2L3 16"/><path d="M3 21v-5h5"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
    sparkle:
      '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
    bot: '<rect x="4" y="8" width="16" height="11" rx="3"/><path d="M12 8V4.5"/><circle cx="12" cy="3.5" r="1.4"/><path d="M9 13v1.5M15 13v1.5"/><path d="M2.5 12.5v3M21.5 12.5v3"/>',
    calendar:
      '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    tag: '<path d="M3 12.5V4a1 1 0 011-1h8.5L21 11.5 12.5 20z"/><circle cx="7.5" cy="7.5" r="1.3"/>',
  };

  function icon(name, size) {
    const d = PATHS[name];
    if (!d) return "";
    const s = size || 24;
    return (
      '<svg viewBox="0 0 24 24" width="' +
      s +
      '" height="' +
      s +
      '" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      d +
      "</svg>"
    );
  }

  /* Replace every <span data-icon="name"></span> on the page */
  function hydrateIcons(root) {
    (root || document).querySelectorAll("[data-icon]").forEach(function (el) {
      if (el.dataset.iconDone) return;
      el.innerHTML = icon(el.dataset.icon, el.dataset.iconSize || 24);
      el.dataset.iconDone = "1";
    });
  }

  /* ======================================================================
     FORMATTING
     ====================================================================== */

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear();
  }

  function formatTime(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return "";
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, "0");
    const ap = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return h + ":" + m + " " + ap;
  }

  function relativeTime(iso) {
    const then = new Date(iso);
    if (isNaN(then)) return "";
    const mins = Math.round((Date.now() - then.getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + (mins === 1 ? " minute ago" : " minutes ago");
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + (hrs === 1 ? " hour ago" : " hours ago");
    const days = Math.round(hrs / 24);
    if (days < 7) return days + (days === 1 ? " day ago" : " days ago");
    return formatDate(iso);
  }

  function initials(name) {
    const parts = String(name || "")
      .replace(/^(Dr\.?|Prof\.?|Mr\.?|Ms\.?|Mrs\.?)\s+/i, "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /* Deterministic avatar colour so the same person always looks the same */
  const TONES = [
    { bg: "#e8eef6", fg: "#1e4573" },
    { bg: "#fbf3dc", fg: "#a8871d" },
    { bg: "#e6f5ee", fg: "#0f8a5f" },
    { bg: "#ede9f7", fg: "#5b4b9e" },
    { bg: "#f6eae4", fg: "#a05a38" },
    { bg: "#e4f1f5", fg: "#1f6b80" },
  ];

  function avatarStyle(seed) {
    let h = 0;
    const s = String(seed || "");
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    const t = TONES[h % TONES.length];
    return "background:" + t.bg + ";color:" + t.fg + ";";
  }

  function debounce(fn, wait) {
    let timer;
    return function () {
      const args = arguments;
      const ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(ctx, args);
      }, wait || 220);
    };
  }

  /* ======================================================================
     TOASTS
     ====================================================================== */

  function toastStack() {
    let stack = document.querySelector(".toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "toast-stack";
      stack.setAttribute("role", "status");
      stack.setAttribute("aria-live", "polite");
      document.body.appendChild(stack);
    }
    return stack;
  }

  function toast(message, type, duration) {
    const kind = type || "success";
    const iconName =
      kind === "success" ? "checkCircle" : kind === "error" ? "alertCircle" : "info";

    const el = document.createElement("div");
    el.className = "toast toast-" + kind;
    el.innerHTML =
      '<span class="toast-icon">' + icon(iconName) + "</span>" +
      '<span class="toast-msg">' + escapeHtml(message) + "</span>" +
      '<button class="toast-close" type="button" aria-label="Dismiss">' +
      icon("close") + "</button>";

    const remove = function () {
      el.classList.add("is-leaving");
      setTimeout(function () {
        el.remove();
      }, 200);
    };

    el.querySelector(".toast-close").addEventListener("click", remove);
    toastStack().appendChild(el);
    setTimeout(remove, duration || 3400);
  }

  /* ======================================================================
     MODALS
     ====================================================================== */

  let lastFocused = null;

  function openModal(backdrop) {
    const el =
      typeof backdrop === "string" ? document.getElementById(backdrop) : backdrop;
    if (!el) return;
    lastFocused = document.activeElement;
    el.classList.add("is-open");
    el.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
    const focusable = el.querySelector(
      "input:not([type=hidden]), select, textarea, button"
    );
    if (focusable) setTimeout(function () { focusable.focus(); }, 60);
  }

  function closeModal(backdrop) {
    const el =
      typeof backdrop === "string" ? document.getElementById(backdrop) : backdrop;
    if (!el) return;
    el.classList.remove("is-open");
    el.setAttribute("aria-hidden", "true");
    if (!document.querySelector(".modal-backdrop.is-open")) {
      document.body.classList.remove("no-scroll");
    }
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  /* Backdrop click + Escape close every modal on the page */
  document.addEventListener("click", function (e) {
    if (e.target.classList && e.target.classList.contains("modal-backdrop")) {
      closeModal(e.target);
    }
    const closer = e.target.closest ? e.target.closest("[data-close-modal]") : null;
    if (closer) {
      const parent = closer.closest(".modal-backdrop");
      if (parent) closeModal(parent);
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    const open = document.querySelector(".modal-backdrop.is-open");
    if (open) closeModal(open);
  });

  /* ----------------------------------------------------- confirm dialog */

  function confirm(options) {
    const o = options || {};
    return new Promise(function (resolve) {
      const backdrop = document.createElement("div");
      backdrop.className = "modal-backdrop";
      backdrop.setAttribute("role", "dialog");
      backdrop.setAttribute("aria-modal", "true");
      backdrop.innerHTML =
        '<div class="modal modal-sm">' +
          '<div class="modal-body">' +
            '<div class="confirm-icon">' + icon(o.danger === false ? "info" : "alertTriangle") + "</div>" +
            "<h3 style=\"font-family:var(--font-body);font-size:var(--fs-lg);font-weight:700;letter-spacing:0;margin-bottom:6px;\">" +
              escapeHtml(o.title || "Are you sure?") +
            "</h3>" +
            '<p class="text-muted" style="line-height:var(--lh-snug);">' +
              escapeHtml(o.message || "This action cannot be undone.") +
            "</p>" +
          "</div>" +
          '<div class="modal-foot">' +
            '<button type="button" class="btn btn-outline" data-act="cancel">' +
              escapeHtml(o.cancelLabel || "Cancel") +
            "</button>" +
            '<button type="button" class="btn ' +
              (o.danger === false ? "btn-primary" : "btn-danger") +
              '" data-act="ok">' +
              escapeHtml(o.confirmLabel || "Delete") +
            "</button>" +
          "</div>" +
        "</div>";

      document.body.appendChild(backdrop);

      function finish(result) {
        closeModal(backdrop);
        setTimeout(function () { backdrop.remove(); }, 240);
        resolve(result);
      }

      backdrop.querySelector('[data-act="cancel"]').addEventListener("click", function () { finish(false); });
      backdrop.querySelector('[data-act="ok"]').addEventListener("click", function () { finish(true); });
      backdrop.addEventListener("click", function (e) { if (e.target === backdrop) finish(false); });
      document.addEventListener("keydown", function esc(e) {
        if (e.key === "Escape") { document.removeEventListener("keydown", esc); finish(false); }
      });

      /* Force a reflow so the browser paints the closed state first and the
         open transition actually animates. Using a reflow rather than
         requestAnimationFrame keeps this working in a background tab, where
         animation frames may never be delivered. */
      void backdrop.offsetWidth;
      openModal(backdrop);
    });
  }

  /* ======================================================================
     FORM VALIDATION
     Declared on the markup:
       <input data-validate="required email" data-label="Email address">
     ====================================================================== */

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
  const PHONE_RE = /^[+]?[\d][\d\s\-()]{7,17}$/;

  function fieldOf(input) {
    return input.closest(".field");
  }

  function setError(input, message) {
    const field = fieldOf(input);
    if (!field) return;
    field.classList.add("is-invalid");
    input.setAttribute("aria-invalid", "true");
    const box = field.querySelector(".field-error");
    if (box) box.innerHTML = icon("alertCircle", 14) + "<span>" + escapeHtml(message) + "</span>";
  }

  function clearError(input) {
    const field = fieldOf(input);
    if (!field) return;
    field.classList.remove("is-invalid");
    input.removeAttribute("aria-invalid");
  }

  function validateField(input) {
    const rules = (input.dataset.validate || "").split(/\s+/).filter(Boolean);
    if (!rules.length) return true;

    const label = input.dataset.label || "This field";
    const value = (input.value || "").trim();

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      const [name, arg] = rule.split(":");

      if (name === "required" && !value) {
        setError(input, label + " is required.");
        return false;
      }
      if (!value) continue; // remaining rules only apply to filled fields

      if (name === "email" && !EMAIL_RE.test(value)) {
        setError(input, "Enter a valid email address, e.g. name@seacet.edu.in");
        return false;
      }
      if (name === "phone" && !PHONE_RE.test(value)) {
        setError(input, "Enter a valid contact number, e.g. 080 2973 0618");
        return false;
      }
      if (name === "min" && value.length < Number(arg)) {
        setError(input, label + " must be at least " + arg + " characters.");
        return false;
      }
      if (name === "max" && value.length > Number(arg)) {
        setError(input, label + " must be under " + arg + " characters.");
        return false;
      }
    }

    clearError(input);
    return true;
  }

  function validateForm(form) {
    const inputs = form.querySelectorAll("[data-validate]");
    let ok = true;
    let first = null;
    inputs.forEach(function (input) {
      if (!validateField(input)) {
        ok = false;
        if (!first) first = input;
      }
    });
    if (first) first.focus();
    return ok;
  }

  /* Validate on blur, and clear the error as soon as the user edits */
  function bindValidation(form) {
    form.querySelectorAll("[data-validate]").forEach(function (input) {
      input.addEventListener("blur", function () { validateField(input); });
      input.addEventListener("input", function () {
        if (fieldOf(input) && fieldOf(input).classList.contains("is-invalid")) {
          validateField(input);
        }
      });
    });
    form.setAttribute("novalidate", "novalidate");
  }

  function busy(button, isBusy) {
    if (!button) return;
    if (isBusy) {
      button.setAttribute("aria-busy", "true");
      button.disabled = true;
    } else {
      button.removeAttribute("aria-busy");
      button.disabled = false;
    }
  }

  /* ======================================================================
     PASSWORD REVEAL — any [data-pw-toggle] button next to an input
     ====================================================================== */

  document.addEventListener("click", function (e) {
    const btn = e.target.closest ? e.target.closest("[data-pw-toggle]") : null;
    if (!btn) return;
    const input = document.getElementById(btn.dataset.pwToggle);
    if (!input) return;
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    btn.innerHTML = icon(show ? "eyeOff" : "eye");
    btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
  });

  /* ======================================================================
     DROPDOWNS — any [data-dropdown] toggle inside a .dropdown
     ====================================================================== */

  document.addEventListener("click", function (e) {
    const toggle = e.target.closest ? e.target.closest("[data-dropdown]") : null;
    document.querySelectorAll(".dropdown.is-open").forEach(function (d) {
      if (!toggle || !d.contains(toggle)) {
        d.classList.remove("is-open");
        const t = d.querySelector("[data-dropdown]");
        if (t) t.setAttribute("aria-expanded", "false");
      }
    });
    if (toggle) {
      const parent = toggle.closest(".dropdown");
      const open = parent.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    }
  });

  /* ---------------------------------------------------------------- init */

  document.addEventListener("DOMContentLoaded", function () {
    hydrateIcons(document);
  });

  return {
    icon: icon,
    hydrateIcons: hydrateIcons,
    escapeHtml: escapeHtml,
    formatDate: formatDate,
    formatTime: formatTime,
    relativeTime: relativeTime,
    initials: initials,
    avatarStyle: avatarStyle,
    debounce: debounce,
    toast: toast,
    openModal: openModal,
    closeModal: closeModal,
    confirm: confirm,
    validateField: validateField,
    validateForm: validateForm,
    bindValidation: bindValidation,
    busy: busy,
  };
})();
