/**
 * Google Identity Services — sign-in button + session (sessionStorage).
 * Requires js/site-config.js with a valid Web Client ID.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "acs_google_user";
  var TOKEN_KEY = "acs_google_id_token";
  function currentOrigin() {
    try {
      return window.location && window.location.origin ? window.location.origin : "";
    } catch (e) {
      return "";
    }
  }

  function clientIdTail() {
    try {
      var id = clientId();
      if (!id) return "empty";
      return id.length > 10 ? id.slice(0, 10) + "…(" + id.slice(-5) + ")" : id;
    } catch (e) {
      return "unknown";
    }
  }

  function clientId() {
    return (typeof window !== "undefined" && window.GOOGLE_OAUTH_CLIENT_ID) || "";
  }

  function parseJwt(token) {
    try {
      var b = token.split(".")[1];
      b = b.replace(/-/g, "+").replace(/_/g, "/");
      var raw = atob(b);
      var json = decodeURIComponent(
        raw
          .split("")
          .map(function (c) {
            return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join("")
      );
      return JSON.parse(json);
    } catch (e) {
      return null;
    }
  }

  function readUser() {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    } catch (e) {
      return null;
    }
  }

  function saveUser(profile) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  }

  function clearUser() {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch (e) {}
  }

  var gsiInitialized = false;

  function ensureInit() {
    if (gsiInitialized) return;
    google.accounts.id.initialize({
      client_id: clientId(),
      callback: function (resp) {
        var p = parseJwt(resp.credential);
        if (!p || !p.sub) return;
        // Save raw token for backend usage (usage limits + history).
        try {
          sessionStorage.setItem(TOKEN_KEY, resp.credential);
        } catch (e) {}
        saveUser({
          name: p.name,
          email: p.email,
          picture: p.picture,
          sub: p.sub
        });
        try {
          window.dispatchEvent(new CustomEvent("acs-auth-changed", { detail: { signedIn: true } }));
        } catch (e) {}
        document.querySelectorAll(".google-auth-slot").forEach(renderSlot);
      },
      auto_select: false,
      ux_mode: "popup",
      locale: "en"
    });
    gsiInitialized = true;
  }

  function renderSignedIn(slot, user) {
    slot.innerHTML = "";
    var bar = document.createElement("div");
    bar.className = "google-user-bar";
    if (user.picture) {
      var img = document.createElement("img");
      img.src = user.picture;
      img.alt = "";
      img.className = "google-user-avatar";
      img.width = 28;
      img.height = 28;
      img.referrerPolicy = "no-referrer";
      bar.appendChild(img);
    }
    var name = document.createElement("span");
    name.className = "google-user-name";
    name.textContent = user.name || user.email || "Signed in";
    bar.appendChild(name);
    var out = document.createElement("button");
    out.type = "button";
    out.className = "btn btn-ghost google-sign-out-btn";
    out.textContent = "Sign out";
    out.addEventListener("click", function () {
      clearUser();
      // Immediately hide plan badges so UI updates without page refresh.
      try {
        var toolBadge = document.getElementById("plan-status-badge");
        if (toolBadge) {
          toolBadge.hidden = true;
          toolBadge.classList.remove("plan-pro");
          toolBadge.classList.add("plan-free");
          toolBadge.textContent = "Free plan";
        }
        var homeBadge = document.getElementById("home-plan-status");
        if (homeBadge) {
          homeBadge.hidden = true;
          homeBadge.classList.remove("plan-pro");
          homeBadge.classList.add("plan-free");
          homeBadge.textContent = "Free plan";
        }
      } catch (e) {}
      if (window.google && google.accounts && google.accounts.id) {
        google.accounts.id.disableAutoSelect();
      }
      try {
        window.dispatchEvent(new CustomEvent("acs-auth-changed", { detail: { signedIn: false } }));
      } catch (e) {}
      try {
        document.dispatchEvent(new CustomEvent("acs-auth-changed", { detail: { signedIn: false } }));
      } catch (e) {}
      document.querySelectorAll(".google-auth-slot").forEach(renderSlot);
    });
    bar.appendChild(out);
    slot.appendChild(bar);
  }

  function renderSignedOut(slot) {
    slot.innerHTML = "";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-primary google-signin-custom-btn";
    btn.textContent = "Sign in with Google";
    btn.addEventListener("click", function () {
      try {
        if (window.google && google.accounts && google.accounts.id) {
          ensureInit();
          // Use default prompt UI. Avoid notification callbacks to reduce noisy console warnings.
          google.accounts.id.prompt();
        } else {
          slot.innerHTML =
            '<div style="display:flex; flex-direction:column; gap:6px;">' +
            '<div style="color:#e0e7ff; font-weight:800; font-size:0.9rem;">Sign in unavailable</div>' +
            '<div style="color: rgba(226,232,240,0.85); font-size:0.78rem;">Internet connection is required to load Google sign-in.</div>' +
            '</div>';
        }
      } catch (e) {
        slot.innerHTML =
          '<div style="display:flex; flex-direction:column; gap:6px;">' +
          '<div style="color:#e0e7ff; font-weight:800; font-size:0.9rem;">Sign in unavailable</div>' +
          '<div style="color: rgba(226,232,240,0.85); font-size:0.78rem;">Try again after the connection is restored.</div>' +
          '</div>';
      }
    });
    slot.appendChild(btn);
    // If GIS isn't loaded yet (e.g. offline), keep the button visible.
    // When user clicks, we show an explicit message.
    try {
      if (window.google && google.accounts && google.accounts.id) ensureInit();
    } catch (e) {
      // ignore
    }
  }

  function renderSlot(slot) {
    var user = readUser();
    if (user && user.sub) {
      renderSignedIn(slot, user);
    } else {
      renderSignedOut(slot);
    }
  }

  function boot() {
    var slots = document.querySelectorAll(".google-auth-slot");
    if (!slots.length) return;
    if (!clientId()) {
      slots.forEach(function (slot) {
        slot.innerHTML = "";
      });
      return;
    }
    var n = 0;
    function wait() {
      if (window.google && google.accounts && google.accounts.id) {
        slots.forEach(renderSlot);
        return;
      }
      if (++n > 200) {
        slots.forEach(function (slot) {
          slot.innerHTML =
            '<span style="color:#e0e7ff; font-weight:700; font-size:0.85rem;">Google sign-in couldn’t load.</span><div style="color: rgba(226,232,240,0.85); font-size:0.78rem; margin-top:2px;">Check internet connection and open from dev server URL (not file://).</div>';
        });
        return;
      }
      setTimeout(wait, 50);
    }
    wait();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
