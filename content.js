// Floating Action Button for GSpeech
(function () {
  let debounceTimer = null;
  let fab = null;

  document.addEventListener("selectionchange", () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(handleSelectionChange, 200);
  });

  document.addEventListener("mousedown", (e) => {
    // If clicking outside data-gspeech-fab, remove it
    if (fab && !fab.contains(e.target)) {
      removeFab();
    }
  });

  function handleSelectionChange() {
    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (text.length > 0) {
      showFab(selection);
    } else {
      removeFab();
    }
  }

  function showFab(selection) {
    if (!fab) {
      createFab();
    }

    // Position the FAB
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Calculate position (above the selection, centered)
    const top = rect.top + window.scrollY - 40; // 40px above
    const left = rect.left + window.scrollX + rect.width / 2 - 16; // Centered, assuming 32px width

    fab.style.top = `${top}px`;
    fab.style.left = `${left}px`;
    fab.classList.add("visible");
  }

  function removeFab() {
    if (fab) {
      fab.classList.remove("visible");
      // Optional: remove from DOM entirely after transition?
      // For now just hide
      fab.style.display = "none";
      fab.remove();
      fab = null;
    }
  }

  function createFab() {
    fab = document.createElement("div");
    fab.id = "gspeech-fab";
    fab.style.cssText = `
        position: absolute;
        z-index: 2147483647;
        width: 32px;
        height: 32px;
        background-color: #1a73e8;
        border-radius: 50%;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: opacity 0.2s;
        opacity: 0.9;
    `;

    // Icon (Speaker)
    fab.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="#ffffff">
            <path d="M480-280q83 0 141.5-58.5T680-480q0-83-58.5-141.5T480-680q-83 0-141.5 58.5T280-480q0 83 58.5 141.5T480-280Zm0 200q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/>
        </svg>
    `;

    fab.addEventListener("mousedown", (e) => {
      e.preventDefault(); // Prevent losing selection
      e.stopPropagation();
      captureSelection();
    });

    document.body.appendChild(fab);
  }

  function captureSelection() {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;

    // Use the innerText capture logic
    // Custom formatting logic
    const container = document.createElement("div");
    for (let i = 0; i < selection.rangeCount; i++) {
      container.appendChild(selection.getRangeAt(i).cloneContents());
    }

    const text = getFormattedText(container);

    // Send to extension
    chrome.runtime.sendMessage({
      type: "TEXT_CAPTURED_FROM_PAGE",
      data: { text: text },
    });

    removeFab();
  }

  function getFormattedText(node) {
    let text = "";

    // Process child nodes
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

        // Add newline before block elements if needed
        if (isBlock && text.length > 0 && !text.endsWith("\n")) {
          text += "\n";
        }

        // Special handling for lists
        if (tagName === "li") {
          text += "• ";
        }

        text += getFormattedText(child);

        // Add newline after block elements
        if (isBlock && !text.endsWith("\n")) {
          text += "\n";
        }

        // Add extra newline for paragraphs to separate them visually
        if (tagName === "p" && !text.endsWith("\n\n")) {
          text += "\n";
        }
      }
    }

    // Clean up multiple spaces but preserve newlines
    return text.replace(/ +/g, " ");
  }
})();
