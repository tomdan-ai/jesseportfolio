/* Jesse Obong — portfolio behaviour
   Everything here degrades to a complete, readable page if JS never runs. */

(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var wide = function () { return window.matchMedia("(min-width: 900px)").matches; };

  /* ── reveals ─────────────────────────────────────────────── */

  if (!reduced && "IntersectionObserver" in window) {
    document.body.classList.add("js-on");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    document.querySelectorAll("[data-reveal]").forEach(function (el, i) {
      el.style.transitionDelay = (i % 5) * 55 + "ms";
      io.observe(el);
    });
  }

  /* ── counters ────────────────────────────────────────────── */

  document.querySelectorAll("[data-count]").forEach(function (el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    var suffix = el.getAttribute("data-suffix") || "";
    if (reduced || isNaN(target)) return;

    var start = null;
    var dur = 1100;
    el.textContent = "0" + suffix;

    function tick(now) {
      if (start === null) start = now;
      var p = Math.min((now - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });

  /* ── hero ink: slow drifting contour lines ───────────────── */

  var heroCanvas = document.getElementById("heroInk");
  if (heroCanvas) {
    var hctx = heroCanvas.getContext("2d");
    var hw = 0, hh = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);

    function sizeHero() {
      var r = heroCanvas.getBoundingClientRect();
      hw = Math.max(r.width, 1);
      hh = Math.max(r.height, 1);
      heroCanvas.width = hw * dpr;
      heroCanvas.height = hh * dpr;
      hctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function inkColor() {
      return getComputedStyle(document.documentElement).getPropertyValue("--ultra").trim() || "#2b2fd6";
    }

    function drawHero(time) {
      hctx.clearRect(0, 0, hw, hh);
      hctx.strokeStyle = inkColor();
      hctx.lineWidth = 1.1;

      var lines = 16;
      for (var l = 0; l < lines; l++) {
        var base = hh * (0.14 + (l / lines) * 0.82);
        var amp = 16 + l * 2.4;
        hctx.globalAlpha = 0.1 + (l / lines) * 0.22;
        hctx.beginPath();
        for (var x = 0; x <= hw; x += 8) {
          var k = x / hw;
          var y = base
            + Math.sin(k * 5.1 + time * 0.00024 + l * 0.42) * amp
            + Math.sin(k * 11.3 - time * 0.00017 + l * 0.9) * (amp * 0.32);
          if (x === 0) hctx.moveTo(x, y); else hctx.lineTo(x, y);
        }
        hctx.stroke();
      }
      hctx.globalAlpha = 1;
    }

    sizeHero();
    drawHero(0);

    if (!reduced) {
      var heroRaf = function (t) { drawHero(t); requestAnimationFrame(heroRaf); };
      requestAnimationFrame(heroRaf);
    }

    var rsz;
    window.addEventListener("resize", function () {
      clearTimeout(rsz);
      rsz = setTimeout(function () { sizeHero(); drawHero(performance.now()); }, 160);
    });
  }

  /* ── work list: artwork rides the pointer ────────────────── */

  var list = document.getElementById("workList");
  if (list) {
    var hot = null, px = 0, py = 0, cx = 0, cy = 0, following = false;

    list.querySelectorAll(".work-row").forEach(function (row) {
      row.addEventListener("mouseenter", function () {
        if (!wide()) return;
        hot = row;
        row.classList.add("is-hot");
        if (!following) { following = true; requestAnimationFrame(follow); }
      });
      row.addEventListener("mouseleave", function () {
        row.classList.remove("is-hot");
        if (hot === row) hot = null;
      });
    });

    window.addEventListener("mousemove", function (e) { px = e.clientX + 170; py = e.clientY; });

    function follow() {
      cx += (px - cx) * 0.14;
      cy += (py - cy) * 0.14;
      if (hot) {
        var art = hot.querySelector(".w-art");
        if (art) art.style.left = cx + "px", art.style.top = cy + "px";
        requestAnimationFrame(follow);
      } else {
        following = false;
      }
    }
  }

  /* ── easing demos ────────────────────────────────────────── */

  function bezier(x1, y1, x2, y2) {
    function cb(t, a, b) {
      return 3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
    }
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      var lo = 0, hi = 1, t = x, i;
      for (i = 0; i < 24; i++) {
        var cur = cb(t, x1, x2);
        if (Math.abs(cur - x) < 1e-5) break;
        if (cur < x) lo = t; else hi = t;
        t = (lo + hi) / 2;
      }
      return cb(t, y1, y2);
    };
  }

  var FRAME = 1000 / 24;
  var stepped = true;

  var curves = Array.prototype.map.call(document.querySelectorAll(".curve"), function (el) {
    var nums = el.getAttribute("data-bezier").split(",").map(parseFloat);
    return {
      el: el,
      ease: bezier(nums[0], nums[1], nums[2], nums[3]),
      dur: parseInt(el.getAttribute("data-dur"), 10) || 600,
      plot: el.querySelector(".curve-plot"),
      ball: el.querySelector(".ball"),
      track: el.querySelector(".track")
    };
  });

  function tokens() {
    var s = getComputedStyle(document.documentElement);
    return {
      ink: s.getPropertyValue("--ink").trim() || "#141320",
      soft: s.getPropertyValue("--rule").trim() || "rgba(0,0,0,.2)",
      ultra: s.getPropertyValue("--ultra").trim() || "#2b2fd6",
      flare: s.getPropertyValue("--flare").trim() || "#ff4d2e"
    };
  }

  function drawPlot(c, progress) {
    var cv = c.plot;
    if (!cv) return;
    var ctx = cv.getContext("2d");
    var r = cv.getBoundingClientRect();
    var d = Math.min(window.devicePixelRatio || 1, 2);
    if (cv.width !== Math.round(r.width * d)) {
      cv.width = Math.round(r.width * d);
      cv.height = Math.round(r.height * d);
    }
    ctx.setTransform(d, 0, 0, d, 0, 0);
    var w = r.width, h = r.height, pad = 16;
    ctx.clearRect(0, 0, w, h);

    var t = tokens();
    var lo = 0, hi = 1, i, v;
    for (i = 0; i <= 60; i++) {
      v = c.ease(i / 60);
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    var span = hi - lo;
    var X = function (u) { return pad + u * (w - pad * 2); };
    var Y = function (u) { return h - pad - ((u - lo) / span) * (h - pad * 2); };

    ctx.strokeStyle = t.soft;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(1), Y(0));
    ctx.moveTo(X(0), Y(1)); ctx.lineTo(X(1), Y(1));
    ctx.moveTo(X(0), Y(lo)); ctx.lineTo(X(0), Y(hi));
    ctx.stroke();

    ctx.strokeStyle = t.ultra;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (i = 0; i <= 80; i++) {
      var u = i / 80;
      var y = Y(c.ease(u));
      if (i === 0) ctx.moveTo(X(u), y); else ctx.lineTo(X(u), y);
    }
    ctx.stroke();

    var dx = X(progress), dy = Y(c.ease(progress));
    ctx.strokeStyle = t.soft;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(dx, Y(lo)); ctx.lineTo(dx, dy);
    ctx.stroke();

    ctx.fillStyle = t.flare;
    ctx.beginPath();
    ctx.arc(dx, dy, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  if (curves.length) {
    var t0 = performance.now();

    function run(now) {
      var elapsed = now - t0;
      if (stepped) elapsed = Math.floor(elapsed / FRAME) * FRAME;

      curves.forEach(function (c) {
        var cycle = c.dur + 620;
        var local = elapsed % cycle;
        var p = Math.min(local / c.dur, 1);
        var e = c.ease(p);
        if (c.ball && c.track) {
          var reach = c.track.clientWidth - c.ball.offsetWidth;
          c.ball.style.transform = "translate3d(" + (e * reach).toFixed(2) + "px,0,0)";
        }
        drawPlot(c, p);
      });

      requestAnimationFrame(run);
    }

    if (reduced) {
      curves.forEach(function (c) { drawPlot(c, 1); if (c.ball && c.track) c.ball.style.transform = "translate3d(" + (c.track.clientWidth - c.ball.offsetWidth) + "px,0,0)"; });
    } else {
      requestAnimationFrame(run);
    }

    var b24 = document.getElementById("fps24");
    var bSm = document.getElementById("fpsSmooth");
    var hint = document.getElementById("fpsHint");

    function setFps(on) {
      stepped = on;
      b24.classList.toggle("is-on", on);
      bSm.classList.toggle("is-on", !on);
      b24.setAttribute("aria-pressed", String(on));
      bSm.setAttribute("aria-pressed", String(!on));
      hint.textContent = on
        ? "Stepped, the way it looks in After Effects."
        : "Interpolated at your screen's refresh rate.";
    }
    if (b24 && bSm) {
      b24.addEventListener("click", function () { setFps(true); });
      bSm.addEventListener("click", function () { setFps(false); });
    }
  }

  /* ── copy the address ────────────────────────────────────── */

  var copyBtn = document.getElementById("copyBtn");
  var note = document.getElementById("copyNote");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var text = document.getElementById("mail").textContent.trim();
      var done = function () {
        copyBtn.textContent = "Copied";
        note.textContent = "Address on your clipboard.";
        setTimeout(function () {
          copyBtn.textContent = "Copy";
          note.textContent = "Replies within two working days.";
        }, 2400);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, select);
      } else {
        select();
      }
      function select() {
        var range = document.createRange();
        range.selectNodeContents(document.getElementById("mail"));
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        note.textContent = "Selected — press ⌘C / Ctrl+C.";
      }
    });
  }

  /* ── pointer ring ────────────────────────────────────────── */

  var ring = document.getElementById("cursor");
  if (ring && !reduced && window.matchMedia("(hover: hover)").matches) {
    var rx = 0, ry = 0, tx = 0, ty = 0, started = false;

    window.addEventListener("mousemove", function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!started) { started = true; rx = tx; ry = ty; ring.classList.add("is-on"); glide(); }
    });

    function glide() {
      rx += (tx - rx) * 0.2;
      ry += (ty - ry) * 0.2;
      ring.style.transform = "translate3d(" + rx + "px," + ry + "px,0) translate(-50%,-50%)";
      requestAnimationFrame(glide);
    }

    document.querySelectorAll("a, button").forEach(function (el) {
      el.addEventListener("mouseenter", function () { ring.classList.add("is-big"); });
      el.addEventListener("mouseleave", function () { ring.classList.remove("is-big"); });
    });
  }
})();
