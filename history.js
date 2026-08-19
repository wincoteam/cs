(function(){
  "use strict";
  const KEY="winco_work_history_v1";
  const PAUSE_KEY="winco_work_history_paused_v1";
  const COPY_KEY="winco_clipboard_history_v1";
  const MAX=100;
  const widget=document.getElementById("historyWidget");
  if(!widget)return;
  const launch=document.getElementById("historyLaunch");
  const panel=document.getElementById("historyPanel");
  const close=document.getElementById("historyClose");
  const pause=document.getElementById("historyPause");
  const clear=document.getElementById("historyClear");
  const list=document.getElementById("historyList");
  const count=document.getElementById("historyCount");
  const search=document.getElementById("historySearch");
  const filters=document.getElementById("historyFilters");
  let active="all";
  let rows=load();
  let paused=false;
  try{paused=localStorage.getItem(PAUSE_KEY)==="1"}catch(e){}
  let searchTimer=0;

  const meta={module:["도구","▦"],search:["검색","⌕"],copy:["복사","⧉"],detail:["열람","Q"],link:["링크","↗"],assistant:["도우미","✦"]};
  function escapeHtml(value){return String(value==null?"":value).replace(/[&<>"']/g,function(char){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]})}
  function load(){try{const data=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(data)?data.filter(Boolean):[]}catch(e){return []}}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(rows.slice(0,MAX)))}catch(e){}}
  function setPaused(value){paused=!!value;try{localStorage.setItem(PAUSE_KEY,paused?"1":"0")}catch(e){};pause.textContent=paused?"기록 재개":"기록 일시정지";pause.setAttribute("aria-pressed",String(paused));render()}
  function normalize(entry){return {id:entry.id||"activity-"+Date.now().toString(36)+Math.random().toString(36).slice(2,5),type:meta[entry.type]?entry.type:"detail",title:String(entry.title||"업무 기록").trim().slice(0,120),detail:String(entry.detail||"").trim().slice(0,1000),module:entry.module&&String(entry.module),query:entry.query&&String(entry.query),url:entry.url&&String(entry.url),at:Number(entry.at)||Date.now(),sourceId:entry.sourceId&&String(entry.sourceId)}}
  function record(entry){if(paused||!entry||!entry.title)return;const next=normalize(entry);rows=rows.filter(function(row){if(next.sourceId&&row.sourceId===next.sourceId)return false;return !(row.type===next.type&&row.title===next.title&&Date.now()-row.at<300000)});rows.unshift(next);rows=rows.slice(0,MAX);save();updateCount();if(widget.classList.contains("is-open"))render()}
  function syncCopies(){if(paused)return;let copies=[];try{copies=JSON.parse(localStorage.getItem(COPY_KEY)||"[]")}catch(e){};if(!Array.isArray(copies))return;const known=new Set(rows.map(function(row){return row.sourceId}).filter(Boolean));let changed=false;copies.forEach(function(item){if(!item||!item.content)return;const sourceId="copy:"+(item.id||item.copiedAt+":"+item.content);if(known.has(sourceId))return;rows.push(normalize({type:"copy",title:item.title||"내용 복사",detail:item.content,at:item.copiedAt,sourceId:sourceId}));changed=true});if(changed){rows.sort(function(a,b){return b.at-a.at});rows=rows.slice(0,MAX);save()}}
  function updateCount(){count.textContent=Math.min(rows.length,99)+(rows.length>99?"+":"")}
  function dayKey(time){const date=new Date(time),now=new Date();const start=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime();const value=new Date(date.getFullYear(),date.getMonth(),date.getDate()).getTime();if(value===start)return"오늘";if(value===start-86400000)return"어제";return(date.getMonth()+1)+"월 "+date.getDate()+"일"}
  function timeText(time){return new Intl.DateTimeFormat("ko-KR",{hour:"2-digit",minute:"2-digit"}).format(new Date(time))}
  function actionText(row){if(row.module)return"다시 열기";if(row.query)return"다시 검색";if(row.url)return"링크 열기";if(row.detail)return"복사";return""}
  function visible(){const q=search.value.trim().toLocaleLowerCase("ko");return rows.filter(function(row){if(active!=="all"&&row.type!==active)return false;if(!q)return true;return(row.title+" "+row.detail).toLocaleLowerCase("ko").includes(q)})}
  function render(){syncCopies();updateCount();const data=visible();filters.querySelectorAll("[data-history-filter]").forEach(function(button){button.classList.toggle("is-active",button.dataset.historyFilter===active)});if(!data.length){list.innerHTML='<div class="history-empty"><strong>'+((search.value||active!=="all")?"일치하는 기록이 없습니다":"아직 기록이 없습니다")+'</strong>도구를 열거나 검색하고 내용을 복사하면<br>여기에 시간순으로 자동 저장됩니다.</div>';return}let last="";list.innerHTML=data.map(function(row){const day=dayKey(row.at);const head=day!==last?'<div class="history-day">'+escapeHtml(day)+'</div>':"";last=day;const info=meta[row.type]||meta.detail;const action=actionText(row);return head+'<article class="history-item" data-history-id="'+escapeHtml(row.id)+'"><span class="history-icon" title="'+info[0]+'">'+info[1]+'</span><div class="history-body"><strong class="history-item-title">'+escapeHtml(row.title)+'</strong>'+(row.detail?'<span class="history-detail">'+escapeHtml(row.detail)+'</span>':"")+'<div class="history-time">'+escapeHtml(info[0])+" · "+timeText(row.at)+'</div></div>'+(action?'<button class="history-action" type="button" data-history-action="'+escapeHtml(row.id)+'">'+action+'</button>':"")+'</article>'}).join("")}
  function setOpen(open){widget.classList.toggle("is-open",open);launch.setAttribute("aria-expanded",String(open));panel.setAttribute("aria-hidden",String(!open));if(open){render();setTimeout(function(){search.focus()},30)}}
  function use(row){setOpen(false);if(row.module){location.hash=row.module;return}if(row.query){const input=document.getElementById("toolSearch");if(input){if(document.body.classList.contains("in-viewer")&&typeof window.goHome==="function")window.goHome(true);input.value=row.query;input.dispatchEvent(new Event("input",{bubbles:true}));setTimeout(function(){input.focus()},50)}return}if(row.url){window.open(row.url,"_blank","noopener");return}if(row.detail){navigator.clipboard.writeText(row.detail).catch(function(){})}}
  window.wincoRecordActivity=record;
  window.wincoQueueSearchHistory=function(query,resultCount){clearTimeout(searchTimer);query=String(query||"").trim();if(query.length<2)return;searchTimer=setTimeout(function(){record({type:"search",title:'“'+query+'” 검색',detail:(Number(resultCount)||0)+"개 결과",query:query})},700)};
  window.addEventListener("message",function(event){const data=event.data;if(!data||data.wincoActivity!==true)return;record(data.entry)});
  launch.addEventListener("click",function(){setOpen(true)});close.addEventListener("click",function(){setOpen(false)});pause.addEventListener("click",function(){setPaused(!paused)});search.addEventListener("input",render);filters.addEventListener("click",function(event){const button=event.target.closest("[data-history-filter]");if(!button)return;active=button.dataset.historyFilter;render()});list.addEventListener("click",function(event){const button=event.target.closest("[data-history-action]");if(!button)return;const row=rows.find(function(item){return item.id===button.dataset.historyAction});if(row)use(row)});clear.addEventListener("click",function(){if(!rows.length||!confirm("업무 히스토리를 모두 삭제할까요?"))return;rows=[];save();render()});document.addEventListener("keydown",function(event){if(event.key==="Escape"&&widget.classList.contains("is-open"))setOpen(false)});
  setPaused(paused);syncCopies();updateCount();
})();
