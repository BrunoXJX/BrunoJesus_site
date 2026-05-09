try {
      if (window.sessionStorage && window.sessionStorage.getItem("bj-boot-seen") === "1") {
        document.documentElement.setAttribute("data-boot-seen", "1");
      }
} catch {
      // Ignore session storage issues and keep loading.
    }

try {
      // Default theme is flowix (blue). Only switch to green if explicitly stored.
      if (window.localStorage && window.localStorage.getItem("bj-theme") === "electric") {
        // User explicitly chose green — do NOT set flowix
      } else {
        document.documentElement.setAttribute("data-theme", "flowix");
      }
} catch {
      // Default to flowix blue on any error.
      document.documentElement.setAttribute("data-theme", "flowix");
    }
