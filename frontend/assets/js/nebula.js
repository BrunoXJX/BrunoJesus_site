/*
 * NEBULA — funcionalidades exclusivas do modo roxo.
 * Ativa spotlight nos cartões e contadores animados quando o tema "nebula"
 * está ativo. Marquee e flywheel são CSS puro (escondidos fora do nebula).
 */
(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var spotlightReady = false;
  var counterObserver = null;

  function isNebula() {
    return document.documentElement.getAttribute("data-theme") === "nebula";
  }

  /* ---- Spotlight: gradiente radial que segue o rato nos cartões ---- */

  var SPOT_SELECTOR = [
    ".skill-card",
    ".project-card",
    ".brand-card",
    ".stat-card",
    ".timeline-item",
    ".contact-card",
    ".contact-link",
    ".hero-panel",
    ".lab-panel"
  ].join(", ");

  function setupSpotlight() {
    if (spotlightReady) {
      return;
    }
    spotlightReady = true;
    var cards = document.querySelectorAll(SPOT_SELECTOR);
    cards.forEach(function (card) {
      card.classList.add("nebula-spot");
      var layer = document.createElement("div");
      layer.className = "nebula-spotlight";
      layer.setAttribute("aria-hidden", "true");
      card.appendChild(layer);
      card.addEventListener("pointermove", function (event) {
        if (!isNebula()) {
          return;
        }
        var rect = card.getBoundingClientRect();
        card.style.setProperty("--spot-x", (event.clientX - rect.left) + "px");
        card.style.setProperty("--spot-y", (event.clientY - rect.top) + "px");
      });
    });
  }

  /* ---- Contadores animados (stats bar do hero) ---- */

  function animateCounter(el) {
    var target = Number(el.getAttribute("data-nebula-count"));
    var suffix = el.getAttribute("data-nebula-suffix") || "";
    var prefix = el.getAttribute("data-nebula-prefix") || "";
    if (!Number.isFinite(target)) {
      return;
    }
    if (prefersReducedMotion.matches) {
      el.textContent = prefix + target + suffix;
      return;
    }
    var duration = 1400;
    var start = null;
    function step(timestamp) {
      if (start === null) {
        start = timestamp;
      }
      var progress = Math.min((timestamp - start) / duration, 1);
      // ease-out cúbico para travagem suave no fim
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = prefix + Math.round(eased * target) + suffix;
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    }
    window.requestAnimationFrame(step);
  }

  function setupCounters() {
    var counters = document.querySelectorAll("[data-nebula-count]:not(.nebula-counted)");
    if (!counters.length) {
      return;
    }
    if (!("IntersectionObserver" in window)) {
      counters.forEach(function (el) {
        el.classList.add("nebula-counted");
        animateCounter(el);
      });
      return;
    }
    if (!counterObserver) {
      counterObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && isNebula() && !entry.target.classList.contains("nebula-counted")) {
            entry.target.classList.add("nebula-counted");
            animateCounter(entry.target);
            counterObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.4 });
    }
    counters.forEach(function (el) {
      counterObserver.observe(el);
    });
  }

  /* ---- Reset dos contadores ao sair do nebula (recontam ao voltar) ---- */

  function resetCounters() {
    document.querySelectorAll("[data-nebula-count].nebula-counted").forEach(function (el) {
      el.classList.remove("nebula-counted");
      el.textContent = (el.getAttribute("data-nebula-prefix") || "") + "0" + (el.getAttribute("data-nebula-suffix") || "");
    });
  }

  /* ---- Ativação ---- */

  function activate() {
    setupSpotlight();
    setupCounters();
  }

  function onThemeChange() {
    if (isNebula()) {
      activate();
    } else {
      resetCounters();
    }
  }

  window.addEventListener("bj-theme-change", onThemeChange);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onThemeChange);
  } else {
    onThemeChange();
  }
})();
