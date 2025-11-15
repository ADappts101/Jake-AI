// server.js
import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());             // allow requests from any origin
app.use(express.json());      // parse JSON bodies

// Save endpoint
app.post("/save", (req, res) => {
  const { text, analyzed } = req.body;
  if (!text) return res.status(400).json({ success: false, error: "No text provided" });

  const filePath = path.join("storage", "inputs.txt");
  const line = JSON.stringify({ text, analyzed, timestamp: new Date().toISOString() }) + "\n";

  fs.appendFile(filePath, line, err => {
    if (err) {
      console.error("Write failed:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true });
  });
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
