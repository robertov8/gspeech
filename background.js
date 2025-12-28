chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "PLAY_AUDIO") {
    // Legacy: kept for direct audio playback requests if any
    handleAudioPlay(msg.data, sendResponse);
    return true;
  } else if (msg.type === "START_PROCESS") {
    // New: Full background processing (Translation + TTS)
    handleFullProcess(msg.payload);
    sendResponse({ success: true }); // Acknowledge immediately
    return false;
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

async function handleFullProcess(payload) {
  const { text, apiKey, wrapperUrl, voice, language } = payload;
  let textToSpeak = text;

  try {
    // 1. Translation Step (if needed)
    if (language === "en") {
      broadcastStatus("Traduzindo para Português...", "success", false, true);
      const { text: translated, duration } = await translateText(
        textToSpeak,
        apiKey,
        wrapperUrl
      );
      textToSpeak = translated;

      if (!textToSpeak) throw new Error("Translation failed");

      // Broadcast translated text
      chrome.runtime
        .sendMessage({
          type: "TRANSLATION_COMPLETE",
          data: { text: textToSpeak, duration: duration },
        })
        .catch(() => {});

      broadcastStatus(
        `Tradução concluída (${formatDuration(duration)}).`,
        "success"
      );

      // Check user preference for English
      if (payload.englishBehavior === "translate_only") {
        broadcastStatus(
          `Traduzido (${formatDuration(duration)}) - Áudio ignorado.`,
          "success",
          true
        );
        return; // STOP HERE
      }
    }

    // 2. TTS Generation Step
    if (wrapperUrl) {
      broadcastStatus("Áudio ignorado (Uso de Wrapper).", "success", true);
      return;
    }

    broadcastStatus("Gerando áudio...", "success", false, true);
    const { audioData, duration } = await fetchTTS(textToSpeak, apiKey, voice);

    // 3. Playback Step
    broadcastStatus(
      `Iniciando reprodução... (${formatDuration(duration)})`,
      "success",
      true,
      true
    ); // Playback started, we can stop loading

    // Instead of playing in background, send data to popup to play in <audio> tag
    chrome.runtime
      .sendMessage({
        type: "AUDIO_READY",
        data: { audioData: audioData, duration: duration },
      })
      .catch(() => {});

    broadcastStatus(
      `Áudio pronto para ouvir (${formatDuration(duration)}).`,
      "success",
      true
    );

    // Legacy/Fallback: If we wanted to keep background playback we would call handleAudioPlay here.
    // But user requested specific controls in UI.
    // await handleAudioPlay(audioData, () => {});
  } catch (error) {
    console.error("Background processing error:", error);
    broadcastStatus(`Erro: ${error.message}`, "error", true);
  }
}

function broadcastStatus(message, type, finished = false, isProgress = false) {
  // Send message to popup if it is open
  chrome.runtime
    .sendMessage({
      type: "STATUS_UPDATE",
      data: { message, type, finished, isProgress },
    })
    .catch(() => {
      // Ignore error if popup is closed and cannot receive message
    });
}

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

async function fetchTTS(text, apiKey, voice) {
  const startTime = performance.now();
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: text }],
          },
        ],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voice,
              },
            },
          },
        },
      }),
    }
  );
  const endTime = performance.now();
  const duration = Math.round(endTime - startTime);

  if (!response.ok) {
    const errData = await response.json();
    throw new Error(
      errData.error?.message || "Erro na requisição para Gemini TTS"
    );
  }

  const data = await response.json();
  const candidate = data.candidates && data.candidates[0];
  const part =
    candidate &&
    candidate.content &&
    candidate.content.parts &&
    candidate.content.parts[0];

  if (
    part &&
    part.inlineData &&
    (part.inlineData.mimeType.startsWith("audio") || true)
  ) {
    return { audioData: part.inlineData.data, duration };
  } else {
    throw new Error(
      "Formato de resposta inesperado do Gemini ou texto retornado."
    );
  }
}

async function handleAudioPlay(base64Data, sendResponse) {
  try {
    // Ensure offscreen document exists
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
    });

    if (existingContexts.length === 0) {
      await chrome.offscreen.createDocument({
        url: "offscreen.html",
        reasons: ["AUDIO_PLAYBACK"],
        justification: "Playback of Gemini TTS audio",
      });
    }

    // Send audio data to offscreen document
    chrome.runtime.sendMessage({
      type: "PLAY_OFFSCREEN_AUDIO",
      target: "offscreen",
      data: base64Data,
    });

    if (sendResponse) sendResponse({ success: true });
  } catch (err) {
    console.error("Error in background script:", err);
    if (sendResponse) sendResponse({ success: false, error: err.message });
  }
}
