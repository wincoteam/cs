const fs = require("fs");

const indexPath = "index.html.html";
let html = fs.readFileSync(indexPath, "utf8");
const pattern = /<script type="application\/json" id="mod-data">([\s\S]*?)<\/script>/;
const match = html.match(pattern);
if (!match) throw new Error("mod-data not found");

const modules = JSON.parse(match[1]).filter(item => item.id !== "faq");
const source = fs.readFileSync("faq-module.html", "utf8");
const faq = {
  id: "faq",
  name: "WINCO FAQ",
  desc: "에어몬스터 제품별 사용법과 자주 묻는 질문을 검색하고 펼쳐봅니다.",
  icon: "🍀",
  accent: "#25856f",
  tag: "제품별 FAQ",
  b64: Buffer.from(source, "utf8").toString("base64")
};

const insertAt = modules.findIndex(item => item.id === "trade");
modules.splice(insertAt < 0 ? modules.length : insertAt, 0, faq);
const tag = `<script type="application/json" id="mod-data">${JSON.stringify(modules).replace(/</g, "\\u003c")}</script>`;
html = html.replace(pattern, tag);
fs.writeFileSync(indexPath, html, "utf8");
console.log("Embedded modules:", modules.map(item => item.id).join(", "));

for (const [name, document] of [["faq-module.html", source], [indexPath, html]]) {
  const scripts = [...document.matchAll(/<script(?![^>]*application\/json)[^>]*>([\s\S]*?)<\/script>/g)];
  scripts.forEach((script, index) => {
    try {
      new Function(script[1]);
    } catch (error) {
      throw new Error(`${name} script ${index}: ${error.message}`);
    }
  });
  console.log("Validated scripts:", name, scripts.length);
}
