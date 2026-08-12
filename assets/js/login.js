/* ==========================================================================
   login.js — Shared login controller for both the student and admin pages
   --------------------------------------------------------------------------
   The page tells this script what to do through two data attributes:

     <form data-role="student" data-redirect="student-chat.html">
     <form data-role="admin"   data-redirect="admin-dashboard.html">

   Validation runs entirely in the browser. Credential checking is handled by
   auth.js, which is the mock stand-in for backend authentication.
   ========================================================================== */

(function () {
  "use strict";

  const form = document.getElementById("loginForm");
  if (!form) return;

  const role = form.dataset.role || "student";
  const redirect = form.dataset.redirect || "index.html";

  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const rememberInput = document.getElementById("remember");
  const submitBtn = document.getElementById("submitBtn");
  const alertBox = document.getElementById("formAlert");
  const alertMsg = document.getElementById("formAlertMsg");

  UI.bindValidation(form);

  /* Already signed in? Skip straight through. */
  const session = Auth.current();
  if (session && session.role === role) {
    window.location.replace(redirect);
    return;
  }

  /* Restore a remembered email address */
  const saved = Auth.remembered(role);
  if (saved) {
    emailInput.value = saved;
    if (rememberInput) rememberInput.checked = true;
    if (passwordInput) passwordInput.focus();
  }

  function showAlert(message) {
    if (!alertBox) return;
    alertMsg.textContent = message;
    alertBox.classList.remove("is-shown");
    void alertBox.offsetWidth; /* restart the shake animation */
    alertBox.classList.add("is-shown");
  }

  function hideAlert() {
    if (alertBox) alertBox.classList.remove("is-shown");
  }

  form.addEventListener("input", hideAlert);

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    hideAlert();

    if (!UI.validateForm(form)) return;

    UI.busy(submitBtn, true);

    const request =
      role === "admin"
        ? Auth.loginAdmin(emailInput.value, passwordInput.value)
        : Auth.loginStudent(emailInput.value, passwordInput.value);

    request
      .then(function () {
        if (rememberInput && rememberInput.checked) {
          Auth.remember(role, emailInput.value.trim());
        } else {
          Auth.forget(role);
        }
        UI.toast("Signed in successfully. Redirecting…", "success", 1600);
        setTimeout(function () {
          window.location.href = redirect;
        }, 550);
      })
      .catch(function (error) {
        UI.busy(submitBtn, false);
        showAlert(error.message);
        passwordInput.value = "";
        passwordInput.focus();
      });
  });

  /* ------------------------------------------------- forgot password */

  const forgotLink = document.getElementById("forgotLink");
  if (forgotLink) {
    forgotLink.addEventListener("click", function (event) {
      event.preventDefault();
      UI.openModal("forgotModal");
    });
  }
})();
