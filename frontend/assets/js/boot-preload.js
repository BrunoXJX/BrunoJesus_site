try {
      if (window.sessionStorage && window.sessionStorage.getItem("bj-boot-seen") === "1") {
        document.documentElement.setAttribute("data-boot-seen", "1");
      }
} catch {
      // Ignore session storage issues and keep loading.
    }
