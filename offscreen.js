chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "PLAY_OFFSCREEN_AUDIO" && msg.target === "offscreen") {
    playPcmAudio(msg.data);
  }
});

function playPcmAudio(base64String) {
  try {
    const binaryString = atob(base64String);
    const pcmData = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      pcmData[i] = binaryString.charCodeAt(i);
    }

    // Add WAV header (s16le, 24000Hz, 1 channel)
    const wavData = addWavHeader(pcmData, 24000, 1, 16);
    const blob = new Blob([wavData], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);

    const audio = new Audio(url);
    audio.play();

    audio.onended = () => {
      URL.revokeObjectURL(url);
      // Optional: Close offscreen doc if strictly necessary to save resources,
      // but usually keeping it open for a bit is fine.
    };
  } catch (e) {
    console.error("Offscreen audio error:", e);
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
