/* ==========================================================================
   The page's working parts
   --------------------------------------------------------------------------
   · the viewfinder's timecode runs with the film (25 frames a second of it)
   · the story's strip of film slides sideways as its section goes by
   · the figures count up once, when they come on screen
   · the commercials: filter by sector, play one in the player (keyboard:
     space, ←/→ to seek, ↑/↓ for the next/previous film, Esc to close)
   · the services: a clip of the film opens beside the line pointed at
   · the brands roll like end credits as their section scrolls
   · the slate: filled in, it claps and opens WhatsApp or the mail app with
     a message written from it
   ========================================================================== */
(function () {
  "use strict";
  var html = document.documentElement;
  var T = function (s) { return window.KX ? window.KX.t(s) : s; };
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var pad2 = function (n) { return (n < 10 ? "0" : "") + n; };

  /* ---- scroll-linked parts, one rAF ---------------------------------------- */
  var film = document.querySelector('.film[data-film="main"]');
  var tc = document.querySelector("[data-tc]");
  var FRAMES = 706, FPS = 25;                 /* the film's length (film/film.json, its chapters less the dissolve) */
  var reelBox = document.querySelector("[data-reel]"), strip = reelBox && reelBox.querySelector(".reel__strip");
  var story = document.querySelector(".story");
  var credits = document.querySelector(".credits"), roll = document.querySelector("[data-roll]"), list = roll && roll.querySelector(".credits__list");
  var lastTc = "";
  function tick() {
    var vh = innerHeight;
    if (film && tc) {
      var r = film.getBoundingClientRect(), len = r.height - vh;
      if (r.bottom > 0 && len > 0) {
        var f = Math.round(clamp(-r.top / len, 0, 1) * (FRAMES - 1));
        var s = Math.floor(f / FPS), t = "00:" + pad2(Math.floor(s / 60)) + ":" + pad2(s % 60) + ":" + pad2(f % FPS);
        if (t !== lastTc) { tc.textContent = t; lastTc = t; }
      }
    }
    if (strip && story) {
      var sr = story.getBoundingClientRect();
      var span = strip.scrollWidth - reelBox.clientWidth;
      var p = clamp((vh - sr.top) / (sr.height + vh * 0.2), 0, 1);
      strip.style.setProperty("--x", (Math.max(0, span) * p).toFixed(1));
    }
    if (credits && list) {
      var cr = credits.getBoundingClientRect(), clen = cr.height - vh;
      if (cr.bottom > 0 && cr.top < vh) {
        var q = clamp(-cr.top / Math.max(1, clen), 0, 1);
        list.style.setProperty("--y", ((list.scrollHeight - roll.clientHeight) * q).toFixed(1));
      }
    }
  }
  var queued = false;
  function onScroll() { if (!queued) { queued = true; requestAnimationFrame(function () { queued = false; tick(); }); } }
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  tick();

  /* ---- figures ---------------------------------------------------------------------- */
  var figs = [].slice.call(document.querySelectorAll("[data-count]"));
  if (figs.length && "IntersectionObserver" in window && !reduced) {
    var fio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        fio.unobserve(e.target);
        var el = e.target, to = +el.dataset.count, from = to > 1000 ? to - 40 : 0, plus = el.hasAttribute("data-plus") ? "+" : "", t0 = performance.now();
        (function step(now) {
          var u = clamp((now - t0) / 1500, 0, 1), k = 1 - Math.pow(1 - u, 3);
          el.textContent = Math.round(from + (to - from) * k) + (u === 1 ? plus : "");
          if (u < 1) requestAnimationFrame(step);
        })(t0);
      });
    }, { threshold: 0.6 });
    figs.forEach(function (f) { fio.observe(f); });
  }

  /* ---- the commercials: filter ------------------------------------------------------------ */
  var chips = [].slice.call(document.querySelectorAll("[data-filter] .chip"));
  var items = [].slice.call(document.querySelectorAll("[data-works] .wk"));
  var all = document.querySelector('[data-n="*"]');
  if (all) all.textContent = items.length;
  chips.forEach(function (c) {
    c.addEventListener("click", function () {
      var f = c.dataset.f;
      chips.forEach(function (o) { o.setAttribute("aria-pressed", String(o === c)); });
      var k = 0;
      items.forEach(function (it) {
        var on = f === "*" || it.dataset.sec === f;
        it.classList.toggle("is-out", !on);
        if (on) { it.style.setProperty("--i", k % 8); k++; }
      });
    });
  });
  document.querySelectorAll(".wk__media img").forEach(function (img) {
    var mark = function () { var m = img.parentNode; m.classList.add("is-broken"); m.setAttribute("data-brand", img.alt.split(" — ")[0]); };
    if (img.complete && !img.naturalWidth) mark(); else img.addEventListener("error", mark);
  });

  /* ---- the player -------------------------------------------------------------------------- */
  var dlg = document.querySelector("[data-player]");
  if (dlg) {
    var vid = dlg.querySelector("video"), seek = dlg.querySelector("[data-p-seek]");
    var tcEl = dlg.querySelector("[data-p-tc]"), durEl = dlg.querySelector("[data-p-dur]");
    var brandEl = dlg.querySelector("[data-p-brand]"), titleEl = dlg.querySelector("[data-p-title]");
    var muteBtn = dlg.querySelector("[data-p-mute]");
    var list_ = function () { return items.filter(function (it) { return !it.classList.contains("is-out") && it.querySelector("[data-video]"); }).map(function (it) { return it.querySelector("[data-video]"); }); };
    var cur = null, opener = null;
    var fmt = function (t) { t = Math.max(0, t || 0); var m = Math.floor(t / 60), s = Math.floor(t % 60), fr = Math.floor((t % 1) * FPS); return pad2(m) + ":" + pad2(s) + ":" + pad2(fr); };
    function load(btn) {
      cur = btn;
      brandEl.textContent = btn.dataset.brand; titleEl.textContent = btn.dataset.title;
      vid.removeAttribute("poster"); vid.src = btn.dataset.video;          /* the cover is a portrait crop: the film opens on its own first frame */
      seek.value = 0; seek.style.setProperty("--p", "0%"); tcEl.textContent = "00:00:00"; durEl.textContent = "--:--";
      var pr = vid.play(); if (pr && pr.catch) pr.catch(function () {});
    }
    function open(btn) {
      opener = btn;
      if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
      html.classList.add("has-modal");
      load(btn);
    }
    function close() {
      vid.pause(); vid.removeAttribute("src"); vid.load();
      if (dlg.open && typeof dlg.close === "function") dlg.close(); else dlg.removeAttribute("open");
      html.classList.remove("has-modal");
      if (opener) opener.focus();
    }
    function step(d) {
      var l = list_(), i = l.indexOf(cur);
      if (!l.length) return;
      load(l[(i + d + l.length) % l.length]);
    }
    document.querySelectorAll("[data-works] [data-video]").forEach(function (b) { b.addEventListener("click", function () { open(b); }); });
    dlg.querySelector("[data-p-close]").addEventListener("click", close);
    dlg.querySelector("[data-p-prev]").addEventListener("click", function () { step(-1); });
    dlg.querySelector("[data-p-next]").addEventListener("click", function () { step(1); });
    dlg.querySelector("[data-p-play]").addEventListener("click", function () { if (vid.paused) vid.play(); else vid.pause(); });
    vid.addEventListener("click", function () { if (vid.paused) vid.play(); else vid.pause(); });
    muteBtn.addEventListener("click", function () { vid.muted = !vid.muted; muteBtn.classList.toggle("is-on", vid.muted); });
    vid.addEventListener("play", function () { dlg.classList.add("is-playing"); });
    /* while the film is still on its way (it streams from the agency's own server), a quiet sign that it is coming */
    ["loadstart", "waiting", "stalled"].forEach(function (ev) { vid.addEventListener(ev, function () { dlg.classList.add("is-wait"); }); });
    ["canplay", "playing", "pause", "error"].forEach(function (ev) { vid.addEventListener(ev, function () { dlg.classList.remove("is-wait"); }); });
    vid.addEventListener("pause", function () { dlg.classList.remove("is-playing"); });
    vid.addEventListener("ended", function () { dlg.classList.remove("is-playing"); if (dlg.open) step(1); });   /* a showreel: the next film follows */
    var reelBtn = document.querySelector("[data-showreel]");
    if (reelBtn) reelBtn.addEventListener("click", function () { var l = list_(); if (l.length) open(l[0]); });
    vid.addEventListener("loadedmetadata", function () { durEl.textContent = fmt(vid.duration).slice(0, 5); });
    vid.addEventListener("timeupdate", function () {
      if (!vid.duration) return;
      var p = vid.currentTime / vid.duration;
      if (!seek.matches(":active")) seek.value = Math.round(p * 1000);
      seek.style.setProperty("--p", (p * 100).toFixed(2) + "%");
      tcEl.textContent = fmt(vid.currentTime);
    });
    seek.addEventListener("input", function () { if (vid.duration) vid.currentTime = (seek.value / 1000) * vid.duration; });
    dlg.addEventListener("cancel", function (e) { e.preventDefault(); close(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) close(); });
    dlg.addEventListener("keydown", function (e) {
      if (e.target === seek && (e.key === "ArrowLeft" || e.key === "ArrowRight")) return;
      if (e.key === " " || e.key === "k") { e.preventDefault(); if (vid.paused) vid.play(); else vid.pause(); }
      else if (e.key === "ArrowRight") { vid.currentTime = Math.min(vid.duration || 0, vid.currentTime + 5); }
      else if (e.key === "ArrowLeft") { vid.currentTime = Math.max(0, vid.currentTime - 5); }
      else if (e.key === "ArrowDown") { e.preventDefault(); step(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); step(-1); }
      else if (e.key === "m") { muteBtn.click(); }
    });
  }


  /* ---- the phone's menu ------------------------------------------------------------------------- */
  var menu = document.querySelector("[data-menu]"), menuBtn = document.querySelector("[data-menu-open]");
  if (menu && menuBtn) {
    [].slice.call(menu.querySelectorAll(".menu__list li")).forEach(function (li, i) { li.style.setProperty("--i", i); });
    var openMenu = function () {
      menu.hidden = false; html.classList.add("has-menu"); menuBtn.setAttribute("aria-expanded", "true");
      requestAnimationFrame(function () { requestAnimationFrame(function () { menu.classList.add("is-open"); }); });
      var c = menu.querySelector("[data-menu-close]"); if (c) c.focus();
    };
    var closeMenu = function (keepFocus) {
      menu.classList.remove("is-open"); html.classList.remove("has-menu"); menuBtn.setAttribute("aria-expanded", "false");
      setTimeout(function () { if (!menu.classList.contains("is-open")) menu.hidden = true; }, reduced ? 0 : 460);
      if (!keepFocus) menuBtn.focus();
    };
    menuBtn.addEventListener("click", openMenu);
    menu.querySelector("[data-menu-close]").addEventListener("click", function () { closeMenu(); });
    menu.querySelectorAll("[data-menu-link]").forEach(function (a) { a.addEventListener("click", function () { closeMenu(true); }); });
    addEventListener("keydown", function (e) { if (e.key === "Escape" && !menu.hidden) closeMenu(); });
  }

  /* ---- the header marks the section on screen ----------------------------------------------------- */
  var links = [].slice.call(document.querySelectorAll(".hdr__link[href^='#']"));
  if (links.length && "IntersectionObserver" in window) {
    var byId = {};
    links.forEach(function (a) { var el = document.getElementById(a.getAttribute("href").slice(1)); if (el) byId[el.id] = a; });
    var spy = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var a = byId[e.target.id]; if (!a) return;
        if (e.isIntersecting) { links.forEach(function (o) { o.removeAttribute("aria-current"); }); a.setAttribute("aria-current", "true"); }
        else if (a.getAttribute("aria-current")) a.removeAttribute("aria-current");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(byId).forEach(function (id) { spy.observe(document.getElementById(id)); });
  }

  /* ---- the works: the film plays under the pointer, and the pointer becomes "play" ------------------- */
  var fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  var grid = document.querySelector("[data-works]"), cur = document.querySelector(".cur");
  if (fine && grid && !reduced) {
    var live = null, timer = 0;
    var stopLive = function () {
      clearTimeout(timer);
      if (!live) return;
      var v = live.v, m = live.m; live = null;
      v.classList.remove("is-on"); m.classList.remove("is-live");
      setTimeout(function () { if (!v.classList.contains("is-on")) v.pause(); }, 600);
    };
    grid.querySelectorAll(".wk__btn[data-video]").forEach(function (b) {
      var m = b.querySelector(".wk__media");
      b.addEventListener("pointerenter", function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          if (live && live.m !== m) stopLive();
          var v = m.querySelector(".wk__live");
          if (!v) {
            v = document.createElement("video"); v.className = "wk__live"; v.muted = true; v.loop = true; v.playsInline = true; v.preload = "auto";
            v.setAttribute("aria-hidden", "true");
            v.addEventListener("playing", function () { if (live && live.v === v) { v.classList.add("is-on"); m.classList.add("is-live"); } });
            v.src = b.dataset.video + "#t=3";
            m.insertBefore(v, m.querySelector(".wk__vf"));
          }
          live = { v: v, m: m };
          var pr = v.play(); if (pr && pr.catch) pr.catch(function () {});
          if (v.readyState >= 3) { v.classList.add("is-on"); m.classList.add("is-live"); }
        }, 260);
      });
      b.addEventListener("pointerleave", stopLive);
      b.addEventListener("click", stopLive);
    });
    if (cur) {
      grid.classList.add("has-cur");
      var tx = -200, ty = -200, cx = -200, cy = -200, on = false, raf = 0;
      var loop = function () {
        cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22;
        cur.style.transform = "translate3d(" + cx.toFixed(1) + "px," + cy.toFixed(1) + "px,0)";
        raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.3 || on ? requestAnimationFrame(loop) : 0;
      };
      grid.addEventListener("pointermove", function (e) {
        tx = e.clientX; ty = e.clientY;
        var over = !!(e.target.closest && e.target.closest(".wk__btn[data-video]"));
        if (over !== on) { on = over; cur.classList.toggle("is-on", on); }
        if (!on) { cx = tx; cy = ty; }
        if (!raf) raf = requestAnimationFrame(loop);
      });
      var hideCur = function () { on = false; cur.classList.remove("is-on"); };
      grid.addEventListener("pointerleave", hideCur);
      grid.querySelectorAll(".wk__btn[data-video]").forEach(function (b) { b.addEventListener("pointerleave", hideCur); b.addEventListener("click", hideCur); });
      addEventListener("scroll", hideCur, { passive: true });
      document.addEventListener("pointerover", function (e) { if (!grid.contains(e.target)) hideCur(); });
    }
  }

  /* ---- services: the clip beside the line ------------------------------------------------------ */
  var svcs = [].slice.call(document.querySelectorAll("[data-sched] .svc"));
  var narrow = matchMedia("(max-width: 980px)");
  function wake(v) { if (!v.src && v.dataset.src) v.src = v.dataset.src; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  svcs.forEach(function (s) {
    var v = s.querySelector("video");
    if (!v) return;
    s.addEventListener("pointerenter", function () { if (!narrow.matches) wake(v); });
    s.addEventListener("focus", function () { wake(v); });
    s.addEventListener("pointerleave", function () { if (!narrow.matches) v.pause(); });
    s.addEventListener("blur", function () { v.pause(); });
  });
  if ("IntersectionObserver" in window) {
    var sio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { var v = e.target.querySelector("video"); if (!v || !narrow.matches) return; if (e.isIntersecting) wake(v); else v.pause(); });
    }, { threshold: 0.6 });
    svcs.forEach(function (s) { sio.observe(s); });
  }

  /* ---- the slate --------------------------------------------------------------------------------- */
  var slate = document.querySelector("[data-slate]");
  if (slate) {
    var note = slate.querySelector("[data-note]");
    var via = "wa";
    slate.querySelectorAll("[data-via]").forEach(function (b) { b.addEventListener("click", function () { via = b.dataset.via; }); });
    slate.addEventListener("submit", function (e) {
      e.preventDefault();
      var fd = new FormData(slate);
      var g = function (k) { return String(fd.get(k) || "").trim(); };
      var mecra = fd.getAll("mecra").map(function (v) { return T(String(v)); });
      if (!g("marka") && !g("ad")) { note.textContent = T("Lütfen markanızı ya da adınızı yazın."); slate.querySelector('[name="marka"]').focus(); return; }
      if (!g("iletisim")) { note.textContent = T("Size nasıl ulaşacağımızı yazın: telefon ya da e-posta."); slate.querySelector('[name="iletisim"]').focus(); return; }
      var lines = [T("Merhaba Dolphin Ajans,"), ""];
      if (g("marka")) lines.push(T("Yapım · Markanız") + ": " + g("marka"));
      if (g("konu")) lines.push(T("Sahne · Ne anlatalım?") + ": " + g("konu"));
      if (mecra.length) lines.push(T("Mecra") + ": " + mecra.join(", "));
      if (g("tarih")) lines.push(T("Tarih · Ne zaman?") + ": " + g("tarih"));
      if (g("ad")) lines.push(T("Yönetmen · Adınız") + ": " + g("ad"));
      lines.push(T("Kamera · Size nasıl ulaşalım?") + ": " + g("iletisim"));
      var text = lines.join("\n");
      var url = via === "mail"
        ? "mailto:murat@dolphinajans.com?subject=" + encodeURIComponent(T("Yeni proje") + (g("marka") ? " — " + g("marka") : "")) + "&body=" + encodeURIComponent(text)
        : "https://wa.me/905326224177?text=" + encodeURIComponent(text);
      note.textContent = T("Motor! Mesajınız hazır.");
      slate.classList.add("is-clap");
      setTimeout(function () { if (via === "mail") location.href = url; else window.open(url, "_blank", "noopener"); }, reduced ? 0 : 420);
      setTimeout(function () { slate.classList.remove("is-clap"); }, 1400);
    });
  }
})();
