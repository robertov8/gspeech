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
    // Clear previous translation
    translatedTextInput.value = "";

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
        translatedContainer.classList.remove("hidden");
      }
    }
  });

  // Toggle translated text area based on language selection
  function updateUIForLanguage() {
    if (languageSelect.value === "en") {
      // We act optimistically; we show it empty or keep it hidden until translation arrives?
      // User asked for a textarea "if language is English".
      // Let's show the container but maybe empty.
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
    statusMessage.style.color = type === "error" ? "#d93025" : "#188038";
  }
});
