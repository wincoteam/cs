(function(){
  "use strict";
  const KEY="winco_calendar_events_v1";
  const POSITION_KEY="winco_today_schedule_position_v1";
  const popup=document.getElementById("todaySchedule");
  if(!popup)return;
  const list=document.getElementById("todayScheduleList");
  const summary=document.getElementById("todayScheduleSummary");
  const progress=document.getElementById("todayScheduleProgress");
  const collapse=document.getElementById("todayScheduleCollapse");
  const dateLabel=document.getElementById("todayScheduleDate");
  const openButton=document.getElementById("todayScheduleOpen");
  const cardStatus=document.getElementById("calendarCardStatus");
  const head=popup.querySelector(".today-schedule-head");
  let savedPosition=readPosition();
  function readPosition(){try{const value=JSON.parse(localStorage.getItem(POSITION_KEY)||"null");return value&&Number.isFinite(value.left)&&Number.isFinite(value.top)?value:null}catch(e){return null}}
  function clamp(value,min,max){return Math.min(Math.max(value,min),Math.max(min,max))}
  function applyPosition(position){
    if(!position||popup.hidden)return;
    const rect=popup.getBoundingClientRect(),left=clamp(position.left,8,window.innerWidth-rect.width-8),top=clamp(position.top,8,window.innerHeight-rect.height-8);
    popup.style.left=left+"px";popup.style.top=top+"px";popup.style.right="auto";savedPosition={left:left,top:top};
  }
  function savePosition(){if(!savedPosition)return;try{localStorage.setItem(POSITION_KEY,JSON.stringify(savedPosition))}catch(e){}}
  function enableDrag(){
    let pointerId=null,startX=0,startY=0,startLeft=0,startTop=0,moved=false;
    head.addEventListener("pointerdown",event=>{
      if(event.button!==0||event.target.closest("button"))return;
      const rect=popup.getBoundingClientRect();pointerId=event.pointerId;startX=event.clientX;startY=event.clientY;startLeft=rect.left;startTop=rect.top;moved=false;head.setPointerCapture(pointerId);
    });
    head.addEventListener("pointermove",event=>{
      if(event.pointerId!==pointerId)return;const dx=event.clientX-startX,dy=event.clientY-startY;if(!moved&&Math.hypot(dx,dy)<5)return;moved=true;event.preventDefault();popup.classList.add("is-dragging");applyPosition({left:startLeft+dx,top:startTop+dy});
    });
    function finish(event){if(event.pointerId!==pointerId)return;try{head.releasePointerCapture(pointerId)}catch(e){}pointerId=null;popup.classList.remove("is-dragging");if(moved)savePosition()}
    head.addEventListener("pointerup",finish);head.addEventListener("pointercancel",finish);
  }
  function dateKey(date){return [date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-")}
  const today=dateKey(new Date());
  dateLabel.textContent=new Intl.DateTimeFormat("ko-KR",{month:"long",day:"numeric",weekday:"long"}).format(new Date());
  function read(){try{const rows=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(rows)?rows:[]}catch(e){return[]}}
  function write(rows){try{localStorage.setItem(KEY,JSON.stringify(rows))}catch(e){}}
  function todayRows(){return read().filter(row=>row&&row.date===today).sort((a,b)=>Number(Boolean(a.completed))-Number(Boolean(b.completed))||(a.time||"99:99").localeCompare(b.time||"99:99")||(a.createdAt||0)-(b.createdAt||0))}
  function render(){
    const rows=todayRows();
    const done=rows.filter(row=>row.completed).length;
    if(cardStatus){cardStatus.textContent=rows.length?"오늘 "+rows.length+"개 중 "+done+"개 완료":"오늘 일정 없음";cardStatus.classList.toggle("is-complete",Boolean(rows.length)&&done===rows.length)}
    popup.hidden=!rows.length;
    if(!rows.length)return;
    if(savedPosition)requestAnimationFrame(()=>applyPosition(savedPosition));
    summary.textContent=done===rows.length?"오늘 일정 모두 완료했어요":"오늘 해야 할 업무를 확인하세요";
    progress.textContent=rows.length+"개 중 "+done+"개 완료";
    list.innerHTML="";
    rows.forEach(row=>{
      const label=document.createElement("label");label.className="today-schedule-item"+(row.completed?" is-done":"");label.dataset.id=row.id;label.style.setProperty("--event",row.color||"#0a6b56");
      const check=document.createElement("input");check.type="checkbox";check.className="today-schedule-check";check.checked=Boolean(row.completed);check.setAttribute("aria-label",row.title+" 완료");label.appendChild(check);
      const content=document.createElement("span");content.className="today-schedule-content";const line=document.createElement("span");line.className="today-schedule-line";
      if(row.time){const time=document.createElement("span");time.className="today-schedule-time";time.textContent=row.time;line.appendChild(time)}
      const name=document.createElement("span");name.className="today-schedule-name";name.textContent=row.title;line.appendChild(name);content.appendChild(line);
      if(row.note){const memo=document.createElement("span");memo.className="today-schedule-memo";memo.textContent=row.note;content.appendChild(memo)}
      label.appendChild(content);list.appendChild(label);
    });
  }
  list.addEventListener("change",event=>{
    const check=event.target.closest(".today-schedule-check");if(!check)return;
    const id=check.closest(".today-schedule-item").dataset.id,now=Date.now();
    const rows=read().map(row=>row&&row.id===id?Object.assign({},row,{completed:check.checked,completedAt:check.checked?now:null,updatedAt:now}):row);
    write(rows);render();
    const frame=document.querySelector("#frameHost iframe");
    try{if(frame&&frame.contentWindow)frame.contentWindow.postMessage({wincoCalendarUpdated:true},"*")}catch(e){}
  });
  collapse.addEventListener("click",()=>{const collapsed=popup.classList.toggle("is-collapsed");collapse.setAttribute("aria-expanded",String(!collapsed));if(savedPosition)requestAnimationFrame(()=>applyPosition(savedPosition))});
  openButton.addEventListener("click",()=>{if(typeof window.openModule==="function")window.openModule("calendar",true)});
  window.addEventListener("storage",event=>{if(event.key===KEY)render()});
  window.addEventListener("message",event=>{if(event.data&&event.data.wincoCalendarUpdated)render()});
  window.addEventListener("focus",render);
  window.addEventListener("resize",()=>{if(savedPosition)applyPosition(savedPosition)});
  enableDrag();
  render();
})();
