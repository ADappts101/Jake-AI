import { tokenize } from "./tokenizer.js";

const inputEl = document.getElementById("userInput");
const saveBtn = document.getElementById("saveBtn");
const responseEl = document.getElementById("response");

saveBtn.addEventListener("click", async () => {
  const text = inputEl.value.trim();
  if (!text) {
    responseEl.textContent = "Enter something first.";
    return;
  }

  // tokenize text
  const tokens = tokenize(text);

  // show result
  responseEl.innerHTML = `
    <div><strong>Tokens:</strong> ${JSON.stringify(tokens)}</div>
  `;
});

