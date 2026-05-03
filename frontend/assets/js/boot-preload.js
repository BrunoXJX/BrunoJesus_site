try {
      if (window.sessionStorage && window.sessionStorage.getItem("bj-boot-seen") === "1") {
        document.documentElement.setAttribute("data-boot-seen", "1");
      }
} catch {
      // Ignore session storage issues and keep loading.
    }

try {
      if (window.localStorage && window.localStorage.getItem("bj-theme") === "flowix") {
        document.documentElement.setAttribute("data-theme", "flowix");
      }
} catch {
      // Ignore theme storage issues and keep the default green identity.
    }
