/* ==========================================================================
   The page around the film: the loader, the header, words that arrive
   --------------------------------------------------------------------------
   The loader is a film leader (3, 2, 1): its sweep is the opening's frames
   actually arriving (js/film.js calls FilmIntro), not a timer. The header
   gets a ground of its own only over the page, never over the film. Each
   block rises into place once as it comes on screen (off under reduced
   motion; without JS nothing is hidden: html.rv is set here).
   ========================================================================== */
(function () {
  "use strict";
  var html = document.documentElement;
  var sweep = document.querySelector(".leader__sweep");
  var num = document.querySelector("[data-leader]");
  /* The count is paced, not the raw progress: the downloads report in leaps
     (0.15, 0.3, 0.75, done), and a number tied to them sat on 3 and then
     cut to 1. Each number gets one full turn of the sweep (a real leader),
     at least PACE_MS for all three; while the frames are still on their way
     the sweep runs ahead of them only slowly and never past most of the
     last turn, and the leader lifts on the 1's completed turn. */
  var target = 0, shown = 0, done = false, last = 0;
  var PACE_MS = 2100;               /* ~0.7 s a number: at 0.55 s the count read a touch hurried */

  function paint(p) { target = Math.max(target, Math.min(1, p)); }
  function draw() {
    var k = Math.min(2, Math.floor(shown * 3));
    if (sweep) sweep.style.setProperty("--p", (shown >= 1 ? 1 : shown * 3 - k).toFixed(3));
    var n = String(3 - k);
    if (num && num.textContent !== n) num.textContent = n;
  }
  function tick(now) {
    var dt = Math.min(64, now - (last || now)); last = now;
    var ahead = done ? 1 : Math.min(0.9, target + 0.3);
    shown = Math.min(ahead, shown + dt / (shown < target || done ? PACE_MS : PACE_MS * 4));
    draw();
    if (done && shown >= 1) {
      html.classList.remove("is-loading");
      dispatchEvent(new Event("intro:done"));
      setTimeout(function () { html.classList.add("is-written"); }, 1800);
      return;
    }
    requestAnimationFrame(tick);
  }
  function lift() { if (!done) { done = true; target = 1; } }
  requestAnimationFrame(tick);
  window.FilmIntro = { progress: paint, done: lift };
  setTimeout(lift, 16000);           /* never trapped behind the leader */

  if ("scrollRestoration" in history && document.querySelector('.film[data-film="main"]')) history.scrollRestoration = "manual";   /* the film's page only: the others keep the reader's place */
  var hashEl = location.hash.length > 1 && document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (hashEl) {
    var moved = false;
    ["wheel", "touchstart", "keydown", "pointerdown"].forEach(function (t) { addEventListener(t, function () { moved = true; }, { once: true, passive: true }); });
    var settle = function () { if (!moved) window.scrollTo(0, hashEl.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(hashEl).scrollMarginTop) || 0)); };
    addEventListener("film:layout", function (e) { if (e.detail && e.detail.id === "main") settle(); });
    addEventListener("load", settle);
    setTimeout(function () { moved = true; }, 6000);
  }

  addEventListener("scroll", function once() {
    if (scrollY > 12) { html.classList.add("has-scrolled"); removeEventListener("scroll", once); }
  }, { passive: true });

  var hdr = document.querySelector(".hdr");
  function stuck() {
    if (!hdr) return;
    var onFilm = html.dataset.film === "dark" || html.dataset.film === "light";
    hdr.classList.toggle("is-stuck", !onFilm && scrollY > 10);
  }
  addEventListener("scroll", stuck, { passive: true });
  new MutationObserver(stuck).observe(html, { attributes: true, attributeFilter: ["data-film"] });
  stuck();

  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var groups = [].slice.call(document.querySelectorAll(".sec-head > div, .sec-head > .sec-lead, .story__head, .figs, .chips, .air__text, .air__board, .contact__text, .slate, .foot__top, .foot__cols, " +
    ".intro__text, .work__more, .about__text, .quote-card, .ways__list, .sx__text, .sx__list, .flow__head, .steps, .srv__text, .cta"));
  if (!reduced && "IntersectionObserver" in window && groups.length) {
    html.classList.add("rv");
    groups.forEach(function (g) {
      var parts = g.matches(".sec-lead, .slate, .chips, .work__more, .quote-card, .ways__list") ? [g] : [].slice.call(g.children);
      parts.forEach(function (el, i) { el.classList.add("rv__p"); el.style.setProperty("--i", Math.min(i, 8)); });
    });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.01 });
    groups.forEach(function (g) { io.observe(g); });
  }

  var skip = document.querySelector(".film__skip"), filmEl = skip && skip.closest(".film");
  if (skip && filmEl) {
    var ring = function () {
      var r = filmEl.getBoundingClientRect(), len = r.height - innerHeight;
      skip.style.setProperty("--skip-p", (len > 0 ? Math.min(1, Math.max(0, -r.top / len)) : 0).toFixed(3));
    };
    addEventListener("scroll", ring, { passive: true });
    addEventListener("resize", ring);
    ring();
  }
})();
