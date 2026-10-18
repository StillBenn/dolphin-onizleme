/* ==========================================================================
   From page to page
   --------------------------------------------------------------------------
   A link to another of the site's pages does not cut: the page fades into
   the studio's black with the name in its middle, and the next page opens
   out of the same black (html.fx-in, set before its first paint by the
   inline script tools/build.py writes into every page's head; the fade
   itself is CSS, so a page never stays covered if this file fails).
   A link the pointer rests on is fetched ahead, so the black is short.
   Not for: a new tab or window (modifier keys, target), a download, an
   address outside the site, or a jump inside the same page (js/scroll.js).
   ========================================================================== */
(function () {
  "use strict";
  var html = document.documentElement;
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var LEAVE_MS = 420;
  var fetched = {}, going = 0;

  function internal(a) {
    if (!a || !a.href || a.target && a.target !== "_self" || a.hasAttribute("download")) return null;
    if ((a.getAttribute("href") || "").charAt(0) === "#") return null;          /* js/scroll.js's */
    var u;
    try { u = new URL(a.href, location.href); } catch (e) { return null; }
    if (u.origin !== location.origin || !/(\/|\.html)$/.test(u.pathname)) return null;
    return u;
  }
  var page = function (p) { return p.replace(/\/index\.html$/, "/"); };
  function samePage(u) { return page(u.pathname) === page(location.pathname); }

  function ahead(e) {
    var a = e.target.closest && e.target.closest("a[href]"), u = internal(a);
    if (!u || samePage(u)) return;
    var k = u.pathname;
    if (fetched[k]) return;
    fetched[k] = true;
    var l = document.createElement("link");
    l.rel = "prefetch"; l.href = k;
    document.head.appendChild(l);
  }
  document.addEventListener("pointerover", ahead, { passive: true });
  document.addEventListener("touchstart", ahead, { passive: true });
  document.addEventListener("focusin", ahead);

  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest("a[href]"), u = internal(a);
    if (!u) return;
    if (samePage(u)) {
      /* the same page: a jump to one of its sections goes through the page's own glide */
      if (!u.hash) return;
      var el = document.getElementById(decodeURIComponent(u.hash.slice(1)));
      if (!el) return;
      e.preventDefault();
      var tmp = document.createElement("a");
      tmp.href = u.hash; tmp.style.display = "none";
      document.body.appendChild(tmp); tmp.click(); tmp.remove();
      return;
    }
    e.preventDefault();
    if (reduced) { location.href = u.href; return; }
    try { sessionStorage.setItem("dl-fx", JSON.stringify({ t: Date.now() + LEAVE_MS })); } catch (err) { /* the next page simply opens without the fade */ }
    html.classList.remove("fx-in");          /* its arrival fade, still holding, would override the way out (found in review) */
    html.classList.add("fx-out");
    clearTimeout(going);
    going = setTimeout(function () { location.href = u.href; }, LEAVE_MS);
  });

  /* back to a page the browser kept: it must not come back still covered, nor still on its way out */
  addEventListener("pageshow", function (e) { if (e.persisted) { clearTimeout(going); html.classList.remove("fx-out", "fx-in"); } });
})();
