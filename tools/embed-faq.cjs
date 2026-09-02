const fs = require("fs");
const vm = require("vm");
const enhanceVendorQuantityCalculator = require("./enhance-vendor.cjs");

const indexPath = "index.html.html";
const CS_ADDITIONAL_PRESET = [
  {category:"제품증상",question:"[에어건] 충전 중 사용해도 될까요?",answer:"사용은 가능하지만 제품 고장의 원인이 될 수 있어, 충전을 완료한 후 사용해 주시기를 권장드립니다."},
  {category:"제품증상",question:"[에어건] 작동 시 발열이 발생하는데 불량인가요?",answer:"모터 제품 특성상 작동 중 발열이 발생할 수 있으며 일반적인 발열은 정상입니다.\n\n다만 손에 쥐기 어려울 정도로 뜨거운 경우에는 사용을 중단하고 제품을 회수하여 확인해야 합니다."},
  {category:"제품증상",question:"[에어건] 작동 중 출력이 저하되는데 불량인가요?",answer:"모터 과부하를 방지하기 위해 모터 보호 기능이 자동으로 작동하면 출력이 낮아지거나 전원이 종료될 수 있습니다.\n\n제품과 모터를 보호하기 위한 정상 작동이므로 잠시 식힌 후 다시 사용해 주세요."},
  {category:"제품증상",question:"[에어건] 최고 풍속으로 몇 분 사용할 수 있나요?",answer:"고속 단계 사용 시간은 약 20~30분입니다.\n\n다만 제품 과열 방지를 위해 연속 작동 제한이 약 5분으로 설정되어 있으므로, 중간에 충분히 식힌 후 다시 사용해 주세요."},
  {category:"제품증상",question:"[에어건] 노즐 장착 시 뒤쪽이나 충전 단자 구멍에서도 바람이 나와요.",answer:"노즐 장착 시 바람이 노즐 면에 닿아 역풍이 발생하면서 뒤쪽이나 충전 단자 주변으로 바람이 새어 나올 수 있습니다.\n\n이때 모터 과부하 방지를 위한 보호 기능이 작동해 출력이 낮아질 수 있으며, 해당 현상은 정상입니다."},
  {category:"제품증상",question:"[에어건] 항공기에 반입할 수 있나요?",answer:"항공사마다 배터리 제품 반입 규정이 다르므로 이용하실 항공사에 직접 확인해 주셔야 정확한 안내를 받을 수 있습니다."},
  {category:"제품증상",question:"[에어건] 자충매트에 사용할 수 있나요?",answer:"자충매트는 공기 주입 성능이 충분하지 않을 수 있어 에어건보다 전용 에어펌프 사용을 권장드립니다."},
  {category:"제품증상",question:"[에어건] 에어텐트에 바람을 넣을 수 있나요?",answer:"에어텐트는 공기 주입 성능이 충분하지 않을 수 있어 에어건보다 전용 에어펌프 사용을 권장드립니다."},
  {category:"제품증상",question:"[에어건] 튜브에 사용할 수 있나요?",answer:"사용 가능합니다. 좁은 노즐을 장착하고, 이중 마개 방식의 튜브는 주입구 부분을 살짝 누른 상태에서 공기를 넣어 주세요.\n\n튜브 입구가 매우 좁으면 공기 주입이 어려울 수 있습니다.\n\n좁은 노즐 사용 시 모터 보호 기능으로 1분 미만에 출력이 낮아질 수 있으므로, 잠시 쉬었다가 재작동해 주세요."},
  {category:"제품증상",question:"[에어건] 최대 출력은 몇 W인가요?",answer:"저속은 5W, 고속은 70W입니다."},
  {category:"제품증상",question:"[에어건] 최대 PSI는 얼마인가요?",answer:"압력값(PSI)은 별도로 측정된 값이 없어 안내가 어렵습니다."},
  {category:"제품증상",question:"[에어건] WBM-1000 1세대와 PRO의 차이는 무엇인가요?",answer:"에어건 PRO(GEPRO-101)는 기존 에어건 WBM-1000 1세대의 상위 모델입니다.\n\n• 작동 방식: 버튼 방식 / 레버 방식(PRO)\n• 회전 속도: 85,000rpm / 101,000rpm(PRO)\n• 배터리 용량: 900mAh / 1,100mAh(PRO)"},
  {category:"제품증상",question:"[에어건] 5V/2A 충전기를 사용해도 되나요?",answer:"배터리 보호를 위해 5V/1A 충전을 권장드립니다.\n\n높은 출력의 충전기를 사용하면 정상적으로 충전되지 않거나 배터리에 무리가 갈 수 있어 권장하지 않습니다."},
  {category:"제품증상",question:"[에어건] 좁은 노즐이 정중앙에 맞지 않고 비스듬히 장착돼요.",answer:"제품의 노즐 입구는 의도적으로 정중앙에 맞지 않게 설계되어 있습니다.\n\n노즐이 정중앙에 위치하면 공기 주입이 원활하지 않을 수 있어 비스듬히 옆면으로 장착되도록 제작된 정상 구조입니다."},
  {category:"제품증상",question:"[에어건] 파우치를 구매하면 블랙 색상으로 오나요?",answer:"기존 블랙 파우치에서 카모 무늬의 6종 노즐 보관용 파우치로 변경되었습니다."},
  {category:"제품증상",question:"[에어건] 제품 내부에 머리카락이나 얇은 실이 들어갔어요.",answer:"머리카락이나 얇은 실이 흡입구로 들어가면 제품 고장의 원인이 될 수 있으며, 원칙적으로 유상 A/S 대상입니다.\n\n예외적으로 이번 건에 한해 무상 처리를 안내하는 경우에는 추후 같은 증상 발생 시 유상 처리된다는 점을 함께 안내해 주세요.\n\nA/S가 지연되는 경우에는 외관에 약간의 흠집이 있으나 새 배터리가 장착된 정상 작동 리퍼 상품 교체를 제안할 수 있습니다. 고객이 동의하면 리퍼 상품임을 명확히 안내한 뒤 선불 발송 절차를 진행하고, 동의하지 않으면 수리 후 발송으로 진행합니다."},
  {category:"제품증상",question:"[에어건] 전원이 안 켜지거나 충전·작동이 되지 않아요.",answer:"구매 기간을 확인한 후 교환 또는 리퍼 교체로 안내해 주세요.\n\n확인이 필요한 증상\n• 전원이 들어오지 않음\n• 충전선 연결 시 LED가 켜지지 않음\n• 작동 직후 멈춤\n• 팬이 돌다가 멈춤\n• 탄 냄새가 남"},
  {category:"제품증상",question:"[에어몬스터 터보] 케이스는 어떻게 착용하나요?",answer:"터보 케이스 착용 가이드 링크입니다.\n\n페이지를 중간 정도까지 내리면 젤리 케이스 착용 영상을 확인할 수 있습니다.\nhttps://brand.naver.com/winco/shoppingstory/detail?id=5001523983&page=1"},
  {category:"제품증상",question:"[스트레치랜턴] 작동 시 발열이 있는데 정상인가요?",answer:"색온도에 따라 50℃ 이상까지 발열이 발생할 수 있습니다. 다른 랜턴 제품에서도 발생하는 제품 특성상 정상적인 현상입니다."},
  {category:"제품증상",question:"[스트레치랜턴] 다리를 접은 상태에서도 철판에 붙일 수 있나요?",answer:"자석은 다리 세 면에 장착되어 있으므로 다리를 펼친 후 철판에 부착해 주세요."},
  {category:"제품증상",question:"[스트레치랜턴] 충전하면서 사용할 수 있나요?",answer:"네, 충전 중에도 사용할 수 있습니다."},
  {category:"제품증상",question:"[스트레치랜턴] 배터리 종류는 무엇인가요?",answer:"리튬 배터리입니다."},
  {category:"제품증상",question:"[스트레치랜턴] 다리를 펼쳐도 고정되지 않고 다시 접히는데 정상인가요?",answer:"다리 부분은 편리하게 펴고 접을 수 있도록 고정되지 않는 구조로 제작되었습니다.\n\n손으로 들어 올리거나 제품을 뒤집으면 다리가 접히는 현상은 정상입니다."},
  {category:"제품증상",question:"[스트레치랜턴] 하단부 지름은 얼마인가요?",answer:"하단부 지름은 6.5cm입니다."},
  {category:"제품증상",question:"[스트레치랜턴] 헤드를 바닷물에 담가도 되나요?",answer:"바닷물과 민물에서 모두 사용할 수 있습니다. 다만 램프 홀더는 IPX7 방수 등급으로 설계되어 있으므로 장시간 물에 담가 사용하지 마세요.\n\n사용 후에는 깨끗한 물로 염분을 제거하고 완전히 말려 보관해 주세요."},
  {category:"제품증상",question:"[스트레치랜턴] 영하의 날씨에서도 작동하나요?",answer:"권장 작동 온도는 10℃~40℃입니다.\n\n배터리 제품 특성상 추운 겨울이나 영하 환경에서는 정상 작동하더라도 성능과 사용 시간이 줄어들 수 있습니다."}
];
const polishStyle = `<!-- winco-global-polish -->
<style id="winco-global-polish">
  :root{
    color-scheme:light;accent-color:#0a6b56;
    --wc-bg:#f3f6f5;--wc-surface:#fff;--wc-ink:#15221d;--wc-muted:#68756f;--wc-line:#dce5e1;
    --wc-accent:#0a6b56;--wc-accent-deep:#075443;--wc-soft:#e9f4f0;
    --wc-shadow-sm:0 5px 16px rgba(24,48,40,.045);--wc-shadow:0 13px 34px rgba(24,48,40,.07);
  }
  html{scrollbar-gutter:stable;background:var(--wc-bg)}
  body[data-winco-module]{min-height:100vh;color:var(--wc-ink);background:radial-gradient(circle at 7% 0,rgba(10,107,86,.075),transparent 30%),var(--wc-bg);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
  ::selection{background:#cce7dd;color:#12372d}
  button,a,input,select,textarea{transition:border-color .15s ease,box-shadow .15s ease,background-color .15s ease,transform .15s ease}
  button:active{transform:translateY(1px)}
  *:focus-visible{outline:3px solid rgba(10,107,86,.22)!important;outline-offset:2px!important}
  body[data-winco-module] :is(input:not([type="checkbox"]):not([type="radio"]),select,textarea){border-color:var(--wc-line);border-radius:11px;background:#fff;color:var(--wc-ink)}
  body[data-winco-module] :is(input:not([type="checkbox"]):not([type="radio"]),select,textarea):focus{border-color:var(--wc-accent);box-shadow:0 0 0 4px rgba(10,107,86,.10)}
  body[data-winco-module] :is(input,textarea)::placeholder{color:#9aa5a0}
  body[data-winco-module] button{font-weight:750}
  body[data-winco-module] :is(h1,h2,h3,.title,.section-title,.place-name,.faq-title,.c-name){letter-spacing:-.025em}

  /* Shared module shell */
  body[data-winco-module] :is(.top,.hero,header){border-color:var(--wc-line)}
  body[data-winco-module] :is(.eyebrow,.meta,.section-sub,.lead,.subtext,.hint){letter-spacing:normal}
  body[data-winco-module] :is(.bar>span,.bar-fill,.progress-fill){background:linear-gradient(90deg,var(--wc-accent),#2c9a7c)}
  body[data-winco-module] :is(.wc-ebar,.toolbar,.actions,.acts){gap:8px}
  body[data-winco-module] :is(.wc-ebar,.toolbar,.actions,.acts){align-items:center;flex-wrap:wrap}
  body[data-winco-module] :is(.wc-btn,.btn,.tool,.tab,.chip,.open-link){border-radius:10px}
  body[data-winco-module] :is(button.wc-btn,button.btn,button.tool,button.tab,button.chip,a.open-link){min-height:38px}
  body[data-winco-module] :is(.wc-note,.enote,.notice,.callout){border-radius:13px;line-height:1.65}
  body[data-winco-module] :is(.wrap,.container){width:100%}
  body[data-winco-module] :is(.card,.section,.panel,.product,.item,.row){overflow-wrap:anywhere}

  /* Order and daily checklist */
  body[data-winco-module="order"] :is(.rules,.goal,.card,details.ref),
  body[data-winco-module="csdaily"] :is(.progress-card,.section){border-color:var(--wc-line);border-radius:17px;box-shadow:var(--wc-shadow-sm)}
  body[data-winco-module="order"] .card:hover,
  body[data-winco-module="csdaily"] .section:hover{border-color:#c7d9d2;box-shadow:var(--wc-shadow)}
  body[data-winco-module="order"] .sub{white-space:pre-wrap;overflow-wrap:anywhere}

  /* Parts and vendor price tools */
  body[data-winco-module="parts"] :is(.banner,.ecard,.qpanel,.dock-in),
  body[data-winco-module="vendor"] :is(.top,.panel,.product-info,.result,.qtycalc){border-color:var(--wc-line);border-radius:17px;box-shadow:var(--wc-shadow-sm)}
  body[data-winco-module="parts"] .ecard,
  body[data-winco-module="vendor"] :is(.opt,.qtyrow){transition:background-color .15s,border-color .15s,transform .15s}
  body[data-winco-module="parts"] .ecard:hover,
  body[data-winco-module="vendor"] :is(.opt,.qtyrow):hover{border-color:#bfd6cd;background:#fbfdfc}
  body[data-winco-module="vendor"] .tabs{padding:5px;border:1px solid var(--wc-line);border-radius:14px;background:#fff;box-shadow:var(--wc-shadow-sm)}
  body[data-winco-module="vendor"] .tab.active{background:var(--wc-accent);color:#fff}

  /* Editable manuals and product search */
  body[data-winco-module="cs"] .container>header,
  body[data-winco-module="product"] .container>header{padding-bottom:20px}
  body[data-winco-module="cs"] :is(.file-upload-section,.search-section,.faq-item,.wc-add),
  body[data-winco-module="product"] :is(.file-upload-section,.search-section,.result-card,.wc-add){border-color:var(--wc-line);border-radius:17px;box-shadow:var(--wc-shadow-sm)}
  body[data-winco-module="cs"] .file-upload-section,
  body[data-winco-module="product"] .file-upload-section{background:linear-gradient(135deg,#fbfdfc,#f2f8f5)}
  body[data-winco-module="cs"] .faq-question{min-height:58px;padding:15px 17px}
  body[data-winco-module="cs"] .faq-item[open],
  body[data-winco-module="product"] .result-card:hover{border-color:#b9d5ca;box-shadow:var(--wc-shadow)}
  body[data-winco-module="cs"] .answer-inner{padding:17px 19px 19px;line-height:1.72}
  body[data-winco-module="product"] .result-card{padding:15px}
  body[data-winco-module="product"] .result-item{border-radius:11px}

  /* FAQ knowledge base */
  body[data-winco-module="faq"] .hero{border:1px solid var(--wc-line);border-radius:21px;background:linear-gradient(135deg,#fff,#f1f8f5);box-shadow:var(--wc-shadow)}
  body[data-winco-module="faq"] :is(.product,.answer-row,.detail){border-color:var(--wc-line);border-radius:16px;box-shadow:var(--wc-shadow-sm)}
  body[data-winco-module="faq"] .product[open]{border-color:#b8d4c9;box-shadow:var(--wc-shadow)}
  body[data-winco-module="faq"] .product>summary{min-height:66px;padding:15px 17px}
  body[data-winco-module="faq"] .section-body{line-height:1.72}
  body[data-winco-module="faq"] .answer-row{overflow:hidden}

  /* Trade prices, clipboard and contacts */
  body[data-winco-module="trade"] :is(.top,.notice,.edit-panel,.price-list),
  body[data-winco-module="clipboard"] :is(.top,.toolbar,.item,dialog),
  body[data-winco-module="contacts"] :is(.top,.address-card,.link-card){border-color:var(--wc-line);border-radius:17px;box-shadow:var(--wc-shadow-sm)}
  body[data-winco-module="trade"] .row,
  body[data-winco-module="clipboard"] .item,
  body[data-winco-module="contacts"] :is(.address-card,.link-card){transition:transform .16s,border-color .16s,box-shadow .16s}
  body[data-winco-module="trade"] .row:hover,
  body[data-winco-module="clipboard"] .item:hover,
  body[data-winco-module="contacts"] :is(.address-card,.link-card):hover{transform:translateY(-2px);border-color:#bfd5cc;box-shadow:var(--wc-shadow)}
  body[data-winco-module="clipboard"] .search{box-shadow:0 0 0 1px var(--wc-line),var(--wc-shadow-sm)}
  body[data-winco-module="contacts"] .actions .primary,
  body[data-winco-module="clipboard"] .primary{background:var(--wc-accent);border-color:var(--wc-accent);color:#fff}

  /* Dense editors stay readable */
  body[data-winco-module] :is(.wc-erow,.edit-row){border-color:var(--wc-line);border-radius:14px;background:#fff;box-shadow:var(--wc-shadow-sm)}
  body[data-winco-module] :is(.wc-erow,.edit-row):focus-within{border-color:#aacfc1;box-shadow:0 0 0 4px rgba(10,107,86,.08),var(--wc-shadow-sm)}

  /* Glassmorphism system */
  body[data-winco-module]{
    --wc-bg:#e5eeeb;--wc-surface:rgba(255,255,255,.72);--wc-line:rgba(255,255,255,.82);
    background:radial-gradient(circle at 7% 0,rgba(60,155,125,.19),transparent 31%),radial-gradient(circle at 96% 10%,rgba(211,164,84,.13),transparent 27%),linear-gradient(145deg,#dfeae7,#eef3f1 48%,#dce8e4);
    background-attachment:fixed;
  }
  body[data-winco-module] :is(.top,.hero,.rules,.goal,.progress-card,.calendar-card,.day-panel,.file-upload-section,.search-section,.price-list,.notice,.edit-panel,.address-card,.link-card,.wc-ebar){
    border-color:rgba(255,255,255,.84)!important;background:linear-gradient(145deg,rgba(255,255,255,.78),rgba(244,250,248,.54))!important;
    box-shadow:0 18px 46px rgba(30,62,51,.10),inset 0 1px 0 rgba(255,255,255,.78)!important;
    -webkit-backdrop-filter:blur(21px) saturate(140%);backdrop-filter:blur(21px) saturate(140%);
  }
  body[data-winco-module] :is(.card,.section,.panel,.product,.item,.row,.faq-item,.result-card,.answer-row,.detail,.ecard,.qpanel,.dock-in,.qtycalc,.toolbar){
    border-color:rgba(255,255,255,.74)!important;background:linear-gradient(145deg,rgba(238,247,243,.62),rgba(218,237,229,.43))!important;
    box-shadow:0 9px 25px rgba(32,64,54,.07),inset 0 1px 0 rgba(255,255,255,.72)!important;
    -webkit-backdrop-filter:blur(15px) saturate(135%);backdrop-filter:blur(15px) saturate(135%);
  }
  body[data-winco-module] :is(input:not([type="checkbox"]):not([type="radio"]),select,textarea,button.wc-btn,button.btn,button.tool,button.tab,button.chip,a.open-link){
    border-color:rgba(255,255,255,.78)!important;background-color:rgba(255,255,255,.64)!important;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.66),0 4px 13px rgba(32,64,54,.045);
    -webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);
  }
  body[data-winco-module] :is(button.wc-btn.pri,button.btn.primary,button.tab.active,.primary){background:var(--wc-accent)!important;border-color:var(--wc-accent)!important;color:#fff!important}
  body[data-winco-module="order"] .items{background:transparent!important}
  body[data-winco-module="order"] .item{background:transparent!important;border-color:transparent!important;box-shadow:none!important;-webkit-backdrop-filter:none;backdrop-filter:none}
  body[data-winco-module="order"] .row{border:1px solid rgba(255,255,255,.60)!important;border-radius:12px;background:linear-gradient(135deg,rgba(225,241,235,.70),rgba(240,248,245,.46))!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.62),0 5px 14px rgba(30,62,51,.04)!important}
  body[data-winco-module] :is(.section-body,.answer-inner,.agenda,.edit-panel,.result-body){background-color:transparent!important}
  @supports not ((-webkit-backdrop-filter:blur(1px)) or (backdrop-filter:blur(1px))){body[data-winco-module] :is(.top,.hero,.card,.section,.panel,.product,.item,.row){background:#f8fbfa!important}}
  ::-webkit-scrollbar{width:10px;height:10px}
  ::-webkit-scrollbar-thumb{border:3px solid transparent;border-radius:99px;background:#b8c7c1;background-clip:padding-box}
  ::-webkit-scrollbar-track{background:transparent}
  @media(max-width:620px){
    html{scrollbar-gutter:auto}body[data-winco-module]{background-attachment:fixed}
    body[data-winco-module] :is(.top,.hero){border-radius:17px}
    body[data-winco-module] :is(.wc-ebar,.toolbar,.actions,.acts){gap:6px}
    body[data-winco-module] :is(button.wc-btn,button.btn,button.tool,button.tab,button.chip,a.open-link){min-height:40px}
  }
  @media(prefers-reduced-motion:reduce){body[data-winco-module] *,body[data-winco-module] *::before,body[data-winco-module] *::after{scroll-behavior:auto!important;transition-duration:.01ms!important;animation-duration:.01ms!important;animation-iteration-count:1!important}}
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
const copyHistoryScript = `<!-- winco-copy-history -->
<script id="winco-copy-history">
(function(){
  if(window.__wincoCopyTracking) return;
  window.__wincoCopyTracking = true;
  var KEY = "winco_clipboard_history_v1";
  function notify(entry){
    try{ if(window.parent && window.parent !== window) window.parent.postMessage({wincoActivity:true,entry:entry},"*"); }catch(e){}
  }
  window.wincoRecordCopy = function(text){
    text = String(text == null ? "" : text).trim();
    if(!text) return;
    try{
      var rows = JSON.parse(localStorage.getItem(KEY) || "[]");
      if(!Array.isArray(rows)) rows = [];
      rows = rows.filter(function(row){ return row && row.content !== text; });
      rows.unshift({id:"history-"+Date.now().toString(36),title:document.title || "업무 도구",content:text,copiedAt:Date.now()});
      localStorage.setItem(KEY, JSON.stringify(rows.slice(0,30)));
      notify({type:"copy",title:document.title || "업무 도구",detail:text});
    }catch(e){}
  };
  try{
    if(navigator.clipboard && typeof navigator.clipboard.writeText === "function"){
      var originalWrite = navigator.clipboard.writeText.bind(navigator.clipboard);
      navigator.clipboard.writeText = function(text){
        return originalWrite(text).then(function(result){ window.wincoRecordCopy(text); return result; });
      };
    }
  }catch(e){}
  document.addEventListener("copy", function(){
    setTimeout(function(){
      var active = document.activeElement;
      var text = "";
      if(active && /INPUT|TEXTAREA/.test(active.tagName)) text = active.value.slice(active.selectionStart || 0, active.selectionEnd || 0);
      if(!text && window.getSelection) text = String(window.getSelection());
      window.wincoRecordCopy(text);
    },0);
  });
  document.addEventListener("click", function(event){
    var summary = event.target.closest && event.target.closest("details > summary");
    if(summary){
      setTimeout(function(){
        if(summary.parentElement && summary.parentElement.open){
          notify({type:"detail",title:String(summary.innerText || summary.textContent || "상세 내용").trim().slice(0,120),detail:document.title || "업무 자료"});
        }
      },0);
      return;
    }
    var link = event.target.closest && event.target.closest("a[href]");
    if(link) notify({type:"link",title:String(link.innerText || link.textContent || "링크 열기").trim().slice(0,120),detail:document.title || "업무 자료",url:link.href});
  });
})();
</script>`;
function applyPolish(source, moduleId = "") {
  const clean = source
    .replace(/\n?<!-- winco-global-polish -->[\s\S]*?<style id="winco-global-polish">[\s\S]*?<\/style>\n?/, "")
    .replace(/\n?<!-- winco-cs-editor-polish -->[\s\S]*?<style id="winco-cs-editor-polish">[\s\S]*?<\/style>\n?/, "")
    .replace(/\n?<!-- winco-copy-history -->[\s\S]*?<script id="winco-copy-history">[\s\S]*?<\/script>\n?/, "")
    .replace(/<body\s+data-winco-module="[^"]*"/, "<body");
  const modulePolish = moduleId === "cs" ? `\n${csEditorPolish}` : "";
  const identified = clean.replace(/<body(\s|>)/, `<body data-winco-module="${moduleId}"$1`);
  return identified.replace("</head>", `${polishStyle}${modulePolish}\n</head>`).replace("</body>", `${copyHistoryScript}\n</body>`);
}

function mergeCsPresets(source) {
  source = source.replace(/\s*const CS_REQUIRED_PRESET = \[[\s\S]*?\]; \/\*__WINCO_REQUIRED_PRESET__\*\//, "");
  const presetPattern = /const CS_PRESET = (\[[\s\S]*?\]); \/\*__WINCO_PRESET__\*\//;
  const presetMatch = source.match(presetPattern);
  if (!presetMatch) throw new Error("CS_PRESET not found");
  const current = evaluateExpression(presetMatch[1]);
  const additions = new Map(CS_ADDITIONAL_PRESET.map(row => [row.question, row]));
  const merged = current.filter(row => !additions.has(row.question)).concat(CS_ADDITIONAL_PRESET);
  source = source.replace(
    presetPattern,
    `const CS_PRESET = ${JSON.stringify(merged)}; /*__WINCO_PRESET__*/\n        const CS_REQUIRED_PRESET = ${JSON.stringify(CS_ADDITIONAL_PRESET)}; /*__WINCO_REQUIRED_PRESET__*/`
  );

  const loadPattern = /const CS_BASE = Array\.isArray\(CS_PRESET\)[\s\S]*?let activeCategory = '전체';/;
  const replacement = `const CS_BASE = Array.isArray(CS_PRESET) ? CS_PRESET : defaultFaqs;
        let faqs = JSON.parse(JSON.stringify(CS_BASE));
        (function(){
          try{
            var saved = localStorage.getItem(CS_KEY);
            if(saved){
              var data = JSON.parse(saved);
              if(Array.isArray(data)){
                faqs = data;
                var known = new Set(faqs.map(function(row){ return row && row.question; }));
                var changed = false;
                CS_REQUIRED_PRESET.forEach(function(row){
                  if(!known.has(row.question)){
                    faqs.push(JSON.parse(JSON.stringify(row)));
                    known.add(row.question);
                    changed = true;
                  }
                });
                if(changed) localStorage.setItem(CS_KEY, JSON.stringify(faqs));
              }
            }
          }catch(e){}
        })();
        let activeCategory = '전체';`;
  if (!loadPattern.test(source)) throw new Error("CS saved-data loader not found");
  return source.replace(loadPattern, replacement);
}

let html = fs.readFileSync(indexPath, "utf8");
const pattern = /<script type="application\/json" id="mod-data">([\s\S]*?)<\/script>/;
const match = html.match(pattern);
if (!match) throw new Error("mod-data not found");

const modules = JSON.parse(match[1]).filter(item => !["faq", "contacts", "clipboard", "csdaily", "calendar"].includes(item.id));
for (const module of modules) {
  let decoded = Buffer.from(module.b64, "base64").toString("utf8");
  if (module.id === "cs") decoded = mergeCsPresets(decoded);
  if (module.id === "vendor") decoded = enhanceVendorQuantityCalculator(decoded);
  const polished = applyPolish(decoded, module.id);
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
const clipboardSource = applyPolish(fs.readFileSync("clipboard-module.html", "utf8"), "clipboard");
const clipboard = {
  id: "clipboard",
  name: "복사 보관함",
  desc: "자주 쓰는 답변·주소·계좌·링크를 저장하고 한 번에 복사합니다.",
  icon: "📋",
  accent: "#176b57",
  tag: "빠른 복사",
  b64: Buffer.from(clipboardSource, "utf8").toString("base64")
};

const csDailySource = applyPolish(fs.readFileSync("cs-daily-module.html", "utf8"), "csdaily");
const csDaily = {
  id: "csdaily",
  name: "CS 데일리 체크리스트",
  desc: "톡톡·문의 게시판·어드민·웹메일·A/S 업무를 빠짐없이 확인합니다.",
  icon: "✓",
  accent: "#0a6b56",
  tag: "오늘 업무",
  b64: Buffer.from(csDailySource, "utf8").toString("base64")
};

const calendarSource = applyPolish(fs.readFileSync("calendar-module.html", "utf8"), "calendar");
const calendar = {
  id: "calendar",
  name: "업무 캘린더",
  desc: "날짜별 일정과 메모를 기록하고 월간 화면에서 한눈에 확인합니다.",
  icon: "📅",
  accent: "#0a6b56",
  tag: "일정·메모",
  b64: Buffer.from(calendarSource, "utf8").toString("base64")
};

modules.unshift(calendar);
const insertAt = modules.findIndex(item => item.id === "trade");
modules.splice(insertAt < 0 ? modules.length : insertAt, 0, faq);
const firstCsIndex = modules.findIndex(item => item.id === "parts");
modules.splice(firstCsIndex < 0 ? modules.length : firstCsIndex, 0, csDaily);
modules.push(clipboard);
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

  const partsSource = decodeModule("parts");
  const partsMatch = partsSource.match(/const DEFAULT_DB\s*=\s*(\{[\s\S]*?\});\s*const PRESET/);
  if (partsMatch) {
    const parts = evaluateExpression(partsMatch[1]);
    for (const category of parts.categories || []) {
      for (const item of category.items || []) {
        const details = [...new Set([
          item.price === null ? "개별 구매 불가" : `부품 가격: ${Number(item.price || 0).toLocaleString("ko-KR")}원`,
          item.note,
          typeof parts.ship === "number" && `기본 배송비: ${parts.ship.toLocaleString("ko-KR")}원`
        ].filter(Boolean))];
        add({
          kind: "part",
          title: `${category.cat} · ${item.name}`,
          answer: details.join("\n"),
          module: "parts",
          category: category.cat,
          keywords: `${category.cat} ${item.name} 부품 소모품 구매 가격 재고 배송비`
        });
      }
    }
  }

  const vendorSource = decodeModule("vendor");
  const vendorMatch = vendorSource.match(/const PRESET\s*=\s*(\{[\s\S]*?\});\s*\/\*__WINCO_PRESET__\*\//);
  if (vendorMatch) {
    const vendorData = evaluateExpression(vendorMatch[1]);
    for (const product of vendorData.products || []) {
      const prices = Object.entries(product.prices || {}).map(([vendor, price]) => {
        const ship = product.ship ?? (vendorData.vendorShip || {})[vendor];
        return `${vendor}: ${Number(price || 0).toLocaleString("ko-KR")}원${typeof ship === "number" ? ` · 배송비 ${ship.toLocaleString("ko-KR")}원` : ""}`;
      });
      const details = [
        product.sku && `상품번호: ${product.sku}`,
        ...prices,
        !prices.length && typeof product.ship === "number" && `배송비: ${product.ship.toLocaleString("ko-KR")}원`
      ].filter(Boolean);
      add({
        kind: "vendor",
        title: product.name,
        answer: details.length ? details.join("\n") : "거래처 모듈에 등록된 상품입니다.",
        module: "vendor",
        category: "거래처·배송비",
        keywords: `${product.sku || ""} ${Object.keys(product.prices || {}).join(" ")} 거래처 공급가 배송비 발주`
      });
    }
  }

  add({
    kind: "tool",
    title: "업무 캘린더",
    answer: "날짜를 선택해 업무 일정과 메모를 추가·수정·삭제할 수 있습니다. 완료 체크 시 취소선이 표시되며, 오늘 일정은 메인 화면 오른쪽의 오늘 할 일 패널에도 자동으로 나타납니다.",
    module: "calendar",
    category: "일정·메모",
    keywords: "캘린더 달력 일정 스케줄 메모 날짜 업무 계획 등록"
  });

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
      url: "https://careplz.kr/as-pre/as-5e5242d0"
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
    },
    {
      title: "로보락 고객센터",
      answer: "로보락 고객센터 대표번호는 1577-8911입니다.",
      category: "고객센터 연락처",
      keywords: "로보락 고객센터 대표번호 전화번호 연락처 상담 문의 1577 8911"
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

for (const [name, document] of [["faq-module.html", source], ["contacts-module.html", contactsSource], ["clipboard-module.html", clipboardSource], ["cs-daily-module.html", csDailySource], [indexPath, html]]) {
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
