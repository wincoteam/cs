(function(){
  "use strict";
  const tools=[
    {id:"counselWidget",launch:"counselLaunch",head:".counsel-head",key:"winco_counsel_position_v1"},
    {id:"trackingWidget",launch:"trackingLaunch",head:".tracking-head",key:"winco_tracking_position_v1"},
    {id:"historyWidget",launch:"historyLaunch",head:".history-head",key:"winco_history_position_v1"}
  ];
  let topLayer=120;
  function clamp(value,min,max){return Math.min(Math.max(value,min),Math.max(min,max))}
  function read(key){try{const value=JSON.parse(localStorage.getItem(key)||"null");return value&&Number.isFinite(value.left)&&Number.isFinite(value.top)?value:null}catch(error){return null}}
  function save(key,position){try{localStorage.setItem(key,JSON.stringify(position))}catch(error){}}
  function visibleSurface(widget,launch,head){return widget.classList.contains("is-open")?(head&&head.parentElement?head.parentElement:widget):launch}
  function apply(widget,launch,head,position){
    const surface=visibleSurface(widget,launch,head);
    const width=surface.offsetWidth||widget.offsetWidth||260;
    const height=surface.offsetHeight||widget.offsetHeight||46;
    const left=clamp(position.left,8,window.innerWidth-width-8);
    const top=clamp(position.top,8,window.innerHeight-height-8);
    widget.style.left=left+"px";
    widget.style.top=top+"px";
    widget.style.right="auto";
    widget.style.bottom="auto";
    widget.classList.add("has-floating-position");
    return {left:left,top:top};
  }
  function attach(config){
    const widget=document.getElementById(config.id),launch=document.getElementById(config.launch);
    if(!widget||!launch)return;
    const head=widget.querySelector(config.head);
    let position=read(config.key);
    let suppressClickUntil=0;
    if(position)requestAnimationFrame(function(){position=apply(widget,launch,head,position)});
    function drag(handle){
      if(!handle)return;
      let pointerId=null,startX=0,startY=0,startLeft=0,startTop=0,moved=false;
      handle.addEventListener("pointerdown",function(event){
        if(event.button!==0)return;
        if(handle!==launch&&event.target.closest("button"))return;
        const rect=widget.getBoundingClientRect();
        pointerId=event.pointerId;startX=event.clientX;startY=event.clientY;startLeft=rect.left;startTop=rect.top;moved=false;
        widget.style.zIndex=String(++topLayer);
        try{handle.setPointerCapture(pointerId)}catch(error){}
      });
      handle.addEventListener("pointermove",function(event){
        if(event.pointerId!==pointerId)return;
        const dx=event.clientX-startX,dy=event.clientY-startY;
        if(!moved&&Math.hypot(dx,dy)<5)return;
        moved=true;event.preventDefault();widget.classList.add("is-floating-dragging");
        position=apply(widget,launch,head,{left:startLeft+dx,top:startTop+dy});
      });
      function finish(event){
        if(event.pointerId!==pointerId)return;
        try{handle.releasePointerCapture(pointerId)}catch(error){}
        pointerId=null;widget.classList.remove("is-floating-dragging");
        if(moved){suppressClickUntil=Date.now()+450;save(config.key,position)}
      }
      handle.addEventListener("pointerup",finish);
      handle.addEventListener("pointercancel",finish);
    }
    drag(launch);drag(head);
    launch.addEventListener("click",function(event){if(Date.now()<suppressClickUntil){event.preventDefault();event.stopImmediatePropagation()}},true);
    new MutationObserver(function(){
      if(!position)return;
      requestAnimationFrame(function(){position=apply(widget,launch,head,position);save(config.key,position)});
    }).observe(widget,{attributes:true,attributeFilter:["class"]});
    window.addEventListener("resize",function(){if(position){position=apply(widget,launch,head,position);save(config.key,position)}});
  }
  tools.forEach(attach);
})();
