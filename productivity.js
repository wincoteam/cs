(function(){
  "use strict";
  const deck=document.getElementById("commandDeck");
  if(!deck)return;
  const quick=document.getElementById("quickTools");
  const status=document.getElementById("deckStatus");
  const feedback=document.getElementById("deckFeedback");
  const backup=document.getElementById("deckBackup");
  const restore=document.getElementById("deckRestore");
  const restoreInput=document.getElementById("deckRestoreInput");
  const reset=document.getElementById("deckResetLayout");
  const search=document.getElementById("toolSearch");
  const today=document.getElementById("today");
  const fallback=["csdaily","cs","product","contacts"];
  const positionKeys=["winco_counsel_position_v1","winco_tracking_position_v1","winco_history_position_v1","winco_assistant_position_v1","winco_postit_layout_v1"];

  function parse(key,fallbackValue){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallbackValue))}catch(error){return fallbackValue}}
  function moduleMeta(){
    const map={};
    document.querySelectorAll("[data-mod]").forEach(function(card){
      const id=card.dataset.mod;if(!id||map[id])return;
      map[id]={id:id,name:(card.querySelector(".c-name")||{}).textContent||id,icon:(card.querySelector(".chip")||{}).textContent||"▦",tag:(card.querySelector(".c-tag")||{}).textContent||"업무 도구",accent:card.style.getPropertyValue("--ac")||"#0a6b56"};
    });
    return map;
  }
  function ranked(meta){
    const saved=parse("winco_work_history_v1",[]),rows=Array.isArray(saved)?saved:[],score={},latest={};
    rows.forEach(function(row,index){if(!row||row.type!=="module"||!meta[row.module])return;score[row.module]=(score[row.module]||0)+Math.max(1,18-index);latest[row.module]=Math.max(latest[row.module]||0,Number(row.at)||0)});
    const ids=Object.keys(score).sort(function(a,b){return score[b]-score[a]||latest[b]-latest[a]});
    fallback.forEach(function(id){if(meta[id]&&!ids.includes(id))ids.push(id)});
    Object.keys(meta).forEach(function(id){if(!ids.includes(id))ids.push(id)});
    return ids.slice(0,4);
  }
  function todayInfo(){
    const now=new Date(),key=[now.getFullYear(),String(now.getMonth()+1).padStart(2,"0"),String(now.getDate()).padStart(2,"0")].join("-");
    const saved=parse("winco_calendar_events_v1",[]),rows=(Array.isArray(saved)?saved:[]).filter(function(row){return row&&row.date===key});
    return {total:rows.length,done:rows.filter(function(row){return row.completed}).length};
  }
  function render(){
    const meta=moduleMeta(),ids=ranked(meta);
    quick.innerHTML=ids.map(function(id,index){const item=meta[id];return '<button class="quick-tool" type="button" data-quick-module="'+id+'" style="--quick-ac:'+item.accent+'"><span class="quick-tool-icon" aria-hidden="true">'+item.icon+'</span><span class="quick-tool-copy"><strong>'+item.name+'</strong><span>'+item.tag+'</span></span><span class="quick-tool-kbd">Alt+'+(index+1)+'</span></button>'}).join("");
    const saved=parse("winco_work_history_v1",[]),history=Array.isArray(saved)?saved:[],info=todayInfo(),last=history.find(function(row){return row&&row.type==="module"&&meta[row.module]});
    if(info.total)status.innerHTML='<span class="deck-status-label">오늘 업무 현황</span><strong>'+info.total+'개 중 '+info.done+'개 완료</strong>';
    else status.innerHTML='<span class="deck-status-label">업무 시작 준비</span><strong>'+(last?'최근 '+meta[last.module].name:'오늘 일정 없음')+'</strong>';
  }
  function announce(message){feedback.textContent=message;clearTimeout(announce.timer);announce.timer=setTimeout(function(){feedback.textContent=""},3000)}
  function open(id){if(typeof window.openModule==="function")window.openModule(id,true)}
  function exportData(){
    const data={};for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key&&key.indexOf("winco_")===0)data[key]=localStorage.getItem(key)}
    const payload={product:"WINCO CS 업무 허브",version:1,exportedAt:new Date().toISOString(),data:data};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),link=document.createElement("a");
    link.href=url;link.download="winco-cs-backup-"+new Date().toISOString().slice(0,10)+".json";document.body.appendChild(link);link.click();link.remove();setTimeout(function(){URL.revokeObjectURL(url)},1000);announce("업무 데이터 백업 파일을 저장했습니다.");
  }
  function importData(file){
    if(!file)return;const reader=new FileReader();reader.onload=function(){try{const payload=JSON.parse(String(reader.result||"")),data=payload&&payload.data;if(!data||typeof data!=="object"||Array.isArray(data))throw new Error("invalid");const keys=Object.keys(data).filter(function(key){return key.indexOf("winco_")===0&&typeof data[key]==="string"});if(!keys.length)throw new Error("empty");if(!confirm("백업된 업무 데이터 "+keys.length+"개를 복원할까요? 현재 같은 항목은 덮어씁니다."))return;keys.forEach(function(key){localStorage.setItem(key,data[key])});location.reload()}catch(error){announce("올바른 WINCO 업무 백업 파일이 아닙니다.")}};reader.readAsText(file);restoreInput.value="";
  }
  function resetLayout(){if(!confirm("팝업과 포스트잇 위치만 기본 위치로 되돌릴까요? 메모와 업무 데이터는 유지됩니다."))return;positionKeys.forEach(function(key){localStorage.removeItem(key)});announce("팝업 위치를 초기화했습니다. 화면을 새로고침합니다.");setTimeout(function(){location.reload()},650)}
  function updateDate(){if(!today)return;today.textContent=new Intl.DateTimeFormat("ko-KR",{year:"numeric",month:"long",day:"numeric",weekday:"short"}).format(new Date())}
  quick.addEventListener("click",function(event){const button=event.target.closest("[data-quick-module]");if(button)open(button.dataset.quickModule)});
  backup.addEventListener("click",exportData);restore.addEventListener("click",function(){restoreInput.click()});restoreInput.addEventListener("change",function(){importData(restoreInput.files&&restoreInput.files[0])});reset.addEventListener("click",resetLayout);
  document.addEventListener("keydown",function(event){
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"){event.preventDefault();if(document.body.classList.contains("in-viewer")&&typeof window.goHome==="function")window.goHome(true);setTimeout(function(){search.focus();search.select()},40);return}
    if(event.altKey&&!event.ctrlKey&&!event.metaKey&&/^[1-4]$/.test(event.key)){const button=quick.querySelectorAll("[data-quick-module]")[Number(event.key)-1];if(button){event.preventDefault();open(button.dataset.quickModule)}}
  });
  search.addEventListener("keydown",function(event){if(event.key!=="ArrowDown")return;const first=document.querySelector("#unifiedResults .unified-action");if(first){event.preventDefault();first.focus()}});
  document.getElementById("unifiedResults").addEventListener("keydown",function(event){if(event.key!=="ArrowDown"&&event.key!=="ArrowUp")return;const items=Array.from(this.querySelectorAll(".unified-action")),index=items.indexOf(document.activeElement);if(index<0)return;event.preventDefault();items[(index+(event.key==="ArrowDown"?1:-1)+items.length)%items.length].focus()});
  window.wincoRefreshCommandDeck=render;window.addEventListener("focus",render);window.addEventListener("message",function(event){if(event.data&&event.data.wincoCalendarUpdated)render()});
  updateDate();render();
})();
