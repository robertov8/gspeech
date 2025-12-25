chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "PLAY_AUDIO") {
    handleAudioPlay(msg.data, sendResponse);
    return true; // Keep channel open for async response
  }
});

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

    sendResponse({ success: true });
  } catch (err) {
    console.error("Error in background script:", err);
    sendResponse({ success: false, error: err.message });
  }
}
