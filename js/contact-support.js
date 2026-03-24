/**
 * Contact / Support modal + POST /api/contact.
 * Keeps support email private (server-side only).
 */
(function () {
  "use strict";

  function byId(id) {
    return document.getElementById(id);
  }

  function initContactSupport() {
    var modal = byId("contact-modal");
    var form = byId("contact-form");
    var statusEl = byId("contact-form-status");
    var submitBtn = byId("contact-submit");
    var openBtns = document.querySelectorAll("[data-contact-open]");
    var closeEls = document.querySelectorAll("[data-contact-close]");
    if (!modal || !form) return;
    // Force a closed baseline state even if CSS caching is stale.
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    modal.style.display = "none";

    function setStatus(msg, ok) {
      if (!statusEl) return;
      statusEl.textContent = msg || "";
      if (!msg) {
        statusEl.style.color = "";
        return;
      }
      statusEl.style.color = ok ? "#86efac" : "#fca5a5";
    }

    function open() {
      modal.hidden = false;
      modal.setAttribute("aria-hidden", "false");
      modal.style.display = "grid";
      setStatus("", true);
      var nameEl = byId("contact-name");
      if (nameEl) nameEl.focus();
      document.body.style.overflow = "hidden";
    }

    function close() {
      modal.hidden = true;
      modal.setAttribute("aria-hidden", "true");
      modal.style.display = "none";
      document.body.style.overflow = "";
    }

    openBtns.forEach(function (b) {
      b.addEventListener("click", open);
    });

    closeEls.forEach(function (el) {
      el.addEventListener("click", close);
    });
    modal.addEventListener("click", function (e) {
      var t = e && e.target ? e.target : null;
      if (!t) return;
      if (t === modal || (t.getAttribute && t.getAttribute("data-contact-close") != null)) {
        close();
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !modal.hidden) close();
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = String((byId("contact-name") && byId("contact-name").value) || "").trim();
      var email = String((byId("contact-email") && byId("contact-email").value) || "").trim();
      var message = String((byId("contact-message") && byId("contact-message").value) || "").trim();
      var website = String((byId("contact-website") && byId("contact-website").value) || "").trim();

      if (!name || !email || !message) {
        setStatus("Please fill in all required fields.", false);
        return;
      }
      if (message.length < 10) {
        setStatus("Message is too short.", false);
        return;
      }

      var orig = submitBtn ? submitBtn.textContent : "Send message";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending...";
      }
      setStatus("", true);

      fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name,
          email: email,
          message: message,
          website: website
        })
      })
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (j) {
            return { ok: r.ok, body: j };
          });
        })
        .then(function (res) {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = orig;
          }
          if (!res.ok) {
            setStatus((res.body && res.body.error) || "Message could not be sent.", false);
            return;
          }
          setStatus("Message sent successfully.", true);
          form.reset();
        })
        .catch(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = orig;
          }
          setStatus("Message could not be sent. Please try again.", false);
        });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initContactSupport);
  } else {
    initContactSupport();
  }
})();
