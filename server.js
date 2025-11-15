// server.js
import express from "express";
import fs from "fs";
import path from "path";

const app = express();
const PORT = 3000;

// parse JSON bodies
app.use(express.json());

// serve static files (index.html, style.css, script.js)
app.use(express.static("."));

// POST /save: save input text + analyzed tokens
app.post("/save", (req, res) => {
  const { text, analyzed } = req.body;

  if (!text) return res.status(400).json({ success: false, error: "No text provided" });

  const filePath = path.join("storage", "inputs.txt");
  const line = JSON.stringify({ text, analyzed }) + "\n";

  fs.appendFile(filePath, line, (err) => {
    if (err) {
      console.error("Failed to write:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true });
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
