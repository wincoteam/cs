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

const command = refine("충전이안될경우 a/s접수해주세요 식으로 적어", "friendly");
assert.match(command, /충전이 정상적으로 되지 않는 경우에는/);
assert.match(command, /A\/S 접수를 부탁드립니다/);
assert.doesNotMatch(command, /식으로|적어|써줘|말해줘/);

const apologyCommand = refine("배송 늦어진다고 죄송하게 안내해줘 내일 출고", "friendly");
assert.match(apologyCommand, /죄송합니다/);
assert.match(apologyCommand, /내일 출고될 예정입니다/);
assert.doesNotMatch(apologyCommand, /안내해줘/);

console.log("Counsel refiner checks passed");
