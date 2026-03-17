(function () {
  const sessionId = crypto.randomUUID();
  const dedupeMap = new Map();

  const PATTERNS = [
    {
      name: " PIN code",
      regex: /\b[A-Z0-9]{7}\b/g,
      severity: "high"
    },
    {
      name: "Corporate email xyz.com",
      regex: /\b[A-Z0-9._%+-]+@xyz\.com\b/gi,
      severity: "medium"
    },
    {
      name: "Keyword xyz",
      regex: /\bxyz\b/gi,
      severity: "medium"
    },
    {
      name: "Salary keyword",
      regex: /\bsalary\b/gi,
      severity: "high"
    }
  ];

  function nowIso() {
    return new Date().toISOString();
  }

  function shouldSkipDuplicate(key, windowMs = 800) {
    const now = Date.now();
    const last = dedupeMap.get(key);

    if (last && now - last < windowMs) {
      return true;
    }

    dedupeMap.set(key, now);

    if (dedupeMap.size > 300) {
      const cutoff = now - 5000;
      for (const [k, ts] of dedupeMap.entries()) {
        if (ts < cutoff) dedupeMap.delete(k);
      }
    }

    return false;
  }

  function normalizeText(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  function getSelectionText() {
    try {
      const active = document.activeElement;

      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement
      ) {
        const start = active.selectionStart ?? 0;
        const end = active.selectionEnd ?? 0;
        return (active.value || "").slice(start, end);
      }

      return window.getSelection?.().toString() || "";
    } catch {
      return "";
    }
  }

  function findMatches(text) {
    const value = normalizeText(text);
    if (!value) return [];

    const matches = [];

    for (const pattern of PATTERNS) {
      const found = value.match(pattern.regex);
      if (found && found.length) {
        matches.push({
          name: pattern.name,
          severity: pattern.severity,
          samples: Array.from(new Set(found)).slice(0, 3)
        });
      }
    }

    return matches;
  }

  function getTargetMeta(target) {
    if (!(target instanceof Element)) {
      return {
        tag: "",
        type: "",
        name: "",
        id: "",
        is_contenteditable: false
      };
    }

    return {
      tag: target.tagName || "",
      type: target.getAttribute("type") || "",
      name: target.getAttribute("name") || "",
      id: target.id || "",
      is_contenteditable: !!target.isContentEditable
    };
  }

  function sendEvent(event, rule, extra = {}) {
    try {
      if (!chrome?.runtime?.id) {
        console.error("chrome.runtime unavailable");
        return;
      }

      const payload = {
        ts: nowIso(),
        session_id: sessionId,
        event,
        rule,
        domain: location.hostname || "",
        url: location.href || "",
        title: document.title || "",
        extra
      };

      const shouldDedupe =
        event === "page_open" ||
        event === "route_change" ||
        event === "file_selected" ||
        event === "warning_detected";

      if (shouldDedupe) {
        const dedupeKey = JSON.stringify({
          event: payload.event,
          url: payload.url,
          extra: payload.extra
        });

        if (shouldSkipDuplicate(dedupeKey)) {
          return;
        }
      }

      chrome.runtime.sendMessage(payload, () => {
        if (chrome.runtime.lastError) {
          console.error("sendMessage error:", chrome.runtime.lastError.message);
        }
      });
    } catch (err) {
      console.error("sendMessage failed:", err);
    }
  }

  function getFileMeta(fileList) {
    const files = Array.from(fileList || []);
    return {
      filenames: files.map(f => f.name),
      file_count: files.length,
      total_size: files.reduce((sum, f) => sum + (f.size || 0), 0)
    };
  }

  function hasInterestingAction(action) {
    if (!action) return false;

    const value = action.toLowerCase();
    return [
      "upload",
      "attach",
      "send",
      "message",
      "comment",
      "share",
      "ticket",
      "submit"
    ].some(word => value.includes(word));
  }

  function handleClipboard(actionType, eventName, ruleName, e) {
    let text = "";

    if (actionType === "paste") {
      text = normalizeText(e.clipboardData?.getData("text/plain") || "");
    } else {
      text = normalizeText(
        e.clipboardData?.getData("text/plain") || getSelectionText()
      );
    }

    const matches = findMatches(text);
    const target = getTargetMeta(e.target);

    if (matches.length) {
      sendEvent("warning_detected", "pattern_monitor", {
        action: actionType,
        text,
        text_length: text.length,
        matches,
        target
      });
    }

    sendEvent(eventName, ruleName, {
      text,
      text_length: text.length,
      matches,
      target
    });
  }

  sendEvent("page_open", "page_monitor", {
    referrer: document.referrer || ""
  });

  document.addEventListener("copy", (e) => {
    handleClipboard("copy", "copy_detected", "copy_monitor", e);
  });

  document.addEventListener("paste", (e) => {
    handleClipboard("paste", "paste_detected", "paste_monitor", e);
  });

  document.addEventListener("cut", (e) => {
    handleClipboard("cut", "cut_detected", "cut_monitor", e);
  });

  document.addEventListener("change", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.type !== "file") return;

    sendEvent("file_selected", "upload_monitor", getFileMeta(target.files));
  }, true);

  document.addEventListener("submit", (e) => {
    const form = e.target;
    if (!(form instanceof HTMLFormElement)) return;

    const action = form.action || "";
    const method = (form.method || "get").toLowerCase();
    const enctype = form.enctype || "";
    const hasFileInput = !!form.querySelector('input[type="file"]');

    if (method !== "post" && !hasFileInput && !hasInterestingAction(action)) {
      return;
    }

    sendEvent("form_submit", "form_monitor", {
      action,
      method,
      enctype,
      has_file_input: hasFileInput
    });
  }, true);
})();
