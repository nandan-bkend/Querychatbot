/* ==========================================================================
   motion.js — the behavioural half of the polish layer
   --------------------------------------------------------------------------
   Three effects that CSS alone cannot do:

     1. a ripple that starts from the point the pointer touched
     2. staggered entrances, delayed per item
     3. counters that animate up to their value

   All of it is additive. If this file fails to load, every page still works
   and still looks correct — nothing here is load-bearing.

   Anyone who has asked their system to reduce motion gets none of it.
   ========================================================================== */

(function () {
  "use strict";

  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ======================================================================
     1. Ripple
     Circles expand from where the pointer actually landed, which is what
     makes the effect read as a response rather than a decoration.
     ====================================================================== */

  /* Sidebar links are deliberately excluded: their active marker is a
     pseudo-element positioned outside the link's own box, so the
     overflow:hidden a ripple needs would clip the gold indicator off. They
     get the hover shift instead. */
  const RIPPLES = ".btn, .btn-icon, .chip, .send-btn, .dropdown-item, " +
                  ".segmented button";

  document.addEventListener("pointerdown", function (event) {
    if (REDUCED || event.button !== 0) return;

    const target = event.target.closest ? event.target.closest(RIPPLES) : null;
    if (!target || target.disabled) return;

    const box = target.getBoundingClientRect();
    /* Radius reaches the furthest corner, so the ripple always covers the
       whole control regardless of where it was pressed. */
    const size = Math.max(box.width, box.height) * 1.1;

    const ripple = document.createElement("span");
    ripple.className = "ripple";
    ripple.style.width = ripple.style.height = size + "px";
    ripple.style.left = event.clientX - box.left - size / 2 + "px";
    ripple.style.top = event.clientY - box.top - size / 2 + "px";

    target.appendChild(ripple);
    setTimeout(function () { ripple.remove(); }, 600);
  });

  /* ======================================================================
     2. Staggered entrances
     Items in a group settle in one after another. The delay is small and
     capped, so a long table never feels like it is loading slowly.
     ====================================================================== */

  const GROUPS = [
    { selector: ".kpi", step: 60 },
    { selector: ".cat-card", step: 55 },
    { selector: ".step", step: 70 },
    { selector: ".contact-item", step: 60 },
    { selector: ".panel-grid > .card, .admin-body > .card", step: 90 },
    { selector: ".fac-card", step: 30 },
    { selector: ".mini-item", step: 35 },
    { selector: ".tl-item", step: 40 },
    { selector: ".auth-point", step: 80 },
  ];

  function stagger() {
    if (REDUCED) return;
    GROUPS.forEach(function (group) {
      const items = document.querySelectorAll(group.selector);
      items.forEach(function (item, index) {
        if (item.dataset.rise) return;
        item.dataset.rise = "1";
        /* Capped so the last row of a long list is not left waiting */
        item.style.animationDelay = Math.min(index * group.step, 420) + "ms";
      });
    });
  }

  /* ======================================================================
     3. Counters
     Dashboard figures count up to their value. Uses the same expo easing as
     the rest of the interface so it decelerates rather than ticking evenly.
     ====================================================================== */

  function countUp(element) {
    const target = parseInt(element.textContent.trim(), 10);
    if (isNaN(target) || element.dataset.counted) return;
    element.dataset.counted = "1";

    if (REDUCED || target === 0) return;

    const duration = 900;
    const start = performance.now();
    let settled = false;

    function settle() {
      if (settled) return;
      settled = true;
      element.textContent = target;
    }

    /* A guaranteed backstop. Animation frames are not delivered in a
       background tab, and some environments never deliver them at all — if
       the count were driven by frames alone, the card would be left reading
       zero instead of the real figure. Showing the wrong number is far worse
       than not animating, so a timer always finishes the job. */
    setTimeout(settle, duration + 150);

    function frame(now) {
      if (settled) return;
      const progress = Math.min((now - start) / duration, 1);
      /* easeOutExpo, matching the CSS easing */
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      if (progress < 1) {
        element.textContent = Math.round(target * eased);
        requestAnimationFrame(frame);
      } else {
        settle();
      }
    }

    element.textContent = "0";
    requestAnimationFrame(frame);
  }

  function countAll() {
    document.querySelectorAll(".kpi-value").forEach(countUp);
  }

  /* The static prototype fills these in from JavaScript after the page has
     loaded, so watch for the value arriving rather than assuming it is
     already in the markup. */
  function watchCounters() {
    const grid = document.querySelector(".kpi-grid");
    if (!grid || typeof MutationObserver === "undefined") return;
    new MutationObserver(function () {
      countAll();
    }).observe(grid, { childList: true, subtree: true, characterData: true });
  }

  /* ======================================================================
     Boot
     ====================================================================== */

  function init() {
    stagger();
    countAll();
    watchCounters();

    /* Admin tables are re-rendered by their controllers; re-run the stagger
       when new rows appear so they animate in too. */
    const body = document.getElementById("tableBody");
    if (body && typeof MutationObserver !== "undefined") {
      new MutationObserver(function () {
        setTimeout(stagger, 0);
      }).observe(body, { childList: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
