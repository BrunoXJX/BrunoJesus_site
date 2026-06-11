try {
      if (window.sessionStorage && window.sessionStorage.getItem("bj-boot-seen") === "1") {
        document.documentElement.setAttribute("data-boot-seen", "1");
      }
} catch {
      // Ignore session storage issues and keep loading.
    }

try {
      // Default theme is flowix (blue). Stored value can be "electric" (green)
      // or "nebula" (purple); anything else falls back to flowix.
      var storedTheme = window.localStorage ? window.localStorage.getItem("bj-theme") : null;
      if (storedTheme === "electric") {
        // User explicitly chose green — leave attribute unset (:root defaults).
      } else if (storedTheme === "nebula") {
        document.documentElement.setAttribute("data-theme", "nebula");
      } else {
        document.documentElement.setAttribute("data-theme", "flowix");
      }
} catch {
      // Default to flowix blue on any error.
      document.documentElement.setAttribute("data-theme", "flowix");
    }
