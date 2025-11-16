// server.js
import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Middleware ----------
app.use(cors());             // allow requests from any origin
app.use(express.json());      // parse JSON request bodies

// ---------- Ensure storage folder exists ----------
const storageDir = path.join("storage");
if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir);

const inputFile = path.join(storageDir, "inputs.txt");
if (!fs.existsSync(inputFile)) fs.writeFileSync(inputFile, "", "utf-8");

// ---------- POST /save ----------
// Receives JSON { text, analyzed } and appends to inputs.txt
app.post("/save", (req, res) => {
  const { text, analyzed } = req.body;

  if (!text) return res.status(400).json({ success: false, error: "No text provided" });

  const line = JSON.stringify({ text, analyzed, timestamp: new Date().toISOString() }) + "\n";

  fs.appendFile(inputFile, line, (err) => {
    if (err) {
      console.error("Write failed:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true });
  });
});

// ---------- GET /inputs ----------
// Returns all saved inputs as JSON array
app.get("/inputs", (req, res) => {
  fs.readFile(inputFile, "utf-8", (err, data) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    const lines = data.trim().split("\n").filter(l => l).map(l => JSON.parse(l));
    res.json({ success: true, inputs: lines });
  });
});

// ---------- Start server ----------
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
