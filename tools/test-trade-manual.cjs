const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

const html = fs.readFileSync('index.html.html','utf8');
const match = html.match(/<script type="application\/json" id="mod-data">([\s\S]*?)<\/script>/);
assert(match,'module data should exist');
const modules = JSON.parse(match[1]);
const trade = modules.find(module => module.id === 'trade');
const contacts = modules.find(module => module.id === 'contacts');
assert(trade && contacts,'trade and contacts modules should exist');

const tradeSource = Buffer.from(trade.b64,'base64').toString('utf8');
const contactsSource = Buffer.from(contacts.b64,'base64').toString('utf8');
const assistantData = fs.readFileSync('assistant-data.js','utf8');

const scripts = [...tradeSource.matchAll(/<script(?![^>]*application\/json)[^>]*>([\s\S]*?)<\/script>/g)];
assert(scripts.length > 0,'trade module should contain executable scripts');
scripts.forEach((script,index)=>{
  assert.doesNotThrow(
    ()=>new vm.Script(script[1],{filename:`trade-module-script-${index}.js`}),
    `trade module script ${index} should parse`
  );
});

assert(tradeSource.includes('id="tradeManual"'),'trade manual should be rendered');
assert(tradeSource.includes("data-manual-product"),'product selector should be available');
assert(tradeSource.includes('에어몬스터 프로 New') && tradeSource.includes('공홈가'),'product-specific price text should be generated');
assert(tradeSource.includes('BNK경남은행 / 207-0212-2558-00 / 주식회사 윈코'),'deposit guide should be present');
assert(tradeSource.includes('인천 검단구 갑문3로 26 은산해운창고 윈코'),'return address should be present');
assert(tradeSource.includes('010-3445-7293'),'return phone should be present');
assert(contactsSource.includes('갑문3로 26') && contactsSource.includes('010-3445-7293'),'contacts should match the manual');
assert(!assistantData.includes('보상판매는 아래 5개 제품'),'assistant data should not retain the old five-product manual');
assert(assistantData.includes('보상판매는 현재 아래 3개 제품'),'assistant data should include the current three-product manual');

console.log('Trade manual checks passed');
