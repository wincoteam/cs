(function(){
  "use strict";
  const KEY="winco_tracking_history_v1";
  const MAX=15;
  const carriers={
    cj:{name:"CJ대한통운",min:10,max:12,url:function(no){return"https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo="+encodeURIComponent(no)}},
    hanjin:{name:"한진택배",min:10,max:14,url:function(no){return"https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumText2="+encodeURIComponent(no)}},
    lotte:{name:"롯데택배",min:10,max:14,url:function(no){return"https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo="+encodeURIComponent(no)}},
    logen:{name:"로젠택배",min:11,max:11,url:function(no){return"https://m.ilogen.com/web/personal/tkSearch?slipno="+encodeURIComponent(no)}},
    post:{name:"우체국택배",min:13,max:13,url:function(no){return"https://biz.epost.go.kr/KpostPortal/servlet/OpenApiCmd?cmd=traceSearch&regino="+encodeURIComponent(no)}}
  };
  const widget=document.getElementById("trackingWidget");
  if(!widget)return;
  const launch=document.getElementById("trackingLaunch");
  const panel=document.getElementById("trackingPanel");
  const close=document.getElementById("trackingClose");
  const carrier=document.getElementById("trackingCarrier");
  const number=document.getElementById("trackingNumber");
  const memo=document.getElementById("trackingMemo");
  const hint=document.getElementById("trackingHint");
  const submit=document.getElementById("trackingSubmit");
  const copy=document.getElementById("trackingCopy");
  const list=document.getElementById("trackingList");
  const count=document.getElementById("trackingCount");
  const clear=document.getElementById("trackingClear");
  let rows=load();

  function escapeHtml(value){return String(value==null?"":value).replace(/[&<>"']/g,function(char){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]})}
  function clean(value){return String(value||"").replace(/[^0-9]/g,"").slice(0,20)}
  function load(){try{const data=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(data)?data.filter(function(row){return row&&carriers[row.carrier]&&row.number}):[]}catch(e){return[]}}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(rows.slice(0,MAX)))}catch(e){}}
  function updateCount(){count.textContent=rows.length}
  function validate(){const no=clean(number.value);number.value=no;const rule=carriers[carrier.value];if(!no){hint.textContent="송장번호를 입력해 주세요.";hint.classList.add("is-error");return null}if(no.length<rule.min||no.length>rule.max){hint.textContent=rule.name+" 송장번호는 "+(rule.min===rule.max?rule.min+"자리":rule.min+"~"+rule.max+"자리")+"인지 확인해 주세요.";hint.classList.add("is-error");return null}hint.textContent="숫자만 자동으로 정리했습니다. 조회하면 공식 배송조회 페이지가 열립니다.";hint.classList.remove("is-error");return no}
  function render(){updateCount();if(!rows.length){list.innerHTML='<div class="tracking-empty">최근 조회한 송장번호가 없습니다.<br>조회하면 이 기기에 자동 저장됩니다.</div>';return}list.innerHTML=rows.map(function(row){return'<article class="tracking-item"><button class="tracking-item-main" type="button" data-tracking-load="'+escapeHtml(row.id)+'"><span class="tracking-item-top"><span class="tracking-carrier">'+escapeHtml(carriers[row.carrier].name)+'</span><strong class="tracking-item-number">'+escapeHtml(row.number)+'</strong></span>'+(row.memo?'<span class="tracking-item-memo">'+escapeHtml(row.memo)+'</span>':"")+'</button><span class="tracking-item-buttons"><button class="tracking-small" type="button" data-tracking-open="'+escapeHtml(row.id)+'" aria-label="다시 조회">↗</button><button class="tracking-small delete" type="button" data-tracking-delete="'+escapeHtml(row.id)+'" aria-label="기록 삭제">×</button></span></article>'}).join("")}
  function setOpen(open){widget.classList.toggle("is-open",open);launch.setAttribute("aria-expanded",String(open));panel.setAttribute("aria-hidden",String(!open));if(open){document.dispatchEvent(new CustomEvent("winco-popup-open",{detail:"tracking"}));render();setTimeout(function(){number.focus()},30)}}
  function storeAndOpen(no,carrierId,note){const rule=carriers[carrierId];const row={id:"tracking-"+Date.now().toString(36),carrier:carrierId,number:no,memo:String(note||"").trim().slice(0,80),at:Date.now()};rows=rows.filter(function(item){return!(item.carrier===carrierId&&item.number===no)});rows.unshift(row);rows=rows.slice(0,MAX);save();render();const url=rule.url(no);if(typeof window.wincoRecordActivity==="function")window.wincoRecordActivity({type:"link",title:rule.name+" 송장 조회",detail:no+(row.memo?" · "+row.memo:""),url:url});window.open(url,"_blank","noopener")}
  function track(){const no=validate();if(!no)return;storeAndOpen(no,carrier.value,memo.value)}
  async function copyNumber(){const no=validate();if(!no)return;try{await navigator.clipboard.writeText(no)}catch(e){const area=document.createElement("textarea");area.value=no;document.body.appendChild(area);area.select();document.execCommand("copy");area.remove()}if(typeof window.wincoRecordActivity==="function")window.wincoRecordActivity({type:"copy",title:"송장번호 복사",detail:no});const original=copy.textContent;copy.textContent="복사됨 ✓";setTimeout(function(){copy.textContent=original},1200)}
  launch.addEventListener("click",function(){setOpen(true)});close.addEventListener("click",function(){setOpen(false)});number.addEventListener("input",function(){number.value=clean(number.value);hint.classList.remove("is-error");hint.textContent="하이픈·공백은 자동으로 제거됩니다."});number.addEventListener("keydown",function(event){if(event.key==="Enter"){event.preventDefault();track()}});memo.addEventListener("keydown",function(event){if(event.key==="Enter"){event.preventDefault();track()}});submit.addEventListener("click",track);copy.addEventListener("click",copyNumber);list.addEventListener("click",function(event){const loadButton=event.target.closest("[data-tracking-load]");const openButton=event.target.closest("[data-tracking-open]");const deleteButton=event.target.closest("[data-tracking-delete]");const id=(loadButton&&loadButton.dataset.trackingLoad)||(openButton&&openButton.dataset.trackingOpen)||(deleteButton&&deleteButton.dataset.trackingDelete);if(!id)return;const row=rows.find(function(item){return item.id===id});if(!row)return;if(deleteButton){rows=rows.filter(function(item){return item.id!==id});save();render();return}carrier.value=row.carrier;number.value=row.number;memo.value=row.memo||"";validate();if(openButton)storeAndOpen(row.number,row.carrier,row.memo)});clear.addEventListener("click",function(){if(!rows.length||!confirm("최근 송장 조회 기록을 모두 삭제할까요?"))return;rows=[];save();render()});document.addEventListener("winco-popup-open",function(event){if(event.detail!=="tracking")setOpen(false)});document.addEventListener("keydown",function(event){if(event.key==="Escape"&&widget.classList.contains("is-open"))setOpen(false)});
  render();
})();
