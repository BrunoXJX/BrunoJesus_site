(() => {
      const CONTACT_EMAIL = "bruno.asjesuss@gmail.com";
      const CONTACT_API_URL = (() => {
        const configuredApiUrl = window.BRUNO_PORTFOLIO_API_URL;
        if (typeof configuredApiUrl === "string" && configuredApiUrl.trim()) {
          return configuredApiUrl.trim();
        }

        if (window.location.hostname.endsWith("github.io")) {
          return "";
        }

        return window.location.protocol === "file:" ? "http://localhost:3333/api/contact" : "/api/contact";
      })();
      const HERO_TAGLINE = "Transformo processos em soluções digitais.";
      const TERMINAL_TEXT = [
        "$ ping bruno.jesus",
        "> Pacote enviado...",
        "> Ligação estabelecida",
        "> Tempo de resposta: inferior a 1ms",
        "> Estado: Pronto para colaborar",
        "> À espera da tua mensagem..."
      ].join("\n");
      const cleanupCallbacks = [];
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
      const hasFinePointer = window.matchMedia("(pointer:fine)");
      function addCleanup(callback) {
        cleanupCallbacks.push(callback);
      }
      function safeSetBootSeen() {
        try {
          if (window.sessionStorage) {
            window.sessionStorage.setItem("bj-boot-seen", "1");
          }
        } catch {
          // Ignore storage issues and continue.
        }
      }
      function initIcons() {
        if (window.lucide) {
          window.lucide.createIcons();
        }
      }
      const THEME_STORAGE_KEY = "bj-theme";
      const DEFAULT_THEME = "electric";
      const FLOWIX_THEME = "flowix";
      function getStoredTheme() {
        try {
          if (window.localStorage) {
            return window.localStorage.getItem(THEME_STORAGE_KEY) === FLOWIX_THEME ? FLOWIX_THEME : DEFAULT_THEME;
          }
        } catch {
          // Ignore storage issues and use the default theme.
        }
        return document.documentElement.getAttribute("data-theme") === FLOWIX_THEME ? FLOWIX_THEME : DEFAULT_THEME;
      }
      function storeTheme(theme) {
        try {
          if (!window.localStorage) {
            return;
          }
          if (theme === FLOWIX_THEME) {
            window.localStorage.setItem(THEME_STORAGE_KEY, FLOWIX_THEME);
          } else {
            window.localStorage.removeItem(THEME_STORAGE_KEY);
          }
        } catch {
          // Theme switching still works without persistence.
        }
      }
      function applyTheme(theme, shouldAnimate) {
        const isFlowix = theme === FLOWIX_THEME;
        const root = document.documentElement;
        const toggle = document.getElementById("theme-toggle");
        const toggleText = toggle ? toggle.querySelector(".theme-toggle__text") : null;
        const themeColor = document.querySelector("meta[name='theme-color']");
        if (isFlowix) {
          root.setAttribute("data-theme", FLOWIX_THEME);
        } else {
          root.removeAttribute("data-theme");
        }
        if (toggle instanceof HTMLButtonElement) {
          toggle.setAttribute("aria-pressed", String(isFlowix));
          toggle.setAttribute("aria-label", isFlowix ? "Voltar ao tema verde elétrico" : "Ativar tema Flowix azul");
        }
        if (toggleText) {
          toggleText.textContent = isFlowix ? "Verde" : "Azul";
        }
        if (themeColor && themeColor.tagName === "META") {
          themeColor.setAttribute("content", isFlowix ? "#030712" : "#050805");
        }
        if (shouldAnimate && !prefersReducedMotion.matches) {
          const heroName = document.getElementById("hero-name");
          if (heroName) {
            heroName.classList.remove("is-zapping");
            void heroName.offsetWidth;
            heroName.classList.add("is-zapping");
            window.setTimeout(() => heroName.classList.remove("is-zapping"), 420);
          }
        }
      }
      function initThemeToggle() {
        const toggle = document.getElementById("theme-toggle");
        const initialTheme = getStoredTheme();
        applyTheme(initialTheme, false);
        if (!(toggle instanceof HTMLButtonElement)) {
          return;
        }
        const onToggle = () => {
          const nextTheme = document.documentElement.getAttribute("data-theme") === FLOWIX_THEME ? DEFAULT_THEME : FLOWIX_THEME;
          storeTheme(nextTheme);
          applyTheme(nextTheme, true);
        };
        toggle.addEventListener("click", onToggle);
        addCleanup(() => toggle.removeEventListener("click", onToggle));
      }
      function setEmail() {
        const emailDisplay = document.getElementById("contact-email-display");
        if (emailDisplay) {
          emailDisplay.textContent = CONTACT_EMAIL;
          emailDisplay.setAttribute("href", "mailto:" + CONTACT_EMAIL);
        }
      }
      function typeText(node, text, speed) {
        if (!node) {
          return;
        }
        if (prefersReducedMotion.matches) {
          node.textContent = text;
          return;
        }
        let index = 0;
        const tick = () => {
          node.textContent = text.slice(0, index);
          index += 1;
          if (index <= text.length) {
            window.setTimeout(tick, speed);
          }
        };
        tick();
      }
      function initBootScreen(onComplete) {
        const bootScreen = document.getElementById("boot-screen");
        const bootLine = document.getElementById("boot-line");
        const bootLabel = document.getElementById("boot-status-label");
        const bootPercent = document.getElementById("boot-percent");
        const bootBar = document.getElementById("boot-bar-fill");
        const bootSkip = document.getElementById("boot-skip");
        const alreadySeen = document.documentElement.getAttribute("data-boot-seen") === "1";
        if (!bootScreen || !bootLine || !bootLabel || !bootPercent || !bootBar || !bootSkip) {
          document.body.classList.remove("is-booting");
          document.body.classList.add("boot-complete");
          onComplete();
          return;
        }
        const finish = () => {
          safeSetBootSeen();
          document.documentElement.setAttribute("data-boot-seen", "1");
          bootScreen.classList.add("is-hidden");
          document.body.classList.remove("is-booting");
          document.body.classList.add("boot-complete");
          window.setTimeout(() => {
            if (bootScreen.parentNode) {
              bootScreen.parentNode.removeChild(bootScreen);
            }
          }, 420);
          onComplete();
        };
        if (alreadySeen || prefersReducedMotion.matches) {
          document.body.classList.remove("is-booting");
          document.body.classList.add("boot-complete");
          if (bootScreen.parentNode) {
            bootScreen.parentNode.removeChild(bootScreen);
          }
          onComplete();
          return;
        }
        const introText = "> A iniciar Bruno Jesus.exe...";
        const labels = [
          "A carregar competências...",
          "A carregar percurso...",
          "A carregar ambição..."
        ];
        let charIndex = 0;
        let progress = 0;
        let finished = false;
        const writeIntro = () => {
          bootLine.textContent = introText.slice(0, charIndex);
          charIndex += 1;
          if (charIndex <= introText.length) {
            window.setTimeout(writeIntro, 36);
          }
        };
        const intervalId = window.setInterval(() => {
          progress += 4;
          if (progress >= 100) {
            progress = 100;
          }
          bootBar.style.width = progress + "%";
          bootPercent.textContent = progress + "%";
          if (progress < 34) {
            bootLabel.textContent = labels[0];
          } else if (progress < 68) {
            bootLabel.textContent = labels[1];
          } else {
            bootLabel.textContent = labels[2];
          }
          if (progress === 100 && !finished) {
            finished = true;
            window.clearInterval(intervalId);
            window.setTimeout(finish, 220);
          }
        }, 80);
        const skip = () => {
          if (finished) {
            return;
          }
          finished = true;
          window.clearInterval(intervalId);
          bootBar.style.width = "100%";
          bootPercent.textContent = "100%";
          bootLabel.textContent = labels[2];
          finish();
        };
        bootSkip.addEventListener("click", skip);
        addCleanup(() => bootSkip.removeEventListener("click", skip));
        writeIntro();
      }
      function initCustomCursor() {
        const dot = document.querySelector(".cursor-dot");
        const ring = document.querySelector(".cursor-ring");
        if (!dot || !ring || !hasFinePointer.matches || prefersReducedMotion.matches || window.innerWidth < 1024) {
          document.body.classList.add("pointer-disabled");
          return;
        }
        let mouseX = window.innerWidth / 2;
        let mouseY = window.innerHeight / 2;
        let ringX = mouseX;
        let ringY = mouseY;
        let rafId = 0;
        const updateMouse = (event) => {
          mouseX = event.clientX;
          mouseY = event.clientY;
          dot.style.transform = "translate3d(" + mouseX + "px," + mouseY + "px,0) translate(-50%, -50%)";
          document.body.classList.add("cursor-visible");
        };
        const animate = () => {
          ringX += (mouseX - ringX) * 0.16;
          ringY += (mouseY - ringY) * 0.16;
          ring.style.transform = "translate3d(" + ringX + "px," + ringY + "px,0) translate(-50%, -50%)";
          rafId = requestAnimationFrame(animate);
        };
        const hide = () => {
          document.body.classList.remove("cursor-visible");
        };
        window.addEventListener("mousemove", updateMouse, { passive: true });
        document.addEventListener("mouseleave", hide);
        rafId = requestAnimationFrame(animate);
        addCleanup(() => {
          window.removeEventListener("mousemove", updateMouse);
          document.removeEventListener("mouseleave", hide);
          cancelAnimationFrame(rafId);
        });
      }
      function initParticles() {
        const canvas = document.getElementById("hero-particles");
        const hero = document.getElementById("system");
        if (!(canvas instanceof HTMLCanvasElement) || !hero) {
          return;
        }
        if (window.innerWidth < 920 || prefersReducedMotion.matches) {
          return;
        }
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return;
        }
        let width = 0;
        let height = 0;
        let animationFrame = 0;
        let lastFrame = 0;
        let running = true;
        let heroInView = true;
        const particleCount = 24;
        const particles = [];
        const mouse = { x: -9999, y: -9999, active: false };
        const resize = () => {
          const rect = hero.getBoundingClientRect();
          width = rect.width;
          height = rect.height;
          canvas.width = Math.floor(width * window.devicePixelRatio);
          canvas.height = Math.floor(height * window.devicePixelRatio);
          canvas.style.width = width + "px";
          canvas.style.height = height + "px";
          ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
          particles.length = 0;
          for (let index = 0; index < particleCount; index += 1) {
            particles.push({
              x: Math.random() * width,
              y: Math.random() * height,
              vx: (Math.random() - 0.5) * 0.22,
              vy: (Math.random() - 0.5) * 0.22,
              size: 1 + Math.random() * 1.8
            });
          }
        };
        const moveMouse = (event) => {
          const rect = hero.getBoundingClientRect();
          mouse.x = event.clientX - rect.left;
          mouse.y = event.clientY - rect.top;
          mouse.active = true;
        };
        const leaveMouse = () => {
          mouse.active = false;
          mouse.x = -9999;
          mouse.y = -9999;
        };
        const draw = (timestamp) => {
          if (!running || !heroInView) {
            return;
          }
          if (timestamp - lastFrame < 1000 / 60) {
            animationFrame = requestAnimationFrame(draw);
            return;
          }
          lastFrame = timestamp;
          const accentRgb = window.getComputedStyle(document.documentElement).getPropertyValue("--accent-rgb").trim() || "57, 255, 20";
          ctx.clearRect(0, 0, width, height);
          for (let i = 0; i < particles.length; i += 1) {
            const particle = particles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            if (particle.x < -20) particle.x = width + 20;
            if (particle.x > width + 20) particle.x = -20;
            if (particle.y < -20) particle.y = height + 20;
            if (particle.y > height + 20) particle.y = -20;
            if (mouse.active) {
              const dx = particle.x - mouse.x;
              const dy = particle.y - mouse.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance < 120 && distance > 0) {
                const force = (120 - distance) / 1200;
                particle.vx += (dx / distance) * force;
                particle.vy += (dy / distance) * force;
              }
            }
            particle.vx *= 0.99;
            particle.vy *= 0.99;
            particle.vx = Math.max(-0.42, Math.min(0.42, particle.vx));
            particle.vy = Math.max(-0.42, Math.min(0.42, particle.vy));
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(" + accentRgb + ", 0.72)";
            ctx.fill();
          }
          for (let i = 0; i < particles.length; i += 1) {
            for (let j = i + 1; j < particles.length; j += 1) {
              const a = particles[i];
              const b = particles[j];
              const dx = a.x - b.x;
              const dy = a.y - b.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance < 130) {
                const opacity = (1 - distance / 130) * 0.2;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.strokeStyle = "rgba(" + accentRgb + ", " + opacity.toFixed(3) + ")";
                ctx.lineWidth = 1;
                ctx.stroke();
              }
            }
          }
          animationFrame = requestAnimationFrame(draw);
        };
        const onVisibility = () => {
          running = !document.hidden;
          if (running) {
            lastFrame = 0;
            animationFrame = requestAnimationFrame(draw);
          } else {
            cancelAnimationFrame(animationFrame);
          }
        };
        const heroObserver = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            heroInView = entry.isIntersecting;
            if (heroInView && !document.hidden) {
              lastFrame = 0;
              cancelAnimationFrame(animationFrame);
              animationFrame = requestAnimationFrame(draw);
            } else {
              cancelAnimationFrame(animationFrame);
            }
          });
        }, { threshold: 0.05 });
        resize();
        animationFrame = requestAnimationFrame(draw);
        window.addEventListener("resize", resize, { passive: true });
        hero.addEventListener("mousemove", moveMouse, { passive: true });
        hero.addEventListener("mouseleave", leaveMouse);
        document.addEventListener("visibilitychange", onVisibility);
        heroObserver.observe(hero);
        addCleanup(() => {
          running = false;
          cancelAnimationFrame(animationFrame);
          window.removeEventListener("resize", resize);
          hero.removeEventListener("mousemove", moveMouse);
          hero.removeEventListener("mouseleave", leaveMouse);
          document.removeEventListener("visibilitychange", onVisibility);
          heroObserver.disconnect();
        });
      }
      function initHeroTagline() {
        const node = document.getElementById("hero-typewriter");
        typeText(node, HERO_TAGLINE, 60);
      }
      function initNameGlitch() {
        const heroName = document.getElementById("hero-name");
        if (!heroName) {
          return;
        }
        let glitchTimer = 0;
        const triggerGlitch = () => {
          heroName.classList.remove("is-zapping");
          void heroName.offsetWidth;
          heroName.classList.add("is-zapping");
          window.clearTimeout(glitchTimer);
          glitchTimer = window.setTimeout(() => heroName.classList.remove("is-zapping"), 280);
        };
        heroName.addEventListener("mouseenter", triggerGlitch);
        addCleanup(() => {
          heroName.removeEventListener("mouseenter", triggerGlitch);
          window.clearTimeout(glitchTimer);
        });
      }
      function initRevealObserver() {
        const elements = document.querySelectorAll(".reveal");
        if (!elements.length) {
          return;
        }
        if (prefersReducedMotion.matches) {
          elements.forEach((element) => element.classList.add("is-visible"));
          return;
        }
        const observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          });
        }, { threshold: 0.18 });
        elements.forEach((element) => observer.observe(element));
        addCleanup(() => observer.disconnect());
      }
      function initSkills() {
        const skillCards = document.querySelectorAll(".skill-card");
        if (!skillCards.length) {
          return;
        }
        if (prefersReducedMotion.matches) {
          skillCards.forEach((card) => card.classList.add("is-visible"));
          return;
        }
        const observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          });
        }, { threshold: 0.35 });
        skillCards.forEach((card) => observer.observe(card));
        addCleanup(() => observer.disconnect());
      }
      function initTimeline() {
        const timeline = document.getElementById("timeline");
        const progress = document.getElementById("timeline-progress");
        if (!timeline || !progress) {
          return;
        }
        const updateProgress = () => {
          const rect = timeline.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const total = rect.height + viewportHeight * 0.25;
          const visible = viewportHeight - rect.top + viewportHeight * 0.08;
          const ratio = Math.max(0, Math.min(1, visible / total));
          progress.style.setProperty("--timeline-scale", ratio.toFixed(3));
        };
        updateProgress();
        window.addEventListener("scroll", updateProgress, { passive: true });
        window.addEventListener("resize", updateProgress, { passive: true });
        addCleanup(() => {
          window.removeEventListener("scroll", updateProgress);
          window.removeEventListener("resize", updateProgress);
        });
      }
      function initProjectTilt() {
        const cards = document.querySelectorAll(".project-card[data-tilt='true']");
        if (!cards.length || !hasFinePointer.matches || prefersReducedMotion.matches) {
          return;
        }
        cards.forEach((card) => {
          const onMove = (event) => {
            const rect = card.getBoundingClientRect();
            const px = (event.clientX - rect.left) / rect.width;
            const py = (event.clientY - rect.top) / rect.height;
            const rotateY = (px - 0.5) * 16;
            const rotateX = (0.5 - py) * 16;
            card.style.transform =
              "perspective(1000px) rotateX(" + rotateX.toFixed(2) + "deg) rotateY(" + rotateY.toFixed(2) + "deg) scale(1.02)";
          };
          const reset = () => {
            card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)";
          };
          card.addEventListener("mousemove", onMove);
          card.addEventListener("mouseleave", reset);
          card.addEventListener("blur", reset, true);
          addCleanup(() => {
            card.removeEventListener("mousemove", onMove);
            card.removeEventListener("mouseleave", reset);
            card.removeEventListener("blur", reset, true);
          });
        });
      }
      function initStats() {
        const nodes = document.querySelectorAll("[data-countup]");
        if (!nodes.length) {
          return;
        }
        const animate = (node) => {
          const value = Number(node.getAttribute("data-value") || "0");
          const prefix = node.getAttribute("data-prefix") || "";
          const suffix = node.getAttribute("data-suffix") || "";
          if (prefersReducedMotion.matches || prefix === "#") {
            node.textContent = prefix + value + suffix;
            return;
          }
          const start = performance.now();
          const duration = 1200;
          const step = (now) => {
            const progress = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(value * eased);
            node.textContent = prefix + current + suffix;
            if (progress < 1) {
              requestAnimationFrame(step);
            }
          };
          requestAnimationFrame(step);
        };
        const observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              animate(entry.target);
              observer.unobserve(entry.target);
            }
          });
        }, { threshold: 0.4 });
        nodes.forEach((node) => observer.observe(node));
        addCleanup(() => observer.disconnect());
      }
      function initTerminal() {
        const terminalText = document.getElementById("terminal-text");
        const contactSection = document.getElementById("contact");
        if (!terminalText || !contactSection) {
          return;
        }
        let started = false;
        const startTyping = () => {
          if (started) {
            return;
          }
          started = true;
          typeText(terminalText, TERMINAL_TEXT, 26);
        };
        if (prefersReducedMotion.matches) {
          startTyping();
          return;
        }
        const observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              startTyping();
              observer.disconnect();
            }
          });
        }, { threshold: 0.24 });
        observer.observe(contactSection);
        addCleanup(() => observer.disconnect());
      }
      function initContact() {
        const copyButton = document.getElementById("copy-email");
        const tooltip = document.getElementById("copy-tooltip");
        const form = document.getElementById("contact-form");
        const formStatus = document.getElementById("form-status");
        const submitButton = document.getElementById("contact-submit");
        const showTooltip = (message) => {
          if (!tooltip) {
            return;
          }
          tooltip.textContent = message;
          tooltip.classList.add("is-visible");
          window.clearTimeout(showTooltip.timerId);
          showTooltip.timerId = window.setTimeout(() => {
            tooltip.classList.remove("is-visible");
          }, 1500);
        };
        const copyEmail = async () => {
          try {
            if (navigator.clipboard && window.isSecureContext) {
              await navigator.clipboard.writeText(CONTACT_EMAIL);
            } else {
              const tempInput = document.createElement("textarea");
              tempInput.value = CONTACT_EMAIL;
              tempInput.setAttribute("readonly", "");
              tempInput.style.position = "absolute";
              tempInput.style.left = "-9999px";
              document.body.appendChild(tempInput);
              tempInput.select();
              document.execCommand("copy");
              document.body.removeChild(tempInput);
            }
            showTooltip("Copiado!");
          } catch {
            showTooltip("Falha ao copiar");
          }
        };
        if (copyButton) {
          copyButton.addEventListener("click", copyEmail);
          addCleanup(() => copyButton.removeEventListener("click", copyEmail));
        }
        if (!form || !formStatus || !(form instanceof HTMLFormElement)) {
          return;
        }
        const handleSubmit = async (event) => {
          event.preventDefault();
          const formData = new FormData(form);
          const payload = {
            name: String(formData.get("name") || "").trim(),
            email: String(formData.get("email") || "").trim(),
            subject: "Contacto do portfólio",
            message: String(formData.get("message") || "").trim(),
            website: String(formData.get("website") || "").trim()
          };
          if (!payload.name || payload.name.length < 2) {
            formStatus.textContent = "O nome tem de ter pelo menos 2 caracteres.";
            return;
          }
          if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
            formStatus.textContent = "Verifica o endereço de email.";
            return;
          }
          if (!payload.message || payload.message.length < 10) {
            formStatus.textContent = "A mensagem tem de ter pelo menos 10 caracteres.";
            return;
          }
          if (payload.website) {
            formStatus.textContent = "Pedido rejeitado.";
            return;
          }
          if (submitButton instanceof HTMLButtonElement) {
            submitButton.disabled = true;
            submitButton.textContent = "A enviar...";
          }
          formStatus.textContent = "A processar mensagem...";
          const fallbackSuccess = () => {
            formStatus.textContent =
              "Pré-visualização ativa. Para envio real, publica o backend e configura a URL da API.";
            form.reset();
          };
          if (!CONTACT_API_URL) {
            fallbackSuccess();
            if (submitButton instanceof HTMLButtonElement) {
              submitButton.disabled = false;
              submitButton.textContent = "Enviar mensagem";
            }
            return;
          }
          try {
            const response = await fetch(CONTACT_API_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify(payload)
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.success) {
              throw new Error(typeof data.message === "string" ? data.message : "Não foi possível enviar a mensagem.");
            }
            formStatus.textContent =
              typeof data.message === "string" && data.message.includes("Email notification failed")
                ? "Mensagem recebida com sucesso. A notificação por email falhou nesta fase de teste."
                : "Mensagem recebida com sucesso.";
            form.reset();
          } catch {
            fallbackSuccess();
          } finally {
            if (submitButton instanceof HTMLButtonElement) {
              submitButton.disabled = false;
            submitButton.textContent = "Enviar mensagem";
            }
          }
        };
        form.addEventListener("submit", handleSubmit);
        addCleanup(() => form.removeEventListener("submit", handleSubmit));
      }
      function initNavigation() {
        const menuToggle = document.getElementById("menu-toggle");
        const menuClose = document.getElementById("menu-close");
        const overlay = document.getElementById("mobile-overlay");
        const drawer = document.getElementById("mobile-drawer");
        const navProgress = document.getElementById("nav-progress");
        const navLinks = Array.from(document.querySelectorAll("[data-nav-link]"));
        const mobileLinks = drawer ? drawer.querySelectorAll("a") : [];
        const sections = navLinks
          .map((link) => document.querySelector(link.getAttribute("href")))
          .filter(Boolean);
        const openMenu = () => {
          if (!drawer || !overlay || !menuToggle) {
            return;
          }
          drawer.classList.add("is-open");
          overlay.hidden = false;
          requestAnimationFrame(() => overlay.classList.add("is-open"));
          drawer.setAttribute("aria-hidden", "false");
          menuToggle.setAttribute("aria-expanded", "true");
          document.body.classList.add("menu-open");
        };
        const closeMenu = () => {
          if (!drawer || !overlay || !menuToggle) {
            return;
          }
          drawer.classList.remove("is-open");
          overlay.classList.remove("is-open");
          window.setTimeout(() => {
            if (!overlay.classList.contains("is-open")) {
              overlay.hidden = true;
            }
          }, 280);
          drawer.setAttribute("aria-hidden", "true");
          menuToggle.setAttribute("aria-expanded", "false");
          document.body.classList.remove("menu-open");
        };
        if (menuToggle) {
          menuToggle.addEventListener("click", openMenu);
          addCleanup(() => menuToggle.removeEventListener("click", openMenu));
        }
        if (menuClose) {
          menuClose.addEventListener("click", closeMenu);
          addCleanup(() => menuClose.removeEventListener("click", closeMenu));
        }
        if (overlay) {
          overlay.addEventListener("click", closeMenu);
          addCleanup(() => overlay.removeEventListener("click", closeMenu));
        }
        mobileLinks.forEach((link) => {
          link.addEventListener("click", closeMenu);
          addCleanup(() => link.removeEventListener("click", closeMenu));
        });
        const onKeyDown = (event) => {
          if (event.key === "Escape") {
            closeMenu();
          }
        };
        window.addEventListener("keydown", onKeyDown);
        addCleanup(() => window.removeEventListener("keydown", onKeyDown));
        const updateProgress = () => {
          if (!navProgress) {
            return;
          }
          const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
          const ratio = maxScroll > 0 ? window.scrollY / maxScroll : 0;
          navProgress.style.width = (ratio * 100).toFixed(2) + "%";
        };
        updateProgress();
        window.addEventListener("scroll", updateProgress, { passive: true });
        window.addEventListener("resize", updateProgress, { passive: true });
        addCleanup(() => {
          window.removeEventListener("scroll", updateProgress);
          window.removeEventListener("resize", updateProgress);
        });
        if (sections.length) {
          let ticking = false;
          let navLockUntil = 0;
          const getNavHeight = () => {
            const nav = document.querySelector(".site-nav");
            return nav instanceof HTMLElement ? nav.offsetHeight : 72;
          };
          const setActive = (activeId) => {
            navLinks.forEach((link) => {
              const href = link.getAttribute("href") || "";
              const targetId = href.startsWith("#") ? href.slice(1) : "";
              link.classList.toggle("is-active", targetId === activeId);
              if (targetId === activeId) {
                link.setAttribute("aria-current", "page");
              } else {
                link.removeAttribute("aria-current");
              }
            });
          };
          const getActiveSectionId = () => {
            const scrollY = window.scrollY || document.documentElement.scrollTop;
            const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
            if (maxScroll > 0 && scrollY >= maxScroll - 8) {
              return sections[sections.length - 1].id;
            }
            const readLine = scrollY + getNavHeight() + Math.min(window.innerHeight * 0.34, 260);
            let activeId = sections[0].id;
            sections.forEach((section) => {
              const top = section.getBoundingClientRect().top + scrollY;
              if (top <= readLine) {
                activeId = section.id;
              }
            });
            return activeId;
          };
          const updateActive = () => {
            ticking = false;
            setActive(getActiveSectionId());
          };
          const requestActiveUpdate = () => {
            if (Date.now() < navLockUntil) {
              return;
            }
            if (!ticking) {
              ticking = true;
              requestAnimationFrame(updateActive);
            }
          };
          const syncFromHash = () => {
            const targetId = window.location.hash.replace("#", "");
            if (targetId && sections.some((section) => section.id === targetId)) {
              navLockUntil = Date.now() + 900;
              setActive(targetId);
              return;
            }
            requestActiveUpdate();
          };
          navLinks.forEach((link) => {
            const onNavClick = () => {
              const href = link.getAttribute("href") || "";
              if (href.startsWith("#")) {
                navLockUntil = Date.now() + 900;
                setActive(href.slice(1));
              }
            };
            link.addEventListener("click", onNavClick);
            addCleanup(() => link.removeEventListener("click", onNavClick));
          });
          updateActive();
          window.addEventListener("scroll", requestActiveUpdate, { passive: true });
          window.addEventListener("resize", requestActiveUpdate, { passive: true });
          window.addEventListener("hashchange", syncFromHash);
          window.addEventListener("load", syncFromHash, { once: true });
          syncFromHash();
          addCleanup(() => {
            window.removeEventListener("scroll", requestActiveUpdate);
            window.removeEventListener("resize", requestActiveUpdate);
            window.removeEventListener("hashchange", syncFromHash);
          });
        }
      }
      function startExperience() {
        initHeroTagline();
      }
      function init() {
        initThemeToggle();
        setEmail();
        initIcons();
        initCustomCursor();
        initNameGlitch();
        initParticles();
        initRevealObserver();
        initSkills();
        initTimeline();
        initProjectTilt();
        initStats();
        initTerminal();
        initContact();
        initNavigation();
        initBootScreen(startExperience);
      }
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
      } else {
        init();
      }
      window.addEventListener("pagehide", () => {
        cleanupCallbacks.forEach((callback) => {
          try {
            callback();
          } catch {
            // Ignore cleanup failures.
          }
        });
      }, { once: true });
    })();
