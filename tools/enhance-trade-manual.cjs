module.exports = function enhanceTradeManual(source) {
  const defaultItemsMatch = source.match(/const DEFAULT_ITEMS = \[[\s\S]*?\];/);
  if (defaultItemsMatch && !defaultItemsMatch[0].includes("name:'전동드라이버'")) {
    const ledItem = "  {type:'trade',name:'LED 캠핑 랜턴',price:18000,note:'배송비 3,000원 포함'},";
    if (!source.includes(ledItem)) throw new Error('LED camping lantern default item not found');
    source = source.replace(ledItem, `${ledItem}\n  {type:'trade',name:'전동드라이버',price:19900,note:'배송비 3,000원 포함'},`);
  }

  const declarations = String.raw`
const MANUAL_PRESETS = [
  {id:'airmonster-3',label:'에어몬스터 3종',kind:'trade',products:[
    {name:'에어몬스터 프로 New',retail:89000,reward:68000},
    {name:'에어몬스터 터보',retail:199000,reward:168000},
    {name:'에어몬스터2',retail:109000,reward:85000}
  ]},
  {id:'stretch-lantern',label:'스트레치 랜턴',kind:'trade',products:[{name:'스트레치 랜턴',reward:38000}]},
  {id:'led-camping-lantern',label:'LED 캠핑 랜턴',kind:'trade',products:[{name:'LED 캠핑 랜턴',reward:18000}]},
  {id:'electric-driver',label:'전동드라이버',kind:'trade',products:[{name:'전동드라이버',reward:19900}]},
  {id:'replacement-motor',label:'교체용 모터',kind:'purchase',products:[{name:'에어매트·에어베드 교체용 모터',reward:33000}]}
];
const manualProducts = document.getElementById('manualProducts');
const manualCards = document.getElementById('manualCards');
let selectedManualProduct = MANUAL_PRESETS[0].id;`;

  const manualFunctions = String.raw`function manualProduct(){
  const preset=MANUAL_PRESETS.find(entry=>entry.id===selectedManualProduct)||MANUAL_PRESETS[0];
  return {...preset,products:preset.products.map(product=>{
    const current=items.find(item=>item.name===product.name);
    return {...product,reward:current&&Number(current.price)>0?Number(current.price):product.reward,note:current&&current.note?current.note:(preset.kind==='purchase'?'상품 30,000원 + 배송비 3,000원 · 기존 제품 유지, 모터만 출고':'배송비 3,000원 포함')};
  })};
}
function manualPriceLine(product,preset){
  const shipping=/배송비/.test(product.note)?product.note:'배송비 3,000원 포함';
  if(preset.kind==='purchase')return '- '+product.name+' : '+won(product.reward)+' ('+product.note+')';
  if(product.retail)return '- '+product.name+' : 공홈가 '+won(product.retail)+' → '+won(product.reward)+' ('+shipping+')';
  return '- '+product.name+' : '+won(product.reward)+' ('+shipping+')';
}
function manualTexts(preset){
  const product=preset.products[0];
  const receipt='또한 현금영수증 또는 세금계산서 발행 여부도 함께 전달 부탁드리며,\n세금계산서 발행을 원하실 경우 사업자등록증도 함께 첨부 부탁드립니다.';
  if(preset.kind==='purchase'){
    return [
      {
        title:'1단계 · 협의구매 상품 및 절차 안내',
        text:'['+product.name+']는 협의구매로 진행 가능합니다.\n\n<진행 절차>\n1. 제품 확인 후 선결제(무통장입금)\n2. 입금 확인\n3. 교체용 모터 발송\n\n<협의구매 가격>\n'+manualPriceLine(product,preset)
      },
      {
        title:'2단계 · 입금 계좌 안내',
        text:'확인하였습니다.\n\n진행을 원하실 경우\n계좌번호는 BNK경남은행 / 207-0212-2558-00 / 주식회사 윈코\n로 입금 부탁드립니다 :)!'
      },
      {
        title:'3단계 · 입금 확인 및 발송 정보 안내',
        text:'입금 확인하였습니다 :)!\n교체용 모터 발송 진행 도와드리겠습니다.\n\n수령자 정보(성함·연락처·주소)를 함께 전달 부탁드립니다!\n\n'+receipt
      }
    ];
  }
  const intro=preset.products.length>1?'보상판매는 현재 아래 '+preset.products.length+'개 제품으로 진행 가능합니다.':'보상판매는 현재 ['+product.name+'] 제품으로 진행 가능합니다.';
  const prices=preset.products.map(item=>manualPriceLine(item,preset)).join('\n');
  return [
    {
      title:'1단계 · 보상판매 상품 및 절차 안내',
      text:intro+'\n\n<진행 절차>\n1. 제품 선택 후 선결제(무통장입금)\n2. 기존 기기 반납 (선불 발송)\n3. 입고 확인\n4. 새 상품 발송\n\n<보상판매 가격>\n'+prices
    },
    {
      title:'2단계 · 입금 계좌 안내',
      text:'확인하였습니다.\n\n진행을 원하실 경우\n계좌번호는 BNK경남은행 / 207-0212-2558-00 / 주식회사 윈코\n로 입금 부탁드립니다 :)!'
    },
    {
      title:'3단계 · 입금 확인 및 반납 안내',
      text:'입금 확인하였습니다 :)!\n입고 확인 후 정상적인 새 제품으로 발송 진행 도와드리겠습니다.\n\n보상판매 건 관련 이전 제품 보내주실 위치는\n\n[🚚 보내실 곳]\n이름 : 윈코 보상판매센터 / 물류센터\n주소 : 인천 검단구 갑문3로 26 은산해운창고 윈코\n전화번호 : 010-3445-7293\n\n위 주소로 선불 발송 부탁드리며,\n\n입금자명 / 수령자 정보(성함·연락처·주소)를 함께 전달 부탁드립니다!\n\n'+receipt
    }
  ];
}
function renderManual(){
  if(!manualProducts||!manualCards)return;
  manualProducts.innerHTML=MANUAL_PRESETS.map(preset=>{
    const resolved={...preset,products:preset.products.map(product=>{
      const current=items.find(item=>item.name===product.name);
      return {...product,reward:current&&Number(current.price)>0?Number(current.price):product.reward};
    })};
    const active=preset.id===selectedManualProduct;
    const detail=resolved.products.length>1?resolved.products.length+'개 제품 묶음 안내':(resolved.kind==='purchase'?'협의구매 '+won(resolved.products[0].reward):'보상가 '+won(resolved.products[0].reward));
    return '<button class="manual-product'+(active?' is-active':'')+'" type="button" data-manual-product="'+esc(preset.id)+'" aria-pressed="'+active+'"><span class="manual-product-name">'+esc(preset.label)+'</span><span class="manual-product-price">'+esc(detail)+'</span></button>';
  }).join('');
  manualCards.innerHTML=manualTexts(manualProduct()).map((manual,index)=>'<article class="manual-card"><div class="manual-card-head"><span class="manual-step">'+(index+1)+'</span><strong class="manual-title">'+esc(manual.title)+'</strong><button class="manual-copy" type="button" data-manual-copy="'+index+'">안내문 복사</button></div><div class="manual-output">'+esc(manual.text)+'</div></article>').join('');
}`;

  if (source.includes('id="tradeManual"')) {
    const declarationPattern = /\nconst MANUAL_(?:PRODUCTS|PRESETS) = \[[\s\S]*?let selectedManualProduct = [^;]+;/;
    const functionPattern = /function manualProduct\(\)\{[\s\S]*?\n\}(?=\nasync function copyManual\(index,button\)\{)/;
    if (!declarationPattern.test(source) || !functionPattern.test(source)) throw new Error('Existing trade manual structure not found');
    return source
      .replace('제품 선택 후 단계별 안내문을 복사하세요.', '안내 유형을 선택한 후 단계별 안내문을 복사하세요.')
      .replace(declarationPattern, declarations)
      .replace(functionPattern, manualFunctions);
  }

  const manualCss = `
.manual{margin-top:30px}
.manual-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;margin:0 2px 12px}
.manual-heading h2{margin:0;font-size:19px;letter-spacing:-.025em}
.manual-heading p{margin:0;color:var(--muted);font-size:12px}
.manual-products{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-bottom:13px}
.manual-product{position:relative;min-width:0;padding:13px 14px;border:1px solid var(--line);border-radius:13px;background:#fff;color:var(--ink);text-align:left;cursor:pointer}
.manual-product:hover{border-color:#9dc8b8;background:#f9fcfb}
.manual-product.is-active{border-color:var(--accent);background:var(--accent-soft);box-shadow:0 0 0 2px rgba(10,107,86,.09)}
.manual-product-name{display:block;overflow:hidden;font-size:13.5px;font-weight:850;text-overflow:ellipsis;white-space:nowrap}
.manual-product-price{display:block;margin-top:3px;color:var(--accent);font-size:12px;font-weight:800}
.manual-grid{display:grid;gap:12px}
.manual-card{overflow:hidden;border:1px solid var(--line);border-radius:16px;background:#fff;box-shadow:var(--shadow)}
.manual-card-head{display:flex;align-items:center;gap:9px;padding:12px 14px;border-bottom:1px solid var(--line);background:#f8faf9}
.manual-step{display:grid;width:24px;height:24px;flex:none;place-items:center;border-radius:8px;background:var(--accent);color:#fff;font-size:11px;font-weight:900}
.manual-title{min-width:0;flex:1;font-size:14px;font-weight:900}
.manual-copy{min-height:34px;padding:0 11px;border:1px solid #cbdad4;border-radius:9px;background:#fff;color:var(--accent);font-size:11.5px;font-weight:850;cursor:pointer}
.manual-copy:hover{border-color:var(--accent);background:#f2f8f5}
.manual-output{padding:15px 16px 17px;color:#34443e;font-size:13.5px;line-height:1.76;white-space:pre-wrap;word-break:keep-all;overflow-wrap:anywhere}
.manual-empty{padding:24px;border:1px dashed #cbd8d3;border-radius:14px;background:#fff;color:var(--muted);font-size:13px;text-align:center}
@media(max-width:650px){
  .manual-heading{align-items:flex-start;flex-direction:column;gap:3px}
  .manual-products{grid-template-columns:1fr}
  .manual-product{padding:12px 13px}
  .manual-card-head{padding:11px 12px}
  .manual-output{padding:13px 14px 15px;font-size:13px}
}`;
  if (!source.includes('</style>')) throw new Error('Trade module style block not found');
  source = source.replace('</style>', `${manualCss}\n</style>`);

  const manualHtml = `
  <section class="manual" id="tradeManual" aria-labelledby="tradeManualTitle">
    <div class="manual-heading">
      <h2 id="tradeManualTitle">보상판매 고객 안내 매뉴얼</h2>
      <p>안내 유형을 선택한 후 단계별 안내문을 복사하세요.</p>
    </div>
    <div class="manual-products" id="manualProducts" aria-label="보상판매 제품 선택"></div>
    <div class="manual-grid" id="manualCards" aria-live="polite"></div>
  </section>`;
  if (!source.includes('<div id="priceView"></div>')) throw new Error('Trade price view not found');
  source = source.replace('<div id="priceView"></div>', `<div id="priceView"></div>${manualHtml}`);

  const statusLine = "const status = document.getElementById('status');";
  if (!source.includes(statusLine)) throw new Error('Trade status declaration not found');
  source = source.replace(statusLine, `${statusLine}${declarations}`);

  const helpers = `${manualFunctions}
async function copyManual(index,button){
  const manual=manualTexts(manualProduct())[index];
  if(!manual)return;
  try{await navigator.clipboard.writeText(manual.text);}
  catch(error){const area=document.createElement('textarea');area.value=manual.text;document.body.appendChild(area);area.select();document.execCommand('copy');area.remove();}
  const original=button.textContent;button.textContent='복사됨 ✓';setTimeout(()=>button.textContent=original,1200);
}`;
  const renderViewNeedle = "function renderView(){";
  if (!source.includes(renderViewNeedle)) throw new Error('Trade render function not found');
  source = source.replace(renderViewNeedle, `${helpers}\n${renderViewNeedle}`);
  source = source.replace('  renderStatus();\n}', '  renderStatus();\n  renderManual();\n}');

  const listenerNeedle = "editBtn.addEventListener('click',()=>{";
  const listeners = `manualProducts.addEventListener('click',event=>{
  const button=event.target.closest('[data-manual-product]');
  if(!button)return;
  selectedManualProduct=button.dataset.manualProduct;
  renderManual();
});
manualCards.addEventListener('click',event=>{
  const button=event.target.closest('[data-manual-copy]');
  if(button)copyManual(Number(button.dataset.manualCopy),button);
});

`;
  if (!source.includes(listenerNeedle)) throw new Error('Trade event section not found');
  source = source.replace(listenerNeedle, `${listeners}${listenerNeedle}`);
  return source;
};
