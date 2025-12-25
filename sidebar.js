document.addEventListener("DOMContentLoaded", async () => {
  const capturedTextInput = document.getElementById("captured-text");
  const translatedContainer = document.getElementById("translated-container");
  const translatedTextInput = document.getElementById("translated-text");
  const playBtn = document.getElementById("play-btn");
  const settingsBtn = document.getElementById("settings-btn");
  const settingsPanel = document.getElementById("settings-panel");
  const contextKeyInput = document.getElementById("api-key");
  const voiceSelect = document.getElementById("voice-select");
  const languageSelect = document.getElementById("language-select");
  const themeSelect = document.getElementById("theme-select");
  const saveKeyBtn = document.getElementById("save-key");
  const statusMessage = document.getElementById("status-message");
  const loader = document.getElementById("loader");

  const voices = [
    { name: "Zephyr", desc: "Bright" },
    { name: "Puck", desc: "Upbeat" },
    // { name: "Charon", desc: "Informativa" },
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

  // Load saved settings and last text
  chrome.storage.local.get(
    [
      "geminiApiKey",
      "selectedVoice",
      "selectedLanguage",
      "lastCapturedText",
      "theme",
      "lastTranslatedText",
      "lastStatus",
    ],
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

      updateUIForLanguage(); // Init state

      if (result.theme) {
        themeSelect.value = result.theme;
        applyTheme(result.theme);
      } else {
        applyTheme("system");
      }

      // Initialize with saved text if available
      if (result.lastCapturedText) {
        capturedTextInput.value = result.lastCapturedText;
        playBtn.disabled = false;
      }

      if (result.lastTranslatedText) {
        translatedTextInput.value = result.lastTranslatedText;
        translatedContainer.classList.remove("hidden");
      }

      if (result.lastStatus) {
        showStatus(result.lastStatus, "success");
      }
    }
  );

  // Apply theme function
  function applyTheme(theme) {
    if (theme === "system") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.body.setAttribute("data-theme", isDark ? "dark" : "light");
    } else {
      document.body.setAttribute("data-theme", theme);
    }
  }

  // Listen for system theme changes if 'system' is selected
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", (e) => {
      if (themeSelect.value === "system") {
        document.body.setAttribute("data-theme", e.matches ? "dark" : "light");
      }
    });

  // Toggle settings
  settingsBtn.addEventListener("click", () => {
    settingsPanel.classList.toggle("hidden");
  });

  // Save settings
  saveKeyBtn.addEventListener("click", () => {
    const key = contextKeyInput.value.trim();
    const voice = voiceSelect.value;
    const language = languageSelect.value;
    const theme = themeSelect.value;

    if (key) {
      applyTheme(theme); // Apply immediately
      chrome.storage.local.set(
        {
          geminiApiKey: key,
          selectedVoice: voice,
          selectedLanguage: language,
          theme: theme,
        },
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
        const newText = result.trim();
        capturedTextInput.value = newText;
        playBtn.disabled = false;
        // Save new text
        chrome.storage.local.set({ lastCapturedText: newText });
      } else {
        // Only show placeholder if valid text isn't already present (from storage)
        if (!capturedTextInput.value) {
          capturedTextInput.placeholder =
            "Nenhum texto selecionado. Selecione algo na página e reabra a extensão.";
        }
      }
    }
  } catch (err) {
    console.error("Erro ao capturar texto:", err);
    // Might fail on restricted pages like chrome://
  }

  // Play button logic
  playBtn.addEventListener("click", async () => {
    // 1. Re-capture text from active tab to ensure we have the latest selection
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab && tab.id) {
        // Ensure tab exists and has an ID
        const [{ result }] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: () => window.getSelection().toString(),
        });

        if (result && result.trim()) {
          const newText = result.trim();
          capturedTextInput.value = newText;

          // Save new text immediately
          chrome.storage.local.set({ lastCapturedText: newText });
        }
        // If no new text selected, we keep whatever was already in the input (from persistence or previous capture)
      }
    } catch (err) {
      console.error("Erro ao recapturar texto:", err);
      // Continue execution - maybe user manually edited the text area or relies on previous text
    }

    let text = capturedTextInput.value.trim();
    if (!text) {
      showStatus("Nenhum texto encontrado para ler.", "error");
      return;
    }

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
    // Clear previous translation locally
    translatedTextInput.value = "";

    // Clear persisted state
    chrome.storage.local.remove(["lastTranslatedText", "lastStatus"]);

    // Reset audio player
    const audioPlayer = document.getElementById("audio-player");
    if (audioPlayer) {
      audioPlayer.pause();
      audioPlayer.src = "";
      audioPlayer.classList.add("hidden");
    }

    // Dispatch to background for full processing
    chrome.runtime.sendMessage(
      {
        type: "START_PROCESS",
        payload: {
          text: text,
          apiKey: apiKey,
          voice: selectedVoice,
          language: selectedLanguage,
        },
      },
      (response) => {
        if (chrome.runtime.lastError) {
          showStatus(
            `Erro ao iniciar: ${chrome.runtime.lastError.message}`,
            "error"
          );
          setLoading(false);
        } else {
          // Task started successfully
          showStatus("Processando em segundo plano...", "success");
        }
      }
    );
  });

  // Listen for status updates from background
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "STATUS_UPDATE") {
      showStatus(msg.data.message, msg.data.type);

      // Stop loading if error or explicitly finished
      if (msg.data.type === "error" || msg.data.finished) {
        setLoading(false);
      }
    } else if (msg.type === "TRANSLATION_COMPLETE") {
      if (translatedTextInput && translatedContainer) {
        translatedTextInput.value = msg.data.text;
        chrome.storage.local.set({ lastTranslatedText: msg.data.text });
        translatedContainer.classList.remove("hidden");
      }
    } else if (msg.type === "AUDIO_READY") {
      const audioPlayer = document.getElementById("audio-player");
      if (audioPlayer) {
        const base64String = msg.data.audioData;
        // Decode base64 to Blob
        const binaryString = atob(base64String);
        const pcmData = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          pcmData[i] = binaryString.charCodeAt(i);
        }
        // Add WAV header for browser playback
        // (Reusing the addWavHeader logic - need to duplicate it or move to shared,
        // but for now I will paste the helper here to keep it self-contained in this tool call context
        // OR simply play the raw if browser supports it? Chrome needs WAV container typically for raw PCM)

        // Wait, previously offscreen.js had the wav header logic. I need it here too.
        const wavData = addWavHeader(pcmData, 24000, 1, 16);
        const blob = new Blob([wavData], { type: "audio/wav" });
        const url = URL.createObjectURL(blob);

        audioPlayer.src = url;
        audioPlayer.classList.remove("hidden");
        audioPlayer.play();
      }
    }
  });

  // Toggle translated text area based on language selection
  function updateUIForLanguage() {
    if (languageSelect.value === "en") {
      translatedContainer.classList.remove("hidden");
    } else {
      translatedContainer.classList.add("hidden");
      translatedTextInput.value = "";
    }
  }

  languageSelect.addEventListener("change", updateUIForLanguage);

  // Also call on init
  // (We'll add this call inside the storage get callback)

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
    chrome.storage.local.set({ lastStatus: msg });
    statusMessage.style.color = type === "error" ? "#d93025" : "#188038";
  }

  // --- WAV Header Helper ---
  function addWavHeader(pcmData, sampleRate, numChannels, bitsPerSample) {
    const headerLength = 44;
    const dataLength = pcmData.length;
    const fileSize = dataLength + headerLength - 8;
    const buffer = new ArrayBuffer(headerLength + dataLength);
    const view = new DataView(buffer);

    writeString(view, 0, "RIFF");
    view.setUint32(4, fileSize, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
    view.setUint16(32, numChannels * (bitsPerSample / 8), true);
    view.setUint16(34, bitsPerSample, true);
    writeString(view, 36, "data");
    view.setUint32(40, dataLength, true);

    const pcmDataArray = new Uint8Array(buffer, headerLength);
    pcmDataArray.set(pcmData);

    return buffer;
  }

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
});
