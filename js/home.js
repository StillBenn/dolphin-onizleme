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
  var shown = 0, lifted = false, t0 = performance.now();
  var MIN_MS = 1100;                 /* even a cached visit sees the leader count once */

  function paint(p) {
    shown = Math.max(shown, Math.min(1, p));
    if (sweep) sweep.style.setProperty("--p", shown.toFixed(3));
    if (num) num.textContent = String(Math.max(1, 3 - Math.floor(shown * 3)));
  }
  function lift() {
    if (lifted) return;
    lifted = true;
    paint(1);
    setTimeout(function () {
      html.classList.remove("is-loading");
      dispatchEvent(new Event("intro:done"));
      setTimeout(function () { html.classList.add("is-written"); }, 1800);
    }, Math.max(0, MIN_MS - (performance.now() - t0)));
  }
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
