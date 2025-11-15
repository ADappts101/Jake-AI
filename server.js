// server.js
import express from "express";
import fs from "fs";
import path from "path";
import bodyParser from "body-parser";

const app = express();
const PORT = 3000;

// Needed for ES modules
const __dirname = path.dirname(new URL(import.meta.url).pathname);

// middleware
app.use(bodyParser.json());
app.use(express.static(__dirname));  // serve index.html, script.js, etc.

// ---------- POST /save ----------
app.post("/save", (req, res) => {
  const { text, analyzed } = req.body || {};

  if (!text) {
    return res.status(400).json({ ok: false, error: "No text provided." });
  }

  const line =
    "\n--- INPUT ---\n" +
    text +
    "\n--- ANALYZED ---\n" +
    JSON.stringify(analyzed) +
    "\n-------------\n";

  const outputPath = path.join(__dirname, "storage", "inputs.txt");

  fs.appendFile(outputPath, line, (err) => {
    if (err) {
      console.error("Write error:", err);
      return res.status(500).json({ ok: false, error: "Write failed." });
    }

    console.log("Saved to inputs.txt");
    res.json({ ok: true, saved: true });
  });
});

// start server
app.listen(PORT, () => {
  console.log("Server running on http://localhost:" + PORT);
});

