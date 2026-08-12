/* ==========================================================================
   server-login.js — login page behaviour when Flask is serving the pages
   --------------------------------------------------------------------------
   The form is a normal HTML POST, so the browser hands the credentials to the
   Python backend and the backend decides where to go next. This script only
   adds the things the browser cannot do on its own:

     * client-side validation, so an empty or malformed field is caught before
       a request is made
     * a loading state on the button, so a slow login does not look frozen
     * the forgot-password dialog

   Credentials are never checked here. That happens in auth.py against the
   hashed passwords in the users table.
   ========================================================================== */

(function () {
  "use strict";

  const form = document.getElementById("loginForm");
  if (!form) return;

  const submitBtn = document.getElementById("submitBtn");
  const alertBox = document.querySelector(".form-alert");

  UI.bindValidation(form);

  /* If the server rejected the attempt, put the cursor back in the password
     field rather than making the user click into it. */
  if (alertBox && alertBox.classList.contains("is-shown")) {
    const password = document.getElementById("password");
    if (password) {
      password.focus();
      form.addEventListener("input", function hide() {
        alertBox.classList.remove("is-shown");
        form.removeEventListener("input", hide);
      });
    }
  }

  form.addEventListener("submit", function (event) {
    if (!UI.validateForm(form)) {
      event.preventDefault();
      return;
    }
    UI.busy(submitBtn, true);
    /* The form submits normally from here — Flask redirects on success and
       re-renders this page with an error on failure. */
  });

  const forgotLink = document.getElementById("forgotLink");
  if (forgotLink) {
    forgotLink.addEventListener("click", function (event) {
      event.preventDefault();
      UI.openModal("forgotModal");
    });
  }
})();
