// script.js
import { loadWords, tokenize, splitNoun } from "./tokenizer.js";

let dictionary = null;

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

  const tokens = tokenize(text);
  const analyzed = tokens.map(t => splitNoun(t, dictionary));

  responseBox.textContent = JSON.stringify(analyzed, null, 2);

  try {
    const res = await fetch("/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, analyzed })
    });

    const out = await res.json();
    if (out.success) {
      responseBox.textContent += "\n\n✅ Saved!";
      input.value = "";
    } else {
      responseBox.textContent += "\n\n❌ Failed to save: " + (out.error || "Unknown");
    }
  } catch (err) {
    console.error(err);
    responseBox.textContent += "\n\n❌ Server save failed: " + err.message;
  }
});
