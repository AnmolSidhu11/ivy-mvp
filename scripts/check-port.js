#!/usr/bin/env node

// Simple preflight check to see if a port is already in use.
// Usage: node scripts/check-port.js 3000

const net = require("net");

const port = parseInt(process.argv[2] || "3000", 10);

if (Number.isNaN(port)) {
  console.log("[predev] Invalid port:", process.argv[2]);
  process.exit(0);
}

const server = net.createServer();

server.once("error", (err) => {
  if ((err && err.code) === "EADDRINUSE") {
    console.log(
      `[predev] Port ${port} is already in use. Next.js may choose a different port.`,
    );
  } else {
    console.log("[predev] Port check error:", err.message || err);
  }
  process.exit(0);
});

server.once("listening", () => {
  console.log(`[predev] Port ${port} is free. Starting dev server on http://localhost:${port}`);
  server.close(() => process.exit(0));
});

server.listen(port, "0.0.0.0");

