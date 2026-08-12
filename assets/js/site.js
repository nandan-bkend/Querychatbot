/* ==========================================================================
   site.js — Home page behaviour
   Mobile navigation toggle + scroll spy for the section links.
   ========================================================================== */

(function () {
  "use strict";

  const nav = document.getElementById("siteNav");
  const toggle = document.getElementById("navToggle");

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    /* Close the drawer after tapping a link on mobile */
    nav.querySelectorAll(".nav-links a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* Highlight the nav link for whichever section is on screen */
  const sections = Array.prototype.slice.call(
    document.querySelectorAll("main section[id]")
  );
  const links = Array.prototype.slice.call(
    document.querySelectorAll('.nav-links a[href^="#"]')
  );

  if (sections.length && links.length && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          links.forEach(function (link) {
            link.classList.toggle(
              "is-active",
              link.getAttribute("href") === "#" + entry.target.id
            );
          });
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach(function (section) {
      observer.observe(section);
    });
  }
})();
