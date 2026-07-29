const fs = require("fs");
const vm = require("vm");

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
const csEditorPolish = `<!-- winco-cs-editor-polish -->
<style id="winco-cs-editor-polish">
  #wcEditList{display:flex;flex-direction:column;gap:12px}
  #wcEditList .wc-erow{
    display:grid;grid-template-columns:120px minmax(0,1fr) auto;gap:10px;
    margin:0;padding:14px;border-radius:14px;border-color:#dce5e1;
    box-shadow:0 7px 20px rgba(25,48,40,.045);
  }
  #wcEditList .wc-erow>div{min-width:0!important;gap:8px!important}
  #wcEditList input[data-f="question"]{min-height:42px;padding:10px 12px;font-weight:700}
  #wcEditList textarea.wc-inp{
    field-sizing:content;min-height:145px;max-height:360px;padding:12px 13px;
    overflow:auto;resize:vertical;background:#fff;line-height:1.65;font-size:13.5px;
  }
  #wcEditList input[data-f="category"]{min-height:42px;padding:10px 11px}
  .wc-add textarea.wc-inp{field-sizing:content;min-height:170px;max-height:380px;padding:12px 13px}
  .wc-ebar:has(#wcSaveBtn:not(.wc-hidden)){
    position:sticky;top:0;z-index:30;padding:11px 12px;background:rgba(255,255,255,.94);
    backdrop-filter:blur(10px);box-shadow:0 8px 22px rgba(25,48,40,.08);
  }
  @media(max-width:700px){
    #wcEditList .wc-erow{grid-template-columns:minmax(0,1fr) auto;padding:12px}
    #wcEditList input[data-f="category"]{grid-column:1}
    #wcEditList .wc-erow>div{grid-column:1/-1;grid-row:2}
    #wcEditList .wc-erow>button{grid-column:2;grid-row:1}
    #wcEditList textarea.wc-inp{min-height:170px}
  }
</style>`;
function applyPolish(source, moduleId = "") {
  const clean = source
    .replace(/\n?<!-- winco-global-polish -->[\s\S]*?<style id="winco-global-polish">[\s\S]*?<\/style>\n?/, "")
    .replace(/\n?<!-- winco-cs-editor-polish -->[\s\S]*?<style id="winco-cs-editor-polish">[\s\S]*?<\/style>\n?/, "");
  const modulePolish = moduleId === "cs" ? `\n${csEditorPolish}` : "";
  return clean.replace("</head>", `${polishStyle}${modulePolish}\n</head>`);
}
let html = fs.readFileSync(indexPath, "utf8");
const pattern = /<script type="application\/json" id="mod-data">([\s\S]*?)<\/script>/;
const match = html.match(pattern);
if (!match) throw new Error("mod-data not found");

const modules = JSON.parse(match[1]).filter(item => !["faq", "contacts"].includes(item.id));
for (const module of modules) {
  const polished = applyPolish(Buffer.from(module.b64, "base64").toString("utf8"), module.id);
  module.b64 = Buffer.from(polished, "utf8").toString("base64");
}
const source = applyPolish(fs.readFileSync("faq-module.html", "utf8"), "faq");
const faq = {
  id: "faq",
  name: "WINCO FAQ",
  desc: "에어건·청소기·캠핑용품 등 제품별 사용법과 FAQ를 검색합니다.",
  icon: "🍀",
  accent: "#25856f",
  tag: "제품별 FAQ",
  b64: Buffer.from(source, "utf8").toString("base64")
};
const contactsSource = applyPolish(fs.readFileSync("contacts-module.html", "utf8"), "contacts");
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

function decodeModule(id) {
  const module = modules.find(item => item.id === id);
  return module ? Buffer.from(module.b64, "base64").toString("utf8") : "";
}

function evaluateExpression(expression) {
  const sandbox = {};
  vm.runInNewContext(`result = (${expression})`, sandbox, {timeout: 1000});
  return sandbox.result;
}

function buildAssistantKnowledge() {
  const knowledge = [];
  const add = item => {
    if (!item || !item.title || !item.answer) return;
    knowledge.push({
      id: `k${knowledge.length + 1}`,
      kind: item.kind || "info",
      title: String(item.title).trim(),
      answer: String(item.answer).trim(),
      module: item.module || "",
      category: String(item.category || "").trim(),
      keywords: String(item.keywords || "").trim(),
      url: item.url || ""
    });
  };

  const csSource = decodeModule("cs");
  const csMatch = csSource.match(/const CS_PRESET = (\[[\s\S]*?\]); \/\*__WINCO_PRESET__\*\//);
  if (csMatch) {
    for (const row of evaluateExpression(csMatch[1])) {
      add({
        kind: "manual",
        title: row.question,
        answer: row.answer,
        module: "cs",
        category: row.category,
        keywords: `${row.category || ""} 고객안내 상담 답변 매뉴얼`
      });
    }
  }

  const faqSource = decodeModule("faq");
  const faqMatch = faqSource.match(/const COMMON[\s\S]*?(?=const products=)/);
  if (faqMatch) {
    const sandbox = {};
    vm.runInNewContext(`${faqMatch[0]};result=ALL_PRODUCTS`, sandbox, {timeout: 1000});
    for (const product of sandbox.result || []) {
      const productWords = `${product.name || ""} ${product.model || ""} ${product.cat || ""}`;
      for (const section of product.sections || []) {
        add({
          kind: "guide",
          title: `${product.name} · ${section[0]}`,
          answer: (section[1] || []).join("\n"),
          module: "faq",
          category: product.cat,
          keywords: `${productWords} ${section[0]} 증상 사용법 해결`
        });
      }
      for (const row of product.faqs || []) {
        add({
          kind: "faq",
          title: `${product.name} · ${row[0]}`,
          answer: row[1],
          module: "faq",
          category: product.cat,
          keywords: `${productWords} ${row[0]} 자주묻는질문`
        });
      }
    }
  }

  const tradeSource = decodeModule("trade");
  const tradeMatch = tradeSource.match(/const DEFAULT_ITEMS = (\[[\s\S]*?\]);\s*const priceView/);
  if (tradeMatch) {
    for (const item of evaluateExpression(tradeMatch[1])) {
      const price = Number(item.price || 0).toLocaleString("ko-KR");
      add({
        kind: "price",
        title: item.name,
        answer: `${price}원${item.note ? ` (${item.note})` : ""}`,
        module: "trade",
        category: item.type === "trade" ? "보상판매" : "협의구매",
        keywords: `${item.type === "trade" ? "보상판매 반납 교환" : "협의구매"} 가격 금액 얼마 비용`
      });
    }
  }

  const productSource = decodeModule("product");
  const productMatch = productSource.match(/const defaultProducts\s*=\s*(\[[\s\S]*?\]);\s*const PR_PRESET/);
  if (productMatch) {
    for (const product of evaluateExpression(productMatch[1])) {
      const details = [
        product.sku && `상품번호: ${product.sku}`,
        product.model && `모델명: ${product.model}`,
        product.option && `옵션: ${product.option}`
      ].filter(Boolean);
      add({
        kind: "product",
        title: product.name,
        answer: details.length ? details.join("\n") : "상품 목록에 등록된 제품입니다.",
        module: "product",
        category: product.category || "상품",
        keywords: `${product.sku || ""} ${product.model || ""} ${product.option || ""} 상품 제품 검색`
      });
    }
  }

  [
    {
      title: "인천 창고 · 보상판매 반납",
      answer: "이름: 윈코 보상판매센터 / 물류센터\n주소: 인천시 검단구 오류동 1544-3번지 은산해운창고",
      category: "발송 주소",
      keywords: "보상판매 기존기기 반납 선불발송 인천 물류센터 창고 어디로 보내"
    },
    {
      title: "고빅스 · 제품 검수 및 A/S",
      answer: "이름: 윈코 A/S 센터\n주소: 서울 양천구 오목로17길 8 1층\n전화번호: 010-5929-2438",
      category: "발송 주소",
      keywords: "고장 수리 점검 검수 as 에이에스 택배 어디로 보내 고빅스"
    },
    {
      title: "윈코 사무실 · 특이사항 검수",
      answer: "이름: 윈코\n주소: 서울특별시 금천구 디지털로10길 37, 가산아스크타워 A동 1711~1718호\n전화번호: 070-4722-9200",
      category: "발송 주소",
      keywords: "사무실 특이사항 직접검수 가산 금천구 연락처 전화 주소"
    },
    {
      title: "네이버 톡톡",
      answer: "고객 문의와 상담을 확인하는 네이버 톡톡입니다.",
      category: "업무 링크",
      keywords: "네이버 톡톡 고객 문의 상담 링크",
      url: "https://talk.naver.com/ct/wc3l0s?frm=psf"
    },
    {
      title: "A/S 접수",
      answer: "케어플러스 A/S 접수 페이지입니다.",
      category: "업무 링크",
      keywords: "as 에이에스 수리 고장 접수 신청 케어플러스 링크",
      url: "https://careplz.kr/"
    },
    {
      title: "A/S 접수방법",
      answer: "A/S 접수 절차와 고객 안내 방법을 확인합니다.",
      category: "업무 링크",
      keywords: "as 에이에스 수리 접수 방법 절차 안내 링크",
      url: "https://wincoservice.notion.site/WINCO-A-S-2c74f43a7c128084893afb6a941883e5?pvs=73"
    },
    {
      title: "WINCO FAQ 원문",
      answer: "제품별 사용법과 자주 묻는 질문 원문 페이지입니다.",
      category: "업무 링크",
      keywords: "faq 자주묻는질문 노션 제품 사용법 링크",
      url: "https://wincoservice.notion.site/WINCO-FAQ-21c4f43a7c128072a213f32d59c69144?source=copy_link"
    }
  ].forEach(item => add({...item, kind: item.url ? "link" : "address", module: "contacts"}));

  return knowledge;
}

const assistantKnowledge = buildAssistantKnowledge();
fs.writeFileSync(
  "assistant-data.js",
  `window.WINCO_ASSISTANT_DATA=${JSON.stringify(assistantKnowledge).replace(/</g, "\\u003c")};\n`,
  "utf8"
);
const tag = `<script type="application/json" id="mod-data">${JSON.stringify(modules).replace(/</g, "\\u003c")}</script>`;
html = html.replace(pattern, tag);
fs.writeFileSync(indexPath, html, "utf8");
console.log("Embedded modules:", modules.map(item => item.id).join(", "));
console.log("Assistant knowledge:", assistantKnowledge.length);

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

new Function(fs.readFileSync("assistant-data.js", "utf8"));
new Function(fs.readFileSync("assistant.js", "utf8"));
console.log("Validated scripts: assistant", assistantKnowledge.length);
