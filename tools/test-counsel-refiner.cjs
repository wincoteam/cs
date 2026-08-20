const assert = require("assert");
const refine = require("../counsel-refiner.js");

const friendly = refine("고객이 충전안된다고함 5v1a로 해보고 안되면 as접수해달라고 안내", "friendly");
assert.match(friendly, /^안녕하세요, 고객님\. 윈코입니다\./);
assert.match(friendly, /5V 1A/);
assert.match(friendly, /A\/S 접수/);
assert.match(friendly, /감사합니다\.$/);
assert.doesNotMatch(friendly, /안된다고함|해보고|해달라고/);

const apology = refine("배송 지연됨 8월 21일 출고 예정", "apology");
assert.match(apology, /죄송합니다/);
assert.match(apology, /8월 21일/);

const facts = refine("가격 68,000원 배송비 3,000원 링크 https://example.com/a", "friendly");
assert.match(facts, /68,000원/);
assert.match(facts, /3,000원/);
assert.match(facts, /https:\/\/example\.com\/a/);

const concise = refine("교환 가능함\n제품 먼저 회수 확인 필요", "concise");
assert.doesNotMatch(concise, /^안녕하세요/);
assert.match(concise, /가능합니다/);
assert.match(concise, /확인이 필요합니다/);

console.log("Counsel refiner checks passed");
