chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "PLAY_AUDIO") {
    // Legacy: kept for direct audio playback requests if any
    handleAudioPlay(msg.data, sendResponse);
    return true;
  } else if (msg.type === "TRANSLATE_TEXT") {
    // Handle simple translation request
    translateText(msg.payload.text, msg.payload.apiKey, msg.payload.wrapperUrl)
      .then((result) => {
        sendResponse(result);
      })
      .catch((err) => {
        sendResponse({ error: err.message });
      });
    return true; // Async response
  } else if (msg.type === "TEXT_CAPTURED_FROM_PAGE") {
    // Save to storage immediately, and flag for auto-play
    chrome.storage.local.set({
      lastCapturedText: msg.data.text,
      shouldAutoPlay: true,
    });

    // Attempt to open side panel
    // Note: This requires the sender tab ID
    if (sender.tab && sender.tab.id) {
      chrome.sidePanel
        .open({ tabId: sender.tab.id, windowId: sender.tab.windowId })
        .catch((err) => console.log("Could not open side panel:", err));
    }
  }
});

// Open Side Panel on Action Click
chrome.action.onClicked.addListener((tab) => {
  // Opens the side panel in the current window
  chrome.sidePanel.open({ windowId: tab.windowId });
});

function formatDuration(ms) {
  if (ms > 1000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  return `${ms}ms`;
}

async function translateText(text, apiKey, wrapperUrl) {
  let url, method, body, headers;
  try {
    if (wrapperUrl) {
      // Use Local Wrapper
      url = wrapperUrl.trim();
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = `http://${url}`;
      }

      method = "POST";
      headers = { "Content-Type": "application/json" };
      body = JSON.stringify({
        prompt: `Translate the following text to Portuguese (Brazil). Return ONLY the translated text, nothing else:\n\n${text}`,
      });
    } else {
      // Use Google Gemini API
      url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      method = "POST";
      headers = { "Content-Type": "application/json" };
      body = JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Translate the following text to Portuguese (Brazil). Return ONLY the translated text, nothing else:\n\n${text}`,
              },
            ],
          },
        ],
      });
    }

    const startTime = performance.now();
    const response = await fetch(url, { method, headers, body });
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `Translation API failed: ${response.status} - ${errText}`
      );
    }

    const data = await response.json();
    let translatedText;

    if (wrapperUrl) {
      // Wrapper Format
      translatedText = data.response;
    } else {
      // Gemini API Format
      translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    }

    return { text: translatedText ? translatedText.trim() : null, duration };
  } catch (e) {
    console.error(`Translation error (URL: ${url}):`, e);

    // Add more context to the error for the user
    if (e.message.includes("Failed to fetch")) {
      throw new Error(
        `Falha de conexão com o Wrapper em: ${url}. Verifique se o servidor está rodando e a URL está correta.`
      );
    }

    throw e;
  }
}
