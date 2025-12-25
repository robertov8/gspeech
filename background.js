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
  }
});

// Open Side Panel on Action Click
chrome.action.onClicked.addListener((tab) => {
  // Opens the side panel in the current window
  chrome.sidePanel.open({ windowId: tab.windowId });
});

async function handleFullProcess(payload) {
  const { text, apiKey, voice, language } = payload;
  let textToSpeak = text;

  try {
    // 1. Translation Step (if needed)
    if (language === "en") {
      broadcastStatus("Traduzindo para Português...", "success");
      textToSpeak = await translateText(textToSpeak, apiKey);
      if (!textToSpeak) throw new Error("Translation failed");

      // Broadcast translated text
      chrome.runtime
        .sendMessage({
          type: "TRANSLATION_COMPLETE",
          data: { text: textToSpeak },
        })
        .catch(() => {});

      broadcastStatus("Tradução concluída.", "success");

      // Check user preference for English
      if (payload.englishBehavior === "translate_only") {
        broadcastStatus(
          "Traduzido (Áudio ignorado nas configurações).",
          "success",
          true
        );
        return; // STOP HERE
      }
    }

    // 2. TTS Generation Step
    broadcastStatus("Gerando áudio...", "success");
    const audioData = await fetchTTS(textToSpeak, apiKey, voice);

    // 3. Playback Step
    broadcastStatus("Iniciando reprodução...", "success", true); // Playback started, we can stop loading

    // Instead of playing in background, send data to popup to play in <audio> tag
    chrome.runtime
      .sendMessage({
        type: "AUDIO_READY",
        data: { audioData: audioData },
      })
      .catch(() => {});

    broadcastStatus("Áudio pronto para ouvir.", "success", true);

    // Legacy/Fallback: If we wanted to keep background playback we would call handleAudioPlay here.
    // But user requested specific controls in UI.
    // await handleAudioPlay(audioData, () => {});
  } catch (error) {
    console.error("Background processing error:", error);
    broadcastStatus(`Erro: ${error.message}`, "error", true);
  }
}

function broadcastStatus(message, type, finished = false) {
  // Send message to popup if it is open
  chrome.runtime
    .sendMessage({
      type: "STATUS_UPDATE",
      data: { message, type, finished },
    })
    .catch(() => {
      // Ignore error if popup is closed and cannot receive message
    });
}

async function translateText(text, apiKey) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Translate the following text to Portuguese (Brazil). Return ONLY the translated text, nothing else:\n\n${text}`,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) throw new Error("Translation API failed");

    const data = await response.json();
    const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return translatedText ? translatedText.trim() : null;
  } catch (e) {
    console.error("Translation error:", e);
    throw e;
  }
}

async function fetchTTS(text, apiKey, voice) {
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
    return part.inlineData.data;
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
