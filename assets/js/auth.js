/* ==========================================================================
   auth.js — Mock session handling
   --------------------------------------------------------------------------
   Frontend prototype only. Credentials are compared against the demo pair in
   mock-data.js and the "session" is a flag in sessionStorage.

   In the real system this file is replaced by server-side authentication:
   the Python backend validates against the MySQL user table and issues a
   session, and the page guards below become server-side route protection.
   Passwords are never handled in the browser in the final build.
   ========================================================================== */

window.Auth = (function () {
  "use strict";

  const SESSION_KEY = "viet.session";
  const REMEMBER_KEY = "viet.remember";
  const LATENCY = 620; // makes the button's loading state visible

  function readSession() {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    } catch (err) {
      return null;
    }
  }

  function writeSession(session) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  /* Shared login routine for both roles. Resolves with the user profile or
     rejects with a message suitable for display. */
  function login(role, email, password) {
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        const expected = window.MOCK_DATA.credentials[role];
        const typed = String(email || "").trim().toLowerCase();

        if (typed !== expected.email.toLowerCase()) {
          reject(
            new Error(
              role === "admin"
                ? "No administrator account found with that email address."
                : "No student account found with that email address."
            )
          );
          return;
        }
        if (password !== expected.password) {
          reject(new Error("Incorrect password. Please try again."));
          return;
        }

        const profile =
          role === "admin" ? window.MOCK_DATA.admin : window.MOCK_DATA.student;
        const session = {
          role: role,
          user: profile,
          loginAt: new Date().toISOString(),
        };
        writeSession(session);
        resolve(session);
      }, LATENCY);
    });
  }

  function loginStudent(email, password) {
    return login("student", email, password);
  }

  function loginAdmin(email, password) {
    return login("admin", email, password);
  }

  function current() {
    return readSession();
  }

  function user() {
    const s = readSession();
    return s ? s.user : null;
  }

  function logout(redirectTo) {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = redirectTo || "index.html";
  }

  /* ---------------------------------------------------------- page guards */

  function require(role, loginPage) {
    const s = readSession();
    if (!s || s.role !== role) {
      window.location.replace(loginPage);
      return null;
    }
    return s.user;
  }

  function requireStudent() {
    return require("student", "student-login.html");
  }

  function requireAdmin() {
    return require("admin", "admin-login.html");
  }

  /* ------------------------------------------------------- "remember me" */

  function remember(role, email) {
    localStorage.setItem(REMEMBER_KEY + "." + role, email);
  }

  function forget(role) {
    localStorage.removeItem(REMEMBER_KEY + "." + role);
  }

  function remembered(role) {
    return localStorage.getItem(REMEMBER_KEY + "." + role) || "";
  }

  return {
    loginStudent: loginStudent,
    loginAdmin: loginAdmin,
    current: current,
    user: user,
    logout: logout,
    requireStudent: requireStudent,
    requireAdmin: requireAdmin,
    remember: remember,
    forget: forget,
    remembered: remembered,
  };
})();
