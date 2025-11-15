// script.js
import { loadWords, tokenize, splitNoun } from "./tokenizer.js";

let dictionary = null;

// load dictionary once
async function init() {
  dictionary = await loadWords("data/words.json");
}

init();

const input = document.getElementById("userInput");
const saveBtn = document.getElementById("saveBtn");
const responseBox = document.getElementById("response");

saveBtn.addEventListener("click", async () => {
  const text = input.value.trim();

  if (!text) {
    responseBox.textContent = "No input.";
    return;
  }

  // Step 1: tokenize
  const tokens = tokenize(text);

  // Step 2: split each noun attempt
  const analyzed = tokens.map(t => splitNoun(t, dictionary));

  // Show on page
  responseBox.textContent = JSON.stringify(analyzed, null, 2);

  // Step 3: send to backend
  try {
    const res = await fetch("/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, analyzed })
    });

    const out = await res.json();

    if (out.success) {
      responseBox.textContent += "\n\n✅ Saved!";
      input.value = ""; // optional: clear input
    } else {
      responseBox.textContent += "\n\n❌ Failed to save: " + (out.error || "Unknown error");
    }
  } catch (err) {
    console.error("Server save failed:", err);
    responseBox.textContent += "\n\n❌ Server save failed: " + err.message;
  }
});
