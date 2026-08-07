/* Alei Fernandes Santos — site behaviour
   Theme toggle, mobile navigation, active-link marking, email obfuscation. */

(function () {
  "use strict";

  /* ----- Theme -------------------------------------------------------- */

  var STORAGE_KEY = "afs-theme";

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    var btn = document.querySelector(".theme-toggle");
    if (btn) {
      btn.setAttribute(
        "aria-label",
        theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
      );
    }
  }

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark"
      ? "dark"
      : "light";
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".theme-toggle");
    if (!btn) return;
    var next = currentTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (err) {
      /* private mode — theme just won't persist */
    }
  });

  /* Follow the OS only while the visitor hasn't picked a theme themselves. */
  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    var onChange = function (e) {
      var stored = null;
      try {
        stored = localStorage.getItem(STORAGE_KEY);
      } catch (err) {}
      if (!stored) applyTheme(e.matches ? "dark" : "light");
    };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  /* ----- Mobile navigation -------------------------------------------- */

  var navToggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".site-nav");

  if (navToggle && nav) {
    navToggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        nav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.focus();
      }
    });
  }

  /* ----- Active navigation link --------------------------------------- */

  (function markActive() {
    var path = window.location.pathname.replace(/index\.html$/, "");
    if (path.length > 1 && path.slice(-1) !== "/") path += "/";

    var links = document.querySelectorAll(".site-nav a");
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute("href");
      if (href === path) links[i].setAttribute("aria-current", "page");
    }
  })();

  /* ----- Email obfuscation --------------------------------------------
     Addresses are stored split so plain-text scrapers don't pick them up;
     they are assembled here and written into [data-email] elements.       */

  (function emails() {
    var nodes = document.querySelectorAll("[data-user][data-domain]");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var address = el.getAttribute("data-user") + "@" + el.getAttribute("data-domain");
      var a = document.createElement("a");
      a.href = "mailto:" + address;
      a.textContent = address;
      el.textContent = "";
      el.appendChild(a);
    }
  })();

  /* ----- Footer year --------------------------------------------------- */

  var year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
})();
