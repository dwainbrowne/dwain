// Basic consent mode: no provider is requested before explicit consent.
(function () {
  "use strict";
  if (window.dmAnalytics) return;
  var node = document.getElementById("dm-analytics-config"), config;
  try { config = JSON.parse(node.textContent); } catch (e) { return; }
  var providers = config.providers || {}, key = "dm-consent-v1", ttl = 180 * 86400000;
  var denied = { analytics: false, marketing: false }, choice = readChoice();
  var started = {}, seen = {}, lastPage = {}, locked = false, lastFocus = null;
  var privacySignal = navigator.globalPrivacyControl === true;
  if (privacySignal) choice = denied;

  function readChoice() {
    try {
      var c = JSON.parse(localStorage.getItem(key));
      if (c && c.version === 1 && typeof c.at === "number" && c.at <= Date.now() && Date.now() - c.at < ttl &&
          typeof c.analytics === "boolean" && typeof c.marketing === "boolean") return c;
    } catch (e) {}
    return null;
  }
  function cleanPath(url) {
    var p = url.pathname === "/index.html" ? "/" : url.pathname.replace(/\.html$/, "");
    return config.paths.indexOf(p) !== -1 ? p : null;
  }
  function safeUrl(url, allowAnchors) {
    return /^(dwain\.me|www\.dwain\.me)$/.test(url.hostname) && !!cleanPath(url) && !url.search &&
      (!url.hash || (allowAnchors && config.anchors.indexOf(url.hash.slice(1)) !== -1));
  }
  function eligible(url) {
    if (!safeUrl(url || new URL(location.href), true)) return false;
    if (!document.referrer) return true;
    try { return safeUrl(new URL(document.referrer), false); } catch (e) { return false; }
  }
  function script(name, src) {
    if (document.getElementById("dm-provider-" + name)) return;
    var s = document.createElement("script");
    s.id = "dm-provider-" + name; s.async = true; s.src = src; s.referrerPolicy = "no-referrer";
    document.head.appendChild(s);
  }
  function stub(name) {
    window[name] = function () { (window[name].q = window[name].q || []).push(arguments); };
  }
  function clearCookies() {
    document.cookie.split(";").forEach(function (part) {
      var name = part.trim().split("=")[0];
      if (!/^(_ga(?:_|$)|_gid$|_gat(?:_|$)|_clck$|_clsk$|_fbp$|_fbc$)/.test(name)) return;
      ["", location.hostname, "." + location.hostname, "dwain.me", ".dwain.me"].forEach(function (domain) {
        document.cookie = name + "=; Max-Age=0; path=/; SameSite=Lax" + (domain ? "; domain=" + domain : "");
      });
    });
  }
  function stop() {
    locked = true;
    if (started.ga4) { window["ga-disable-" + providers.ga4] = true; window.gtag("consent", "update", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" }); }
    if (started.clarity) { window.clarity("consentv2", { analytics_Storage: "denied", ad_Storage: "denied" }); window.clarity("stop"); }
    if (started.meta) window.fbq("consent", "revoke");
    clearCookies();
  }
  function start() {
    if (locked || !eligible() || privacySignal) return;
    if (choice && choice.analytics && providers.ga4 && !started.ga4) {
      // Existing unmanaged globals indicate another integration: fail closed.
      if (!window.gtag && !window.dataLayer) {
        window.dataLayer = [];
        window.gtag = function () { window.dataLayer.push(arguments); };
        window.gtag("consent", "default", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
        window.gtag("consent", "update", { analytics_storage: "granted" });
        window.gtag("js", new Date());
        window.gtag("config", providers.ga4, { send_page_view: false, allow_google_signals: false,
          allow_ad_personalization_signals: false, page_location: "https://dwain.me" + cleanPath(new URL(location.href)),
          page_referrer: "", page_title: config.page });
        started.ga4 = true;
        script("ga4", "https://www.googletagmanager.com/gtag/js?id=" + providers.ga4);
      }
    }
    if (choice && choice.analytics && providers.clarity && !started.clarity && !window.clarity) {
      stub("clarity"); started.clarity = true;
      window.clarity("consentv2", { analytics_Storage: "granted", ad_Storage: "denied" });
      script("clarity", "https://www.clarity.ms/tag/" + providers.clarity);
    }
    if (choice && choice.marketing && providers.meta && !started.meta && !window.fbq) {
      var f = window.fbq = function () { f.callMethod ? f.callMethod.apply(f, arguments) : f.queue.push(arguments); };
      window._fbq = f; f.push = f; f.loaded = true; f.version = "2.0"; f.queue = [];
      f("consent", "revoke"); f("set", "autoConfig", false, providers.meta); f("init", providers.meta);
      f("consent", "grant"); started.meta = true;
      script("meta", "https://connect.facebook.net/en_US/fbevents.js");
    }
    pageview();
  }
  function event(name, details, once) {
    if (locked || !eligible() || !choice || privacySignal) return;
    var path = cleanPath(new URL(location.href));
    var data = { page_path: path, page_location: "https://dwain.me" + path, page_referrer: "", page_title: path };
    // No arbitrary objects, labels, URLs, form values, or visitor identifiers.
    if (details && /^(header|footer|content|player|form)$/.test(details.placement || "")) data.placement = details.placement;
    if (details && config.videos.indexOf(details.video_id) !== -1) data.video_id = details.video_id;
    ["ga4", "clarity", "meta"].forEach(function (provider) {
      if (!started[provider] || !(provider === "meta" ? choice.marketing : choice.analytics)) return;
      if (name === "page_view") {
        if (lastPage[provider] === path) return;
        lastPage[provider] = path;
      }
      var token = provider + ":" + path + ":" + name;
      if (once && name !== "page_view" && seen[token]) return;
      if (once && name !== "page_view") seen[token] = true;
      if (provider === "ga4") window.gtag("event", name, data);
      if (provider === "clarity" && name !== "page_view") window.clarity("event", name);
      if (provider === "meta") {
        if (name === "page_view") window.fbq("trackSingle", providers.meta, "PageView");
        else window.fbq("trackSingleCustom", providers.meta, name, data);
      }
    });
  }
  function pageview() { event("page_view", null, true); }
  function save(analytics, marketing) {
    var previous = choice || denied;
    choice = { version: 1, at: Date.now(), analytics: !!analytics && !privacySignal, marketing: !!marketing && !privacySignal };
    try { localStorage.setItem(key, JSON.stringify(choice)); } catch (e) {}
    dialog.hidden = true;
    document.documentElement.classList.remove("dm-modal-open"); document.body.classList.remove("dm-modal-open");
    if (lastFocus) lastFocus.focus();
    if ((previous.analytics && !choice.analytics) || (previous.marketing && !choice.marketing)) {
      stop(); location.reload(); return; // unload every SDK; denied-mode collection must not continue
    }
    start();
  }
  var dialog = document.createElement("div");
  dialog.className = "dm-modal"; dialog.hidden = true; dialog.setAttribute("data-clarity-mask", "True");
  dialog.innerHTML = '<div class="dm-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="dm-cookie-title" tabindex="-1">' +
    '<article class="page-card"><h2 id="dm-cookie-title">Your cookie choices</h2>' +
    '<p>Choose optional analytics and marketing. The site works with both off. <a href="/privacy">Privacy details</a>.</p>' +
    '<p id="dm-cookie-availability"></p><p><label><input type="checkbox" id="dm-cookie-analytics"> Analytics (Google Analytics and masked Clarity recordings)</label></p>' +
    '<p><label><input type="checkbox" id="dm-cookie-marketing"> Marketing (Meta/Facebook Pixel)</label></p>' +
    '<div class="button-row"><button type="button" class="db-button" data-dm-consent="reject">Reject optional</button> ' +
    '<button type="button" class="db-button" data-dm-consent="save">Save choices</button> ' +
    '<button type="button" class="db-button primary" data-dm-consent="all">Allow available</button></div></article></div>';
  document.body.appendChild(dialog);
  var analyticsBox = dialog.querySelector("#dm-cookie-analytics"), marketingBox = dialog.querySelector("#dm-cookie-marketing");
  analyticsBox.disabled = privacySignal || !(providers.ga4 || providers.clarity);
  marketingBox.disabled = privacySignal || !providers.meta;
  var availability = privacySignal ? "Global Privacy Control is on. Optional tracking stays off." :
    Object.keys(providers).length ? "You can change these choices at any time." : "Optional tracking is currently unavailable and stays off.";
  dialog.querySelector("#dm-cookie-availability").textContent = availability;
  var disclosure = document.getElementById("dm-analytics-availability");
  if (disclosure) disclosure.textContent = availability;
  function open() {
    lastFocus = document.activeElement;
    analyticsBox.checked = !!(choice && choice.analytics && !analyticsBox.disabled);
    marketingBox.checked = !!(choice && choice.marketing && !marketingBox.disabled);
    dialog.hidden = false; document.documentElement.classList.add("dm-modal-open"); document.body.classList.add("dm-modal-open");
    dialog.querySelector('[data-dm-consent="reject"]').focus();
  }
  dialog.addEventListener("click", function (e) {
    var b = e.target.closest("[data-dm-consent]"); if (!b) return;
    var action = b.getAttribute("data-dm-consent");
    save(action === "all" ? !analyticsBox.disabled : action === "save" && analyticsBox.checked,
      action === "all" ? !marketingBox.disabled : action === "save" && marketingBox.checked);
  });
  dialog.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { e.preventDefault(); save(false, false); }
    if (e.key !== "Tab") return;
    var items = Array.prototype.slice.call(dialog.querySelectorAll('a[href],button,input:not(:disabled)'));
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("[data-dm-cookie-choices],a[href]"); if (!t) return;
    if (t.hasAttribute("data-dm-cookie-choices")) { open(); return; }
    var url; try { url = new URL(t.href, location.href); } catch (err) { return; }
    var placement = t.closest(".dm-header") ? "header" : t.closest("footer") ? "footer" : "content";
    var data = { placement: placement };
    if (t.matches(".db-button,.dm-menu-cta,.dm-header-cta,.dm-buy-bar a")) event("cta_click", data);
    if ((url.hostname === location.hostname && url.pathname === "/meet") || (url.hostname === "calendly.com" && url.pathname === "/snapsuite/60min")) event("demo_booking_intent", data);
    if ((url.hostname === location.hostname && url.pathname === "/skool") || (url.hostname === "www.skool.com" && url.pathname.indexOf("/vibe-code-to-profit-7601") === 0)) event("community_intent", data);
    if (url.hostname === location.hostname && /^(\/connect|\/consultation\/?)$/.test(url.pathname) && /^(#contact|#request)$/.test(url.hash)) event("contact_intent", data);
    if (t.hasAttribute("data-dm-video") && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      event("video_open", { placement: "player", video_id: t.getAttribute("data-dm-video") });
    }
  });
  var form = document.getElementById("dm-contact-form"), success = document.getElementById("dm-form-success");
  if (form) form.addEventListener("focusin", function () { event("contact_intent", { placement: "form" }, true); });
  if (form && success) new MutationObserver(function () {
    if (form.hidden && !success.hidden) event("contact_submit_success", { placement: "form" }, true);
  }).observe(success, { attributes: true, attributeFilter: ["hidden"] });
  // Current site uses full document navigation, not an SPA. Guard future History API use.
  ["pushState", "replaceState"].forEach(function (method) {
    var original = history[method];
    history[method] = function (state, title, url) {
      if (url != null && !eligible(new URL(url, location.href))) stop();
      var result = original.apply(history, arguments); pageview(); return result;
    };
  });
  window.addEventListener("popstate", function () { if (!eligible()) stop(); else pageview(); });
  window.addEventListener("hashchange", function () { if (!eligible()) stop(); });
  window.addEventListener("storage", function (e) { if (e.key === key || e.key === null) { stop(); location.reload(); } });
  window.dmAnalytics = Object.freeze({ openChoices: open });
  start();
  if (!choice && Object.keys(providers).length && !privacySignal) open();
})();
