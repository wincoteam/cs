const fs = require("fs");

const indexPath = "index.html.html";
const polishStyle = `<!-- winco-global-polish -->
<style id="winco-global-polish">
  :root{color-scheme:light;accent-color:#0a6b56}
  html{scrollbar-gutter:stable}
  body{min-height:100vh}
  ::selection{background:#cce7dd;color:#12372d}
  button,a,input,select,textarea{transition:border-color .15s ease,box-shadow .15s ease,background-color .15s ease,transform .15s ease}
  button:active{transform:translateY(1px)}
  *:focus-visible{outline:3px solid rgba(10,107,86,.22)!important;outline-offset:2px!important}
  ::-webkit-scrollbar{width:10px;height:10px}
  ::-webkit-scrollbar-thumb{border:3px solid transparent;border-radius:99px;background:#b8c7c1;background-clip:padding-box}
  ::-webkit-scrollbar-track{background:transparent}
  @media(max-width:620px){html{scrollbar-gutter:auto}body{background-attachment:fixed}}
</style>`;
function applyPolish(source) {
  const clean = source.replace(/\n?<!-- winco-global-polish -->[\s\S]*?<style id="winco-global-polish">[\s\S]*?<\/style>\n?/, "");
  return clean.replace("</head>", `${polishStyle}\n</head>`);
}
let html = fs.readFileSync(indexPath, "utf8");
const pattern = /<script type="application\/json" id="mod-data">([\s\S]*?)<\/script>/;
const match = html.match(pattern);
if (!match) throw new Error("mod-data not found");

const modules = JSON.parse(match[1]).filter(item => !["faq", "contacts"].includes(item.id));
for (const module of modules) {
  const polished = applyPolish(Buffer.from(module.b64, "base64").toString("utf8"));
  module.b64 = Buffer.from(polished, "utf8").toString("base64");
}
const source = applyPolish(fs.readFileSync("faq-module.html", "utf8"));
const faq = {
  id: "faq",
  name: "WINCO FAQ",
  desc: "에어건·청소기·캠핑용품 등 제품별 사용법과 FAQ를 검색합니다.",
  icon: "🍀",
  accent: "#25856f",
  tag: "제품별 FAQ",
  b64: Buffer.from(source, "utf8").toString("base64")
};
const contactsSource = applyPolish(fs.readFileSync("contacts-module.html", "utf8"));
const contacts = {
  id: "contacts",
  name: "주소 링크모음",
  desc: "보상판매·검수 발송지를 복사하고 자주 쓰는 CS 페이지를 바로 엽니다.",
  icon: "📍",
  accent: "#176b57",
  tag: "주소·링크 모음",
  b64: Buffer.from(contactsSource, "utf8").toString("base64")
};

const insertAt = modules.findIndex(item => item.id === "trade");
modules.splice(insertAt < 0 ? modules.length : insertAt, 0, faq);
modules.push(contacts);
const tag = `<script type="application/json" id="mod-data">${JSON.stringify(modules).replace(/</g, "\\u003c")}</script>`;
html = html.replace(pattern, tag);
fs.writeFileSync(indexPath, html, "utf8");
console.log("Embedded modules:", modules.map(item => item.id).join(", "));

for (const [name, document] of [["faq-module.html", source], ["contacts-module.html", contactsSource], [indexPath, html]]) {
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
