module.exports = function enhanceVendorQuantityCalculator(source) {
  if (source.includes("winco-vendor-quantity-calculator")) {
    return source.replace(
      "o.onclick=()=>{ selProdV = decodeURIComponent(o.dataset.name); showVResult(); };",
      "o.onclick=()=>{ selProdV = decodeURIComponent(o.dataset.name); vendorQuantity = 1; showVResult(); };"
    );
  }

  const css = `
/* winco-vendor-quantity-calculator */
.qtycalc{padding:16px 18px;border-top:1px solid var(--line);background:#fbfcfb}
.qtycalc-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:13px}
.qtycalc-title{font-size:13px;font-weight:800;color:var(--ink)}
.qtystep{display:grid;grid-template-columns:34px 72px 34px;align-items:center;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:#fff}
.qtystep button{height:36px;border:0;background:#f3f6f4;color:var(--accent);font:inherit;font-size:18px;font-weight:800;cursor:pointer}
.qtystep button:hover{background:var(--accent-soft)}
.qtystep input{width:100%;height:36px;border:0;border-left:1px solid var(--line);border-right:1px solid var(--line);outline:0;text-align:center;font:700 14px var(--mono);color:var(--ink);-moz-appearance:textfield}
.qtystep input::-webkit-outer-spin-button,.qtystep input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.qtyrows{display:grid;gap:7px;padding:12px 13px;border:1px solid #e1e7e3;border-radius:11px;background:#fff}
.qtyrow{display:flex;justify-content:space-between;gap:18px;color:var(--muted);font-size:12.5px}
.qtyrow b{color:var(--ink);font-family:var(--mono);font-size:13px}
.qtyrow.grand{margin-top:4px;padding-top:10px;border-top:1px dashed #ced8d2;color:var(--ink);font-weight:800;font-size:14px}
.qtyrow.grand b{color:var(--accent);font-size:20px}
.qtyhint{margin:10px 1px 0;color:#587068;font-size:11.5px;line-height:1.55}
@media(max-width:520px){.qtycalc-head{align-items:flex-start;flex-direction:column}.qtystep{width:100%;grid-template-columns:42px 1fr 42px}.qtyrow.grand b{font-size:18px}}
`;
  source = source.replace("</style>", css + "</style>");
  source = source.replace("let selVendor = null, selProdV = null;", "let selVendor = null, selProdV = null, vendorQuantity = 1;");
  source = source.replace("selVendor = v; selProdV = null;", "selVendor = v; selProdV = null; vendorQuantity = 1;");
  source = source.replace(
    "o.onclick=()=>{ selProdV = decodeURIComponent(o.dataset.name); showVResult(); };",
    "o.onclick=()=>{ selProdV = decodeURIComponent(o.dataset.name); vendorQuantity = 1; showVResult(); };"
  );

  const showPattern = /function showVResult\(\)\{[\s\S]*?\n\}\ndocument\.getElementById\('vsearch'\)/;
  const replacement = `function vendorShipping(product){
  return (VENDOR_SHIP[selVendor] !== undefined) ? VENDOR_SHIP[selVendor] : product.ship;
}
function updateVQuantityTotal(nextQuantity){
  const p = DB.products.find(x=>x.name===selProdV);
  if(!p) return;
  const val = p.prices[selVendor];
  if(!isNum(val)) return;
  const qty = Math.max(1, Math.min(9999, Math.floor(Number(nextQuantity)||1)));
  vendorQuantity = qty;
  const input = document.getElementById('vqty');
  if(input && Number(input.value)!==qty) input.value=qty;
  const goods = val * qty;
  const ship = vendorShipping(p);
  const goodsEl = document.getElementById('vqtygoods');
  const shipEl = document.getElementById('vqtyship');
  const totalEl = document.getElementById('vqtytotal');
  if(goodsEl) goodsEl.textContent=won(goods)+'원';
  if(shipEl) shipEl.textContent=isNum(ship)?won(ship)+'원':'미지정';
  if(totalEl) totalEl.textContent=isNum(ship)?won(goods+ship)+'원':won(goods)+'원 + 배송비';
}
function showVResult(){
  const p = DB.products.find(x=>x.name===selProdV);
  const val = p.prices[selVendor];
  const priceHtml = isNum(val)
    ? '<div class="v">'+won(val)+'<span class="won">원</span></div>'
    : '<div class="v na">'+esc(val)+'</div>';
  const ship = vendorShipping(p);
  const shipHtml = isNum(ship)
    ? '<div class="v">'+won(ship)+'<span class="won">원</span></div>'
    : '<div class="v na">단독배송비 미지정</div>';
  let calculator = '';
  if(isNum(val)){
    const goods = val * vendorQuantity;
    const grand = isNum(ship) ? won(goods+ship)+'원' : won(goods)+'원 + 배송비';
    calculator = '<div class="qtycalc"><div class="qtycalc-head"><span class="qtycalc-title">수량별 예상 결제금액</span>'+
      '<div class="qtystep" aria-label="수량 조절"><button type="button" data-vqty-step="-1" aria-label="수량 줄이기">−</button>'+
      '<input id="vqty" type="number" min="1" max="9999" value="'+vendorQuantity+'" inputmode="numeric" aria-label="주문 수량">'+
      '<button type="button" data-vqty-step="1" aria-label="수량 늘리기">＋</button></div></div>'+
      '<div class="qtyrows"><div class="qtyrow"><span>상품금액 (단가 × 수량)</span><b id="vqtygoods">'+won(goods)+'원</b></div>'+
      '<div class="qtyrow"><span>배송비 (업체당 1회)</span><b id="vqtyship">'+(isNum(ship)?won(ship)+'원':'미지정')+'</b></div>'+
      '<div class="qtyrow grand"><span>예상 결제금액</span><b id="vqtytotal">'+grand+'</b></div></div>'+
      '<p class="qtyhint">수량이 늘어나도 배송비는 한 번만 더해집니다. 이 계산 기준은 모든 업체에 동일하게 적용됩니다.</p></div>';
  }
  let note = '';
  if(VENDOR_SHIP[selVendor] !== undefined) note = '<div class="note">'+esc(selVendor)+'은(는) 배송비 '+won(VENDOR_SHIP[selVendor])+'원 적용 업체입니다.</div>';
  document.getElementById('vresult').innerHTML =
    '<div class="result"><div class="rname"><span class="rv">'+esc(selVendor)+'</span>선택 제품 정보</div>'+productInfoHtml(p)+
    '<div class="rgrid"><div class="rcell"><div class="k">단가</div>'+priceHtml+'</div>'+
    '<div class="rcell"><div class="k">배송비 (1회)</div>'+shipHtml+'</div></div>'+note+calculator+'</div>';
}
document.getElementById('vresult').addEventListener('input',function(e){
  if(e.target.id==='vqty') updateVQuantityTotal(e.target.value);
});
document.getElementById('vresult').addEventListener('click',function(e){
  const step=e.target.closest('[data-vqty-step]');
  if(step) updateVQuantityTotal(vendorQuantity+Number(step.dataset.vqtyStep));
});
document.getElementById('vsearch')`;
  if (!showPattern.test(source)) throw new Error("Vendor result renderer not found");
  return source.replace(showPattern, replacement);
};
