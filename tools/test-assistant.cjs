const fs = require("fs");
const vm = require("vm");

class Element {
  constructor() {
    this.dataset = {};
    this.style = {};
    this.value = "";
    this.textContent = "";
    this.classList = {toggle() {}, contains() { return false; }};
  }
  addEventListener() {}
  setAttribute() {}
  focus() {}
}

const elements = {};
const document = {
  getElementById(id) { return elements[id] || (elements[id] = new Element()); },
  addEventListener() {},
  body: new Element()
};
const sandbox = {
  window: {},
  document,
  localStorage: {getItem() { return null; }},
  navigator: {},
  requestAnimationFrame(fn) { fn(); },
  setTimeout,
  clearTimeout,
  Map,
  Set
};
sandbox.window.window = sandbox.window;
vm.runInNewContext(fs.readFileSync("assistant-data.js", "utf8"), sandbox);
const source = fs.readFileSync("assistant.js", "utf8").replace(
  /\}\)\(\);\s*$/,
  `window.__ask=function(query){
    const full=contextualQuery(query);
    refreshKnowledge();
    const result=answerResolution(query);
    previousQuery=full;
    if(result.item){previousResult=result.item;pendingIntent="";pendingQuery="";}
    else if(result.pending){pendingIntent=result.pending;pendingQuery=result.pendingQuery||full;}
    return result;
  };})();`
);
vm.runInNewContext(source, sandbox);

const cases = [
  ["프로new 충전불량이래", /PRO NEW.*충전이 되지 않아요/],
  ["그럼 고객한테 뭐라고 안내해?", /고객님께는 이렇게 안내/],
  ["프로뉴 필터 물세척해도 돼?", /PRO NEW.*필터/],
  ["프로뉴 노즐 끼면 역풍 생겨", /PRO NEW.*역풍/],
  ["프로2 사용방법 알려줘", /PRO 2.*작동 방법/],
  ["WBM1000 충전 안됨", /WBM-1000.*충전이 되지 않아요/],
  ["WH480 먼지봉투 언제 갈아?", /WH480.*먼지봉투 교체/],
  ["WH180 청소기 소음 심해?", /WH-180.*소음/],
  ["M1Z 고속충전 가능해?", /M1Z.*고속 충전/],
  ["LS2 랜턴 다리 고정 안됨", /LS-2.*다리 고정/],
  ["WWD1 콘크리트 벽에 써도 돼?", /WW-D1.*콘크리트/],
  ["칫솔살균기 건조 기능도 있어?", /칫솔 살균기.*건조/],
  ["프로2 비행기 가지고 타도 돼?", /PRO 2.*기내 반입/],
  ["터보 연장노즐하고 와이드노즐 같이 써도 돼?", /WT-500.*연장노즐/],
  ["터보 보상판매 가격", /168,000원/],
  ["에어몬스터2 보상가", /85,000원/],
  ["보상판매 반납 어디로 보내?", /오류동 1544-3/],
  ["A/S 제품 어디로 보내?", /오목로17길 8/],
  ["네이버 톡톡 링크 알려줘", /네이버 톡톡/],
  ["멀티쿠커 어댑터 가격", /멀티쿠커.*어댑터/],
  ["글라쎄 거울충전기 거래처", /디뷰코리아/],
  ["프로뉴 언제 출시됐어?", /출시일 정보가 등록되어 있지 않습니다/],
  ["존재하지않는제품 우주모드 설정법", /정확한 답을 확인하기 어려워|확인하지 못했습니다|자료에 없습니다/]
];

let failed = 0;
for (const [query, expected] of cases) {
  const result = sandbox.window.__ask(query);
  const output = `${result.item ? result.item.title : ""}\n${result.text}`;
  const passed = expected.test(output);
  console.log(`${passed ? "PASS" : "FAIL"} ${query} -> ${output.replace(/\n/g, " / ").slice(0, 180)}`);
  if (!passed) failed++;
}
if (failed) {
  console.error(`Assistant checks failed: ${failed}/${cases.length}`);
  process.exit(1);
}
console.log(`Assistant checks passed: ${cases.length}`);
