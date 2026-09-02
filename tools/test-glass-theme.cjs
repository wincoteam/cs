const fs = require("fs");

const index = fs.readFileSync("index.html.html", "utf8");
if (!index.includes('<link rel="stylesheet" href="glass-theme.css">')) throw new Error("Glass theme stylesheet missing");

const glass = fs.readFileSync("glass-theme.css", "utf8");
for (const expected of ["backdrop-filter:blur(22px)", ".card{", ".assistant-panel", ".postit-panel"]) {
  if (!glass.includes(expected)) throw new Error(`Glass theme rule missing: ${expected}`);
}

const match = index.match(/<script type="application\/json" id="mod-data">([\s\S]*?)<\/script>/);
if (!match) throw new Error("mod-data missing");
const modules = JSON.parse(match[1]);
for (const id of ["calendar","order","csdaily","parts","vendor","cs","product","faq","trade","clipboard","contacts"]) {
  const module = modules.find(item => item.id === id);
  if (!module) throw new Error(`Module missing: ${id}`);
  const source = Buffer.from(module.b64, "base64").toString("utf8");
  if (!source.includes("/* Glassmorphism system */")) throw new Error(`Glass theme not embedded in ${id}`);
}

console.log("Glass theme checks passed");
