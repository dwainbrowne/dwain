// dwain.me additions: video modal, contact form, copy buttons, show-all lists.
// Loaded after the original scripts. Only touches elements with dm- hooks.
(function () {
  "use strict";

  // ---------------- Mobile menu: Esc closes it ----------------
  // (open/close, aria-expanded and close-on-link-click come from the original nav.js)
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    document.querySelectorAll(".nav-toggle[aria-expanded=\"true\"]").forEach(function (btn) {
      var menu = document.getElementById(btn.getAttribute("aria-controls"));
      btn.setAttribute("aria-expanded", "false");
      btn.classList.remove("is-open");
      if (menu) menu.classList.remove("is-open");
      btn.focus();
    });
  });

  // ---------------- Fixed frosted header (Dwain 30-Sep) ----------------
  // dm-scrolled: stronger blur once the page moves. dm-on-light: the dark hero
  // has scrolled out from under the bar, so it switches to light frosted glass
  // with ink text. --dm-header-h lets sticky elements and anchors clear the bar.
  (function () {
    var bar = document.querySelector(".dm-header");
    if (!bar) return;
    var hero = document.querySelector(".site-hero, .page-hero, .dm-f-hero, .dm-links");
    var menu = bar.querySelector(".page-nav-links");
    function measure() {
      if (menu && menu.classList.contains("is-open")) return; // the open menu is not the bar's height
      document.documentElement.style.setProperty("--dm-header-h", bar.offsetHeight + "px");
    }
    function update() {
      bar.classList.toggle("dm-scrolled", (window.pageYOffset || 0) > 8);
      bar.classList.toggle("dm-on-light", !hero || hero.getBoundingClientRect().bottom <= bar.offsetHeight);
    }
    measure();
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", function () { measure(); update(); });
  })();

  // ---------------- Social visitor bar (Dwain 30-Sep) ----------------
  // The <head> router marks <html data-dm-social> when a phone visitor from
  // TikTok, YouTube or Instagram lands on an inner page. Point them to /links.
  (function () {
    var from = document.documentElement.getAttribute("data-dm-social");
    if (!from) return;
    try { if (window.sessionStorage.getItem("dm-bar-closed")) return; } catch (e) {}
    var bar = document.createElement("div");
    bar.className = "dm-social-bar";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Community and courses");
    var link = document.createElement("a");
    link.className = "dm-social-bar-link";
    link.href = "/links?src=" + encodeURIComponent(from);
    link.innerHTML = "<strong>New here?</strong> Start a business from scratch: free community, free course";
    var close = document.createElement("button");
    close.type = "button";
    close.className = "dm-social-bar-close";
    close.setAttribute("aria-label", "Close");
    close.textContent = "×";
    close.addEventListener("click", function () {
      bar.remove();
      try { window.sessionStorage.setItem("dm-bar-closed", "1"); } catch (e) {}
    });
    bar.appendChild(link);
    bar.appendChild(close);
    document.body.appendChild(bar);
  })();

  // ---------------- Video modal ----------------
  // Cards are plain links to YouTube (works without JS). With JS, clicking
  // the thumbnail or title opens a modal and only then creates the iframe.
  var modal = null, lastTrigger = null, keyHandler = null;

  function buildModal() {
    var m = document.createElement("div");
    m.className = "dm-modal";
    m.hidden = true;
    m.innerHTML =
      '<div class="dm-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="dm-modal-title">' +
      '<button class="dm-modal-close" type="button" aria-label="Close video">&times;</button>' +
      '<div class="dm-modal-frame"></div>' +
      '<div class="dm-modal-bar"><p class="dm-modal-title" id="dm-modal-title"></p>' +
      '<a class="dm-modal-link" href="#" target="_blank" rel="noopener">Watch on YouTube</a></div>' +
      "</div>";
    document.body.appendChild(m);
    m.addEventListener("click", function (e) {
      if (e.target === m) closeModal();
    });
    m.querySelector(".dm-modal-close").addEventListener("click", closeModal);
    return m;
  }

  function focusables() {
    return Array.prototype.slice.call(modal.querySelectorAll("button, a[href], iframe"));
  }

  function openModal(id, title, trigger) {
    if (!modal) modal = buildModal();
    modal.querySelector(".dm-modal-dialog").classList.toggle("dm-modal-vertical", trigger.hasAttribute("data-dm-vertical"));
    lastTrigger = trigger;
    var frame = modal.querySelector(".dm-modal-frame");
    frame.innerHTML = "";
    var iframe = document.createElement("iframe");
    iframe.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(id) + "?autoplay=1";
    iframe.title = title;
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    frame.appendChild(iframe);
    modal.querySelector(".dm-modal-title").textContent = title;
    modal.querySelector(".dm-modal-link").href = (trigger.hasAttribute("data-dm-vertical") ? "https://www.youtube.com/shorts/" : "https://www.youtube.com/watch?v=") + encodeURIComponent(id);
    modal.hidden = false;
    document.documentElement.classList.add("dm-modal-open");
    document.body.classList.add("dm-modal-open");
    modal.querySelector(".dm-modal-close").focus();
    keyHandler = function (e) {
      if (e.key === "Escape") { e.preventDefault(); closeModal(); return; }
      if (e.key === "Tab") {
        var f = focusables();
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", keyHandler);
  }

  function closeModal() {
    if (!modal || modal.hidden) return;
    modal.querySelector(".dm-modal-frame").innerHTML = ""; // removes the iframe, stops playback
    modal.hidden = true;
    document.documentElement.classList.remove("dm-modal-open");
    document.body.classList.remove("dm-modal-open");
    document.removeEventListener("keydown", keyHandler);
    if (lastTrigger) lastTrigger.focus();
  }

  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("[data-dm-video]") : null;
    if (!t || e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    openModal(t.getAttribute("data-dm-video"), t.getAttribute("data-dm-title") || "Video", t);
  });

  // Thumbnails: fall back from maxresdefault to hqdefault when missing.
  document.querySelectorAll("img[data-dm-fallback]").forEach(function (img) {
    function swap() {
      if (img.src.indexOf("hqdefault") === -1) img.src = img.getAttribute("data-dm-fallback");
    }
    img.addEventListener("error", swap);
    // YouTube serves a 120x90 placeholder instead of a 404 for missing maxres.
    img.addEventListener("load", function () { if (img.naturalWidth && img.naturalWidth <= 120) swap(); });
    if (img.complete && img.naturalWidth && img.naturalWidth <= 120) swap();
  });

  // ---------------- Video side nav: highlight the current section ----------------
  document.querySelectorAll(".dm-side-nav").forEach(function (nav) {
    var links = Array.prototype.slice.call(nav.querySelectorAll(".dm-side-link"));
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
    if (!("IntersectionObserver" in window)) return;
    var visible = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { visible[en.target.id] = en.isIntersecting; });
      var current = null;
      links.forEach(function (a) { var id = a.getAttribute("href").slice(1); if (!current && visible[id]) current = a; });
      if (!current) return;
      links.forEach(function (a) { a.classList.toggle("dm-active", a === current); if (a === current) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); });
      // keep the active chip in view on the mobile row
      if (nav.scrollWidth > nav.clientWidth) nav.scrollLeft = current.offsetLeft - 20;
    }, { rootMargin: "-20% 0px -60% 0px" });
    Object.keys(byId).forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
  });

  // ---------------- Show all (Lives) ----------------
  document.querySelectorAll("[data-dm-show-all]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var target = document.getElementById(btn.getAttribute("data-dm-show-all"));
      if (!target) return;
      target.classList.add("dm-show-all");
      btn.parentNode.removeChild(btn);
    });
  });

  // ---------------- Copy buttons (bios) ----------------
  document.querySelectorAll("[data-dm-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var src = document.getElementById(btn.getAttribute("data-dm-copy"));
      if (!src) return;
      var label = btn.textContent;
      var done = function () { btn.textContent = "Copied"; setTimeout(function () { btn.textContent = label; }, 1800); };
      var select = function () {
        var r = document.createRange(); r.selectNodeContents(src);
        var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(src.innerText.trim()).then(done, select);
      else select();
    });
  });

  // ---------------- Contact form ----------------
  var form = document.getElementById("dm-contact-form");
  if (!form) return;

  var params = new URLSearchParams(window.location.search);
  var preset = params.get("interest");
  if (preset) {
    Array.prototype.forEach.call(form.interest.options, function (o) { if (o.value === preset) form.interest.value = preset; });
  }

  var statusBox = document.getElementById("dm-form-status");
  var success = document.getElementById("dm-form-success");
  var submit = form.querySelector("button[type=submit]");
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var rules = {
    name: function (v) { return v.length >= 2 && v.length <= 100 ? "" : "Please add your name."; },
    email: function (v) { return EMAIL_RE.test(v) && v.length <= 200 ? "" : "Please add an email address I can reply to."; },
    company: function (v) { return v.length <= 150 ? "" : "That company name is a bit long."; },
    phone: function (v) { return !v || /^[0-9+().\-\s]{7,25}$/.test(v) ? "" : "That phone number doesn't look right. It's optional, so you can leave it blank."; },
    interest: function (v) { return v ? "" : "Pick what you'd like to talk about."; },
    message: function (v) { return v.length >= 10 && v.length <= 5000 ? "" : "Add a short message (at least 10 characters)."; },
  };

  function setError(name, msg) {
    var input = form.elements[name];
    var wrap = input.closest("label");
    wrap.classList.toggle("dm-invalid", !!msg);
    wrap.querySelector(".dm-field-error").textContent = msg;
    input.setAttribute("aria-invalid", msg ? "true" : "false");
  }
  function check(name) {
    var msg = rules[name](form.elements[name].value.trim());
    setError(name, msg);
    return !msg;
  }
  Object.keys(rules).forEach(function (name) {
    var input = form.elements[name];
    input.addEventListener("blur", function () { if (input.value) check(name); });
    input.addEventListener("input", function () { if (input.closest("label").classList.contains("dm-invalid")) check(name); });
  });
  function showError(text) {
    statusBox.textContent = text;
    statusBox.className = "dm-form-status dm-error";
    statusBox.focus();
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    statusBox.className = "dm-form-status";
    var firstBad = null;
    Object.keys(rules).forEach(function (name) { if (!check(name) && !firstBad) firstBad = form.elements[name]; });
    if (firstBad) { firstBad.focus(); return; }
    if (window.location.protocol === "file:") {
      showError("The form needs the site to be served (bun run dev), not opened as a file. You can also book a call at dwain.me/meet.");
      return;
    }
    var data = {};
    new FormData(form).forEach(function (v, k) { data[k] = typeof v === "string" ? v.trim() : v; });
    submit.disabled = true;
    var label = submit.textContent;
    submit.textContent = "Sending...";
    fetch(form.getAttribute("action"), {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(data),
    })
      .then(function (res) { return res.json().catch(function () { return {}; }).then(function (b) { return { res: res, body: b }; }); })
      .then(function (r) {
        if (r.res.ok && r.body.ok) { form.hidden = true; success.hidden = false; success.focus(); return; }
        if (r.body.errors) Object.keys(r.body.errors).forEach(function (n) { if (form.elements[n]) setError(n, r.body.errors[n]); });
        showError(r.body.message || "Something went wrong on my end. Please try again, or book a call at dwain.me/meet.");
      })
      .catch(function () { showError("Couldn't reach the server. Check your connection and try again, or book a call at dwain.me/meet."); })
      .then(function () { submit.disabled = false; submit.textContent = label; });
  });
})();
