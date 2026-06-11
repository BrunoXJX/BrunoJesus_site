/*
 * SIGNAL — experiência scrollytelling do portfólio de Bruno Jesus.
 * Preloader, smooth scroll (Lenis), cenas GSAP/ScrollTrigger, partículas,
 * cursor customizado, contadores e botões magnéticos.
 */
(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isCoarse = window.matchMedia("(pointer: coarse)").matches;
  var isMobile = window.matchMedia("(max-width: 860px)").matches;
  var hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";

  if (hasGsap) {
    window.gsap.registerPlugin(window.ScrollTrigger);
  }

  /* ------------------------------------------------------------------
     Smooth scroll (Lenis) — desativado em reduced motion / touch
     ------------------------------------------------------------------ */
  var lenis = null;
  if (!prefersReducedMotion && !isCoarse && typeof window.Lenis !== "undefined") {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    function raf(time) {
      lenis.raf(time);
      window.requestAnimationFrame(raf);
    }
    window.requestAnimationFrame(raf);
    if (hasGsap) {
      lenis.on("scroll", window.ScrollTrigger.update);
    }
  }

  function scrollToTarget(target) {
    if (lenis) {
      lenis.scrollTo(target, { offset: 0 });
    } else {
      var el = typeof target === "string" ? document.querySelector(target) : target;
      if (el) {
        el.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
      }
    }
  }

  // Âncoras internas passam pelo Lenis
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (event) {
      var href = link.getAttribute("href");
      if (href && href.length > 1 && document.querySelector(href)) {
        event.preventDefault();
        scrollToTarget(href);
      }
    });
  });

  /* ------------------------------------------------------------------
     Preloader
     ------------------------------------------------------------------ */
  function runPreloader(onDone) {
    var preloader = document.getElementById("preloader");
    var count = document.getElementById("preloader-count");
    var fill = document.getElementById("preloader-fill");
    var name = document.getElementById("preloader-name");
    if (!preloader) {
      onDone();
      return;
    }
    if (prefersReducedMotion) {
      preloader.classList.add("is-done");
      document.body.classList.remove("is-loading");
      onDone();
      return;
    }
    var progress = 0;
    var timer = window.setInterval(function () {
      progress = Math.min(progress + 1 + Math.random() * 4, 100);
      var rounded = Math.floor(progress);
      if (count) {
        count.textContent = String(rounded).padStart(3, "0");
      }
      if (fill) {
        fill.style.width = rounded + "%";
      }
      if (name) {
        name.style.clipPath = "inset(0 " + (100 - rounded) + "% 0 0)";
      }
      if (progress >= 100) {
        window.clearInterval(timer);
        window.setTimeout(function () {
          preloader.classList.add("is-done");
          document.body.classList.remove("is-loading");
          window.setTimeout(onDone, 350);
        }, 280);
      }
    }, 28);
  }

  /* ------------------------------------------------------------------
     Hero — split em chars + entrada com stagger + parallax no scroll
     ------------------------------------------------------------------ */
  function splitChars(el) {
    el.querySelectorAll(".word").forEach(function (word) {
      var text = word.textContent;
      word.textContent = "";
      text.split("").forEach(function (ch) {
        var span = document.createElement("span");
        span.className = "char";
        span.textContent = ch;
        word.appendChild(span);
      });
    });
  }

  function initHero() {
    var title = document.getElementById("hero-title");
    if (!title) {
      return;
    }
    splitChars(title);
    if (!hasGsap || prefersReducedMotion) {
      return;
    }
    var chars = title.querySelectorAll(".char");
    window.gsap.from(chars, {
      yPercent: 110,
      rotate: 6,
      duration: 1.1,
      ease: "power4.out",
      stagger: 0.045
    });
    window.gsap.from("#hero-sub-text", {
      opacity: 0,
      y: 30,
      duration: 1,
      delay: 0.6,
      ease: "power3.out"
    });
    // Parallax: as duas linhas afastam-se ao scroll
    window.gsap.to(title.querySelectorAll(".line")[0], {
      xPercent: -12,
      ease: "none",
      scrollTrigger: { trigger: "#cap-00", start: "top top", end: "bottom top", scrub: true }
    });
    window.gsap.to(title.querySelectorAll(".line")[1], {
      xPercent: 12,
      ease: "none",
      scrollTrigger: { trigger: "#cap-00", start: "top top", end: "bottom top", scrub: true }
    });
    window.gsap.to("#hero-canvas", {
      opacity: 0.25,
      ease: "none",
      scrollTrigger: { trigger: "#cap-00", start: "top top", end: "bottom top", scrub: true }
    });
  }

  /* ------------------------------------------------------------------
     Partículas — constelação reativa ao rato (canvas 2D)
     ------------------------------------------------------------------ */
  function initParticles() {
    var canvas = document.getElementById("hero-canvas");
    if (!canvas || prefersReducedMotion) {
      return;
    }
    var ctx = canvas.getContext("2d");
    var particles = [];
    var mouse = { x: -9999, y: -9999 };
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var width = 0;
    var height = 0;
    var running = true;

    function resize() {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var target = Math.min(Math.floor((width * height) / 16000), 110);
      particles = [];
      for (var i = 0; i < target; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          r: 0.8 + Math.random() * 1.6,
          hue: Math.random() < 0.7 ? "168, 107, 255" : (Math.random() < 0.5 ? "232, 121, 249" : "34, 211, 238")
        });
      }
    }

    function frame() {
      if (!running) {
        return;
      }
      ctx.clearRect(0, 0, width, height);
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        // atração suave ao rato
        var dx = mouse.x - p.x;
        var dy = mouse.y - p.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 180 && dist > 0.001) {
          p.x += (dx / dist) * 0.5;
          p.y += (dy / dist) * 0.5;
        }
        if (p.x < 0 || p.x > width) { p.vx *= -1; }
        if (p.y < 0 || p.y > height) { p.vy *= -1; }
        p.x = Math.max(0, Math.min(width, p.x));
        p.y = Math.max(0, Math.min(height, p.y));

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + p.hue + ", 0.7)";
        ctx.fill();

        for (var j = i + 1; j < particles.length; j++) {
          var q = particles[j];
          var ddx = p.x - q.x;
          var ddy = p.y - q.y;
          var d2 = ddx * ddx + ddy * ddy;
          if (d2 < 110 * 110) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = "rgba(160, 107, 255, " + (0.14 * (1 - d2 / (110 * 110))) + ")";
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      window.requestAnimationFrame(frame);
    }

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", function (event) {
      var rect = canvas.getBoundingClientRect();
      mouse.x = event.clientX - rect.left;
      mouse.y = event.clientY - rect.top;
    });
    // pára quando o hero sai do ecrã
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        var visible = entries[0].isIntersecting;
        if (visible && !running) {
          running = true;
          window.requestAnimationFrame(frame);
        } else if (!visible) {
          running = false;
        }
      }).observe(canvas);
    }
    resize();
    window.requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------------
     Manifesto — texto palavra a palavra (pinned via scrub)
     ------------------------------------------------------------------ */
  function initManifesto() {
    var text = document.getElementById("manifesto-text");
    if (!text) {
      return;
    }
    // envolve cada palavra num span .w preservando os .hl
    function wrapWords(node) {
      var children = Array.prototype.slice.call(node.childNodes);
      children.forEach(function (child) {
        if (child.nodeType === Node.TEXT_NODE) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (/^\s+$/.test(part) || part === "") {
              frag.appendChild(document.createTextNode(part));
            } else {
              var span = document.createElement("span");
              span.className = "w";
              span.textContent = part;
              frag.appendChild(span);
            }
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          child.classList.add("w");
        }
      });
    }
    wrapWords(text);
    var words = text.querySelectorAll(".w");
    if (prefersReducedMotion || !hasGsap) {
      words.forEach(function (w) { w.classList.add("is-lit"); });
      return;
    }
    window.ScrollTrigger.create({
      trigger: "#cap-01",
      start: "top 70%",
      end: "bottom 60%",
      scrub: 0.4,
      onUpdate: function (self) {
        var lit = Math.floor(self.progress * words.length);
        words.forEach(function (w, i) {
          w.classList.toggle("is-lit", i <= lit);
        });
      }
    });
    // retrato com reveal
    window.gsap.to("#portrait-img", {
      clipPath: "inset(0% 0 0 0)",
      duration: 1.2,
      ease: "power4.inOut",
      scrollTrigger: { trigger: "#portrait", start: "top 80%" }
    });
  }

  /* ------------------------------------------------------------------
     Percurso — scroll horizontal pinned
     ------------------------------------------------------------------ */
  function initJourney() {
    if (!hasGsap || prefersReducedMotion || isMobile) {
      return;
    }
    var track = document.getElementById("journey-track");
    var viewport = document.getElementById("journey-viewport");
    var fill = document.getElementById("journey-progress-fill");
    if (!track || !viewport) {
      return;
    }
    function distance() {
      return Math.max(track.scrollWidth - window.innerWidth, 0);
    }
    window.gsap.to(track, {
      x: function () { return -distance(); },
      ease: "none",
      scrollTrigger: {
        trigger: "#cap-02",
        start: "top top",
        end: function () { return "+=" + (distance() + window.innerHeight * 0.3); },
        pin: true,
        scrub: 0.6,
        invalidateOnRefresh: true,
        anticipatePin: 1,
        onUpdate: function (self) {
          if (fill) {
            fill.style.width = (self.progress * 100) + "%";
          }
        }
      }
    });
  }

  /* ------------------------------------------------------------------
     Arsenal — stacking cards (sticky + escala via scrub)
     ------------------------------------------------------------------ */
  function initArsenal() {
    if (!hasGsap || prefersReducedMotion) {
      return;
    }
    var cards = document.querySelectorAll("#stack-cards .stack-card");
    cards.forEach(function (card, index) {
      if (index === cards.length - 1) {
        return;
      }
      window.gsap.to(card, {
        scale: 0.92 - (cards.length - index) * 0.004,
        opacity: 0.45,
        ease: "none",
        scrollTrigger: {
          trigger: card,
          start: "top top+=120",
          end: "bottom top",
          scrub: true
        }
      });
    });
  }

  /* ------------------------------------------------------------------
     Números — contadores ao entrar no viewport
     ------------------------------------------------------------------ */
  function initCounters() {
    var counters = document.querySelectorAll("[data-count]");
    if (!counters.length) {
      return;
    }
    function animate(el) {
      var target = Number(el.getAttribute("data-count"));
      var prefix = el.getAttribute("data-prefix") || "";
      if (!Number.isFinite(target)) {
        return;
      }
      if (prefersReducedMotion) {
        el.textContent = prefix + target;
        return;
      }
      var duration = 1300;
      var start = null;
      function step(ts) {
        if (start === null) { start = ts; }
        var progress = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = prefix + Math.round(eased * target);
        if (progress < 1) {
          window.requestAnimationFrame(step);
        }
      }
      window.requestAnimationFrame(step);
    }
    if (!("IntersectionObserver" in window)) {
      counters.forEach(animate);
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animate(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { observer.observe(el); });
  }

  /* ------------------------------------------------------------------
     Contacto — título com entrada + botões magnéticos + copy email
     ------------------------------------------------------------------ */
  function initContact() {
    if (hasGsap && !prefersReducedMotion) {
      var words = document.querySelectorAll("#contact-title .word");
      window.gsap.from(words, {
        yPercent: 120,
        duration: 1,
        ease: "power4.out",
        stagger: 0.12,
        scrollTrigger: { trigger: "#cap-06", start: "top 65%" }
      });
    }

    if (!isCoarse && !prefersReducedMotion) {
      document.querySelectorAll("[data-magnetic]").forEach(function (btn) {
        var label = btn.querySelector("span");
        btn.addEventListener("pointermove", function (event) {
          var rect = btn.getBoundingClientRect();
          var x = (event.clientX - rect.left - rect.width / 2) * 0.3;
          var y = (event.clientY - rect.top - rect.height / 2) * 0.3;
          btn.style.transform = "translate(" + x + "px, " + y + "px)";
          if (label) {
            label.style.transform = "translate(" + x * 0.4 + "px, " + y * 0.4 + "px)";
          }
        });
        btn.addEventListener("pointerleave", function () {
          btn.style.transform = "";
          if (label) {
            label.style.transform = "";
          }
        });
      });
    }

    var copyBtn = document.getElementById("copy-email");
    var feedback = document.getElementById("copy-feedback");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var email = "bruno.asjesuss@gmail.com";
        function done() {
          if (feedback) {
            feedback.classList.add("is-visible");
            window.setTimeout(function () {
              feedback.classList.remove("is-visible");
            }, 2200);
          }
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(email).then(done).catch(done);
        } else {
          done();
        }
      });
    }
  }

  /* ------------------------------------------------------------------
     Cursor customizado
     ------------------------------------------------------------------ */
  function initCursor() {
    var dot = document.querySelector(".cursor-dot");
    var ring = document.querySelector(".cursor-ring");
    if (!dot || !ring || isCoarse) {
      return;
    }
    var pos = { x: -100, y: -100 };
    var ringPos = { x: -100, y: -100 };
    window.addEventListener("pointermove", function (event) {
      pos.x = event.clientX;
      pos.y = event.clientY;
      dot.style.transform = "translate(" + pos.x + "px, " + pos.y + "px)";
      var hoverable = event.target.closest("a, button, .journey-card, .stack-card");
      document.body.classList.toggle("cursor-hover", Boolean(hoverable));
    });
    function follow() {
      ringPos.x += (pos.x - ringPos.x) * 0.16;
      ringPos.y += (pos.y - ringPos.y) * 0.16;
      ring.style.transform = "translate(" + ringPos.x + "px, " + ringPos.y + "px)";
      window.requestAnimationFrame(follow);
    }
    window.requestAnimationFrame(follow);
  }

  /* ------------------------------------------------------------------
     Rail de capítulos + barra de progresso global
     ------------------------------------------------------------------ */
  function initRail() {
    var progress = document.getElementById("scroll-progress");
    var railLinks = document.querySelectorAll(".chapter-rail a");
    var chapters = document.querySelectorAll(".chapter");

    window.addEventListener("scroll", function () {
      if (progress) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + "%";
      }
    }, { passive: true });

    if (!("IntersectionObserver" in window) || !railLinks.length) {
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var id = entry.target.id;
          railLinks.forEach(function (link) {
            link.classList.toggle("is-active", link.getAttribute("data-rail") === id);
          });
        }
      });
    }, { rootMargin: "-40% 0px -50% 0px" });
    chapters.forEach(function (chapter) { observer.observe(chapter); });
  }

  /* ------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------ */
  function boot() {
    initCursor();
    initRail();
    initParticles();
    initManifesto();
    initJourney();
    initArsenal();
    initCounters();
    initContact();
    runPreloader(function () {
      initHero();
      if (hasGsap) {
        window.ScrollTrigger.refresh();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
