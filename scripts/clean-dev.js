"use strict";
const fs = require("fs");
const path = require("path");

const nextDir = path.join(process.cwd(), ".next");
try {
  if (fs.existsSync(nextDir)) {
    fs.rmSync(nextDir, { recursive: true, force: true });
    console.log("[clean-dev] Removed .next for a clean dev start.");
  }
} catch (err) {
  console.warn("[clean-dev] Could not remove .next:", err.message);
}
