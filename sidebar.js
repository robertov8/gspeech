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

  let statusTimer = null;
  let statusStartTime = 0;
  let currentStatusBaseMsg = "";

  // Populate system voices
  function loadSystemVoices() {
    voiceSelect.innerHTML = "";
    const voices = window.speechSynthesis.getVoices();

    // Sort voices by language first, then by name
    voices.sort((a, b) => {
      if (a.lang !== b.lang) {
        return a.lang.localeCompare(b.lang);
      }
      return a.name.localeCompare(b.name);
    });

    voices.forEach((voice) => {
      const option = document.createElement("option");
      option.value = voice.name; // We use name as ID for simplicity
      option.textContent = `${voice.lang} - ${voice.name}`;
      option.setAttribute("data-lang", voice.lang);
      option.setAttribute("data-name", voice.name);
      voiceSelect.appendChild(option);
    });

    // Try to restore selection or select default for current language in updateUIForLanguage
    updateUIForLanguage();
  }

  loadSystemVoices();
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = loadSystemVoices;
  }

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
    updatePlayButtonText();
  }

  wrapperUrlInput.addEventListener("input", updateUIForWrapper);
  if (englishBehaviorSelect) {
    englishBehaviorSelect.addEventListener("change", updatePlayButtonText);
  }

  function updatePlayButtonText() {
    const playBtnText = playBtn.querySelector(".text");
    if (!playBtnText) return;

    const isEnglish = languageSelect.value === "en";

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

    // Cancel any current speech
    window.speechSynthesis.cancel();

    let text = capturedTextInput.value.trim();
    if (!text) {
      showStatus("Nenhum texto encontrado para ler.", "error");
      return;
    }

    const apiKey = contextKeyInput.value.trim();
    const wrapperUrl = wrapperUrlInput.value.trim();
    const selectedVoice = voiceSelect.value;
    const selectedLanguage = languageSelect.value || "pt-BR";
    const selectedEnglishBehavior =
      englishBehaviorSelect.value || "translate_listen";

    if (!apiKey && !wrapperUrl) {
      showStatus("API Key é necessária.", "error");
      settingsPanel.classList.remove("hidden");
      return;
    }

    // Clear previous translation
    translatedTextInput.value = "";
    chrome.storage.local.remove(["lastTranslatedText", "lastStatus"]);

    if (selectedLanguage === "en") {
      setLoading(true);
      showStatus("Traduzindo...", "success");

      chrome.runtime.sendMessage(
        {
          type: "TRANSLATE_TEXT",
          payload: { text: text, apiKey: apiKey, wrapperUrl: wrapperUrl },
        },
        (response) => {
          setLoading(false);

          if (chrome.runtime.lastError) {
            showStatus(`Erro: ${chrome.runtime.lastError.message}`, "error");
            return;
          }
          if (response && response.error) {
            showStatus(`Erro: ${response.error}`, "error");
            return;
          }

          // Success
          const translatedText = response.text;
          const duration = response.duration;

          translatedTextInput.value = translatedText;
          translatedContainer.classList.remove("hidden");
          chrome.storage.local.set({ lastTranslatedText: translatedText });

          showStatus(
            `Tradução concluída (${formatLiveDuration(duration)}).`,
            "success"
          );

          if (selectedEnglishBehavior === "translate_listen") {
            speakText(translatedText, selectedVoice);
          }
        }
      );
    } else {
      // PT-BR input, just speak
      speakText(text, selectedVoice);
    }
  }

  function speakText(text, voiceName) {
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const selectedVoice = voices.find((v) => v.name === voiceName);

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => {
      showStatus("Reproduzindo...", "success");
    };

    utterance.onend = () => {
      showStatus("Reprodução concluída.", "success");
    };

    utterance.onerror = (e) => {
      showStatus("Erro na reprodução.", "error");
      console.error("Speech error:", e);
    };

    window.speechSynthesis.speak(utterance);
  }

  // Listen for messages
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "TEXT_CAPTURED_FROM_PAGE") {
      const newText = msg.data.text;
      if (capturedTextInput) {
        capturedTextInput.value = newText;
      }
      chrome.storage.local.set({ lastCapturedText: newText });
      playBtn.disabled = false;

      // Auto-play immediately since panel is open
      handlePlay(false);

      // Ensure flag is cleared
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
});
