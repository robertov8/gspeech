document.addEventListener("DOMContentLoaded", async () => {
  const capturedTextInput = document.getElementById("captured-text");
  const playBtn = document.getElementById("play-btn");
  const settingsBtn = document.getElementById("settings-btn");
  const settingsPanel = document.getElementById("settings-panel");
  const contextKeyInput = document.getElementById("api-key");
  const voiceSelect = document.getElementById("voice-select");
  const languageSelect = document.getElementById("language-select");
  const saveKeyBtn = document.getElementById("save-key");
  const statusMessage = document.getElementById("status-message");
  const loader = document.getElementById("loader");

  const voices = [
    { name: "Zephyr", desc: "Bright" },
    { name: "Puck", desc: "Upbeat" },
    { name: "Charon", desc: "Informativa" },
    { name: "Kore", desc: "Firme" },
    { name: "Fenrir", desc: "Excitável" },
    { name: "Leda", desc: "Juventude" },
    { name: "Orus", desc: "Firm" },
    { name: "Aoede", desc: "Breezy" },
    { name: "Callirrhoe", desc: "Tranquila" },
    { name: "Autonoe", desc: "Bright" },
    { name: "Enceladus", desc: "Breathy" },
    { name: "Iapetus", desc: "Limpar" },
    { name: "Umbriel", desc: "Tranquilo" },
    { name: "Algieba", desc: "Suave" },
    { name: "Despina", desc: "Smooth" },
    { name: "Erinome", desc: "Limpar" },
    { name: "Algenib", desc: "Gravelly" },
    { name: "Rasalgethi", desc: "Informativa" },
    { name: "Laomedeia", desc: "Upbeat" },
    { name: "Achernar", desc: "Suave" },
    { name: "Alnilam", desc: "Firme" },
    { name: "Schedar", desc: "Even" },
    { name: "Gacrux", desc: "Adulto" },
    { name: "Pulcherrima", desc: "Avançar" },
    { name: "Achird", desc: "Amigável" },
    { name: "Zubenelgenubi", desc: "Casual" },
    { name: "Vindemiatrix", desc: "Gentil" },
    { name: "Sadachbia", desc: "Lively" },
    { name: "Sadaltager", desc: "Conhecedor" },
    { name: "Sulafat", desc: "Quente" },
  ];

  // Populate voice select
  voices.forEach((voice) => {
    const option = document.createElement("option");
    option.value = voice.name;
    option.textContent = `${voice.name} (${voice.desc})`;
    voiceSelect.appendChild(option);
  });

  // Load saved settings
  chrome.storage.local.get(
    ["geminiApiKey", "selectedVoice", "selectedLanguage"],
    (result) => {
      if (result.geminiApiKey) {
        contextKeyInput.value = result.geminiApiKey;
      } else {
        showStatus(
          "Por favor, configure sua API Key no ícone de engrenagem.",
          "error"
        );
        settingsPanel.classList.remove("hidden");
      }

      if (result.selectedVoice) {
        voiceSelect.value = result.selectedVoice;
      } else {
        voiceSelect.value = "Aoede"; // Default
      }

      if (result.selectedLanguage) {
        languageSelect.value = result.selectedLanguage;
      }
    }
  );

  // Toggle settings
  settingsBtn.addEventListener("click", () => {
    settingsPanel.classList.toggle("hidden");
  });

  // Save settings
  saveKeyBtn.addEventListener("click", () => {
    const key = contextKeyInput.value.trim();
    const voice = voiceSelect.value;
    const language = languageSelect.value;

    if (key) {
      chrome.storage.local.set(
        { geminiApiKey: key, selectedVoice: voice, selectedLanguage: language },
        () => {
          showStatus("Configurações salvas!", "success");
          setTimeout(() => {
            settingsPanel.classList.add("hidden");
            showStatus("", "");
          }, 1500);
        }
      );
    }
  });

  // Capture text from active tab
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab) {
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => window.getSelection().toString(),
      });

      if (result && result.trim()) {
        capturedTextInput.value = result.trim();
        playBtn.disabled = false;
      } else {
        capturedTextInput.placeholder =
          "Nenhum texto selecionado. Selecione algo na página e reabra a extensão.";
      }
    }
  } catch (err) {
    console.error("Erro ao capturar texto:", err);
    // Might fail on restricted pages like chrome://
  }

  // Play button logic
  playBtn.addEventListener("click", async () => {
    let text = capturedTextInput.value.trim();
    if (!text) return;

    const apiKey = contextKeyInput.value.trim();
    const selectedVoice = voiceSelect.value || "Aoede";
    const selectedLanguage = languageSelect.value || "pt-BR";

    if (!apiKey) {
      showStatus("API Key é necessária.", "error");
      settingsPanel.classList.remove("hidden");
      return;
    }

    setLoading(true);
    showStatus("", "");

    try {
      // Translation Step
      if (selectedLanguage === "en") {
        showStatus("Traduzindo para Português...", "success");
        const translatedText = await translateText(text, apiKey);
        if (translatedText) {
          text = translatedText;
          capturedTextInput.value = text; // Update UI with translated text
          showStatus("Tradução concluída. Gerando áudio...", "success");
        } else {
          throw new Error("Falha na tradução.");
        }
      }

      // Note: The user specified 'gemini-2.5-flash-preview-tts'.
      // We will assume this model supports the 'generateContent' method and returns audio data.
      // If there is a specific REST endpoint for TTS, we would use that.
      // Based on standard Gemini API usage, we can request audio as a response modality.
      // However, usually one needs to instruct the model to "speak" or return audio.
      // Since it's a specific TTS model, maybe it behaves like the standard 'generateContent'.

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
                    voiceName: selectedVoice,
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
          errData.error?.message || "Erro na requisição para Gemini"
        );
      }

      const data = await response.json();

      // We expect the response to contain audio content.
      // Usually it's in candidates[0].content.parts[0].inlineData.data (base64)
      // OR candidates[0].content.parts[0].text if it failed to generate audio.
      // Let's inspect the structure safely.

      const candidate = data.candidates && data.candidates[0];
      const part =
        candidate &&
        candidate.content &&
        candidate.content.parts &&
        candidate.content.parts[0];

      if (
        part &&
        part.inlineData &&
        (part.inlineData.mimeType.startsWith("audio") || true) // API might return generic type for PCM
      ) {
        // The API returns raw PCM (s16le, 24kHz)
        playPcmAudio(part.inlineData.data);
      } else if (part && part.text) {
        // Fallback or error if it returned text instead
        console.warn("Model returned text:", part.text);
        showStatus(
          "O modelo retornou texto em vez de áudio. Verifique se o modelo está correto.",
          "error"
        );
      } else {
        throw new Error("Formato de resposta inesperado do Gemini.");
      }
    } catch (error) {
      console.error(error);
      showStatus(`Erro: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  });

  function playPcmAudio(base64String) {
    showStatus("Processando áudio PCM...", "success");

    try {
      const binaryString = atob(base64String);
      const pcmData = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        pcmData[i] = binaryString.charCodeAt(i);
      }

      // Add WAV header
      // Specs from user example: s16le, 24000Hz, 1 channel
      const wavData = addWavHeader(pcmData, 24000, 1, 16);
      const blob = new Blob([wavData], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);

      const audio = new Audio(url);

      const playPromise = audio.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            showStatus("Reproduzindo áudio...", "success");
          })
          .catch((error) => {
            console.error("Playback failed:", error);
            showStatus(
              `Erro ao reproduzir: ${error.name} - ${error.message}`,
              "error"
            );
          });
      }

      audio.onended = () => {
        URL.revokeObjectURL(url);
        showStatus("Reprodução concluída.", "success");
      };
    } catch (e) {
      showStatus(`Erro ao processar áudio: ${e.message}`, "error");
    }
  }

  function addWavHeader(pcmData, sampleRate, numChannels, bitsPerSample) {
    const headerLength = 44;
    const dataLength = pcmData.length;
    const fileSize = dataLength + headerLength - 8;
    const buffer = new ArrayBuffer(headerLength + dataLength);
    const view = new DataView(buffer);

    // RIFF identifier
    writeString(view, 0, "RIFF");
    // file length
    view.setUint32(4, fileSize, true);
    // RIFF type
    writeString(view, 8, "WAVE");
    // format chunk identifier
    writeString(view, 12, "fmt ");
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (raw)
    view.setUint16(20, 1, true);
    // channel count
    view.setUint16(22, numChannels, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate (sample rate * block align)
    view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
    // block align (channel count * bytes per sample)
    view.setUint16(32, numChannels * (bitsPerSample / 8), true);
    // bits per sample
    view.setUint16(34, bitsPerSample, true);
    // data chunk identifier
    writeString(view, 36, "data");
    // data chunk length
    view.setUint32(40, dataLength, true);

    // Write PCM data
    const pcmDataArray = new Uint8Array(buffer, headerLength);
    pcmDataArray.set(pcmData);

    return buffer;
  }

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
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

      if (!response.ok) {
        throw new Error("Translation API failed");
      }

      const data = await response.json();
      const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return translatedText ? translatedText.trim() : null;
    } catch (e) {
      console.error("Translation error:", e);
      throw e;
    }
  }

  function setLoading(isLoading) {
    if (isLoading) {
      playBtn.classList.add("hidden");
      loader.classList.remove("hidden");
    } else {
      playBtn.classList.remove("hidden");
      loader.classList.add("hidden");
    }
  }

  function showStatus(msg, type) {
    statusMessage.textContent = msg;
    statusMessage.style.color = type === "error" ? "#d93025" : "#188038";
  }
});
