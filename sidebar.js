document.addEventListener("DOMContentLoaded", async () => {
  const capturedTextInput = document.getElementById("captured-text");
  const translatedContainer = document.getElementById("translated-container");
  const translatedTextInput = document.getElementById("translated-text");
  const playBtn = document.getElementById("play-btn");
  const settingsBtn = document.getElementById("settings-btn");
  const settingsPanel = document.getElementById("settings-panel");
  const contextKeyInput = document.getElementById("api-key");
  const wrapperUrlInput = document.getElementById("wrapper-url");
  const voiceSelect = document.getElementById("voice-select");
  const languageSelect = document.getElementById("language-select");
  const englishBehaviorSelect = document.getElementById("english-behavior");
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
      "englishBehavior",
      "lastStatus",
      "englishBehavior",
      "wrapperUrl",
      "shouldAutoPlay",
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

      if (result.wrapperUrl) {
        wrapperUrlInput.value = result.wrapperUrl;
      }

      updateUIForWrapper(); // Apply UI constraints

      if (result.selectedVoice) {
        voiceSelect.value = result.selectedVoice;
      } else {
        voiceSelect.value = "Aoede"; // Default
      }

      if (result.selectedLanguage) {
        languageSelect.value = result.selectedLanguage;
      }

      if (result.englishBehavior) {
        englishBehaviorSelect.value = result.englishBehavior;
      }

      updateUIForLanguage(); // Init state
      updatePlayButtonText(); // Init button text

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

      // Auto-Play Logic (if opened via FAB)
      if (result.shouldAutoPlay) {
        // Clear flag immediately
        chrome.storage.local.set({ shouldAutoPlay: false });

        // Trigger play if we have text
        if (capturedTextInput.value.trim()) {
          setTimeout(() => {
            handlePlay(false);
          }, 1000); // Delay to ensure UI/State is ready
        }
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

  // Toggle settings based on Wrapper URL
  function updateUIForWrapper() {
    const hasWrapper = wrapperUrlInput.value.trim().length > 0;

    contextKeyInput.disabled = hasWrapper;
    voiceSelect.disabled = hasWrapper;

    if (englishBehaviorSelect) {
      englishBehaviorSelect.disabled = hasWrapper;
      if (hasWrapper) {
        englishBehaviorSelect.value = "translate_only";
      }
    }
    updatePlayButtonText();
  }

  wrapperUrlInput.addEventListener("input", updateUIForWrapper);
  if (englishBehaviorSelect) {
    englishBehaviorSelect.addEventListener("change", updatePlayButtonText);
  }

  function updatePlayButtonText() {
    const playBtnText = playBtn.querySelector(".text");
    if (!playBtnText) return;

    const hasWrapper = wrapperUrlInput.value.trim().length > 0;
    const isEnglish = languageSelect.value === "en";

    if (hasWrapper) {
      playBtnText.textContent = "Traduzir";
      return;
    }

    if (isEnglish) {
      const behavior = englishBehaviorSelect
        ? englishBehaviorSelect.value
        : "translate_listen";
      if (behavior === "translate_only") {
        playBtnText.textContent = "Traduzir";
      } else {
        playBtnText.textContent = "Traduzir e Ouvir";
      }
    } else {
      playBtnText.textContent = "Ouvir";
    }
  }

  // Toggle settings
  settingsBtn.addEventListener("click", () => {
    settingsPanel.classList.toggle("hidden");
  });

  // Save settings
  saveKeyBtn.addEventListener("click", () => {
    const key = contextKeyInput.value.trim();
    const wrapper = wrapperUrlInput.value.trim();
    const voice = voiceSelect.value;
    const language = languageSelect.value;

    const englishBehavior = englishBehaviorSelect.value;
    const theme = themeSelect.value;

    if (key) {
      applyTheme(theme); // Apply immediately
      chrome.storage.local.set(
        {
          geminiApiKey: key,
          wrapperUrl: wrapper,
          selectedVoice: voice,
          selectedLanguage: language,
          englishBehavior: englishBehavior,
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
  // Play button logic
  playBtn.addEventListener("click", () => handlePlay(true));

  async function handlePlay(shouldRecapture = true) {
    // 1. Re-capture text from active tab (only if requested)
    if (shouldRecapture) {
      try {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (tab && tab.id) {
          const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => {
              const selection = window.getSelection();
              if (selection.rangeCount === 0) return "";

              const container = document.createElement("div");
              for (let i = 0; i < selection.rangeCount; i++) {
                container.appendChild(selection.getRangeAt(i).cloneContents());
              }

              function getFormattedText(node) {
                let text = "";
                for (const child of node.childNodes) {
                  if (child.nodeType === Node.TEXT_NODE) {
                    text += child.textContent;
                  } else if (child.nodeType === Node.ELEMENT_NODE) {
                    const tagName = child.tagName.toLowerCase();
                    const isBlock = [
                      "p",
                      "div",
                      "h1",
                      "h2",
                      "h3",
                      "h4",
                      "h5",
                      "h6",
                      "li",
                      "tr",
                      "br",
                    ].includes(tagName);

                    if (isBlock && text.length > 0 && !text.endsWith("\n")) {
                      text += "\n";
                    }

                    if (tagName === "li") {
                      text += "• ";
                    }

                    text += getFormattedText(child);

                    if (isBlock && !text.endsWith("\n")) {
                      text += "\n";
                    }
                    if (tagName === "p" && !text.endsWith("\n\n")) {
                      text += "\n";
                    }
                  }
                }
                return text.replace(/ +/g, " ");
              }

              return getFormattedText(container);
            },
          });

          if (result && result.trim()) {
            const newText = result.trim();
            capturedTextInput.value = newText;

            // Save new text immediately
            chrome.storage.local.set({ lastCapturedText: newText });
          }
        }
      } catch (err) {
        console.error("Erro ao recapturar texto:", err);
      }
    }

    let text = capturedTextInput.value.trim();
    if (!text) {
      showStatus("Nenhum texto encontrado para ler.", "error");
      return;
    }

    const apiKey = contextKeyInput.value.trim();
    const wrapperUrl = wrapperUrlInput.value.trim();
    const selectedVoice = voiceSelect.value || "Aoede";
    const selectedLanguage = languageSelect.value || "pt-BR";
    const selectedEnglishBehavior =
      englishBehaviorSelect.value || "translate_listen";

    if (!apiKey && !wrapperUrl) {
      showStatus("API Key é necessária.", "error");
      settingsPanel.classList.remove("hidden");
      return;
    }

    setLoading(true);
    showStatus("", "");
    translatedTextInput.value = "";

    chrome.storage.local.remove(["lastTranslatedText", "lastStatus"]);

    const audioPlayer = document.getElementById("audio-player");
    if (audioPlayer) {
      audioPlayer.pause();
      audioPlayer.src = "";
      audioPlayer.classList.add("hidden");
    }

    chrome.runtime.sendMessage(
      {
        type: "START_PROCESS",
        payload: {
          text: text,
          apiKey: apiKey,
          wrapperUrl: wrapperUrl,
          voice: selectedVoice,
          language: selectedLanguage,
          englishBehavior: selectedEnglishBehavior,
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
          // Started
        }
      }
    );
  }

  // Listen for status updates from background
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "STATUS_UPDATE") {
      showStatus(msg.data.message, msg.data.type, msg.data.isProgress);

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
    } else if (msg.type === "TEXT_CAPTURED_FROM_PAGE") {
      const newText = msg.data.text;
      if (capturedTextInput) {
        capturedTextInput.value = newText;
      }
      chrome.storage.local.set({ lastCapturedText: newText });
      playBtn.disabled = false;

      // Auto-play immediately since panel is open
      handlePlay(false);

      // Ensure flag is cleared (wait for background to set it first to avoid race)
      setTimeout(() => {
        chrome.storage.local.set({ shouldAutoPlay: false });
      }, 500);
    }
  });

  // Toggle translated text area AND english behavior settings based on language
  function updateUIForLanguage() {
    const englishBehaviorGroup = document.getElementById(
      "english-behavior-group"
    );

    if (languageSelect.value === "en") {
      translatedContainer.classList.remove("hidden");
      if (englishBehaviorGroup) englishBehaviorGroup.classList.remove("hidden");
    } else {
      translatedContainer.classList.add("hidden");
      translatedTextInput.value = "";
      if (englishBehaviorGroup) englishBehaviorGroup.classList.add("hidden");
    }
    updatePlayButtonText();
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

  let statusTimer = null;
  let statusStartTime = 0;
  let currentStatusBaseMsg = "";

  function showStatus(msg, type, isProgress = false) {
    if (statusTimer) {
      clearInterval(statusTimer);
      statusTimer = null;
    }

    statusMessage.textContent = msg;
    statusMessage.style.color = type === "error" ? "#d93025" : "#188038";

    // Save plain message for persistence (without ticking time)
    // Actually, we persist the final result usually.
    // If it's a progress message, we don't necessarily need to persist it forever,
    // but we can save it.
    chrome.storage.local.set({ lastStatus: msg });

    if (isProgress) {
      currentStatusBaseMsg = msg;
      statusStartTime = Date.now();

      statusTimer = setInterval(() => {
        const now = Date.now();
        const elapsed = now - statusStartTime;
        statusMessage.textContent = `${currentStatusBaseMsg} ${formatLiveDuration(
          elapsed
        )}`;
      }, 100);
    }
  }

  function formatLiveDuration(ms) {
    if (ms > 1000) {
      return `(${(ms / 1000).toFixed(1)}s)`;
    }
    return `(${ms}ms)`;
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
