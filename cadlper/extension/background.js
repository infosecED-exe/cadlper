let nativePort = null;

function connectNative() {
  if (nativePort) {
    return nativePort;
  }

  try {
    nativePort = chrome.runtime.connectNative("com.cadlper.agent");

    nativePort.onMessage.addListener((msg) => {
      console.log("Native host response:", msg);
    });

    nativePort.onDisconnect.addListener(() => {
      console.warn("Native host disconnected");

      if (chrome.runtime.lastError) {
        console.error("Disconnect reason:", chrome.runtime.lastError.message);
      }

      nativePort = null;
    });

    return nativePort;
  } catch (err) {
    console.error("Failed to connect native host:", err);
    nativePort = null;
    return null;
  }
}

function sendToNative(payload) {
  const port = connectNative();
  if (!port) {
    console.error("Native port unavailable");
    return;
  }

  try {
    port.postMessage(payload);
  } catch (err) {
    console.error("Failed to send to native host:", err);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  sendToNative({
    ts: new Date().toISOString(),
    event: "extension_installed",
    rule: "lifecycle",
    domain: "",
    url: "",
    title: "",
    session_id: "",
    extra: {}
  });
});

chrome.runtime.onStartup.addListener(() => {
  sendToNative({
    ts: new Date().toISOString(),
    event: "browser_startup",
    rule: "lifecycle",
    domain: "",
    url: "",
    title: "",
    session_id: "",
    extra: {}
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const payload = {
    ts: message.ts || new Date().toISOString(),
    event: message.event || "unknown",
    rule: message.rule || "",
    domain: message.domain || "",
    url: message.url || "",
    title: message.title || "",
    session_id: message.session_id || "",
    frame_url: sender?.url || "",
    extra: message.extra || {}
  };

  sendToNative(payload);
  sendResponse({ ok: true });
  return true;
});
