(function(){
  "use strict";

  const data = Array.isArray(window.WINCO_ASSISTANT_DATA) ? window.WINCO_ASSISTANT_DATA : [];
  const widget = document.getElementById("assistantWidget");
  if (!widget) return;

  const launch = document.getElementById("assistantLaunch");
  const close = document.getElementById("assistantClose");
  const messages = document.getElementById("assistantMessages");
  const input = document.getElementById("assistantInput");
  const send = document.getElementById("assistantSend");
  const moduleNames = {
    cs: "CS 매뉴얼",
    faq: "제품 FAQ",
    trade: "보상·협의구매",
    contacts: "주소·링크",
    product: "상품 목록"
  };
  let previousQuery = "";
  let previousResult = null;

  const groups = [
    ["as","a/s","에이에스","수리","고장","점검","서비스","서비스센터"],
    ["주소","어디","어디로","보내","보낼","발송","택배","반납","회수"],
    ["가격","금액","얼마","비용","원","보상가"],
    ["보상","보상판매","교환","반납판매"],
    ["접수","신청","등록","접수방법"],
    ["충전","충전기","배터리","전원"],
    ["모터","펌프","에어펌프"],
    ["에어건","에어몬스터","먼지제거기"],
    ["랜턴","캠핑등","led랜턴","스트레치랜턴"],
    ["청소기","진공청소기","무선청소기"],
    ["링크","페이지","홈페이지","사이트","바로가기"]
  ];

  function normalize(value){
    return String(value || "")
      .normalize("NFKC")
      .toLocaleLowerCase("ko")
      .replace(/a\s*\/?\s*s/g, " as ")
      .replace(/[^0-9a-z가-힣]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function compact(value){
    return normalize(value).replace(/\s/g, "");
  }

  function tokens(value){
    const base = normalize(value).split(" ").filter(Boolean);
    const expanded = new Set(base);
    const joined = compact(value);
    groups.forEach(function(group){
      if(group.some(function(word){ return joined.includes(compact(word)); })){
        group.forEach(function(word){ expanded.add(normalize(word)); });
      }
    });
    return [...expanded].filter(function(word){ return word.length > 1 || /[0-9]/.test(word); });
  }

  function bigrams(value){
    const text = compact(value);
    const result = [];
    if(text.length < 2) return text ? [text] : result;
    for(let i=0;i<text.length-1;i++) result.push(text.slice(i,i+2));
    return result;
  }

  function dice(a,b){
    const aa = bigrams(a);
    const bb = bigrams(b);
    if(!aa.length || !bb.length) return 0;
    const counts = new Map();
    aa.forEach(function(x){ counts.set(x,(counts.get(x)||0)+1); });
    let hits = 0;
    bb.forEach(function(x){
      const count = counts.get(x) || 0;
      if(count){ hits++; counts.set(x,count-1); }
    });
    return (2*hits)/(aa.length+bb.length);
  }

  function prepare(item){
    const title = normalize(item.title);
    const keywords = normalize(item.keywords+" "+item.category);
    const answer = normalize(item.answer);
    return Object.assign({},item,{
      _title:title,
      _titleCompact:compact(title),
      _keywords:keywords,
      _answer:answer,
      _all:`${title} ${keywords} ${answer}`
    });
  }

  const knowledge = data.map(prepare);

  function hasAny(text, words){
    const value = compact(text);
    return words.some(function(word){ return value.includes(compact(word)); });
  }

  function contextualQuery(query){
    const shortFollowUp = compact(query).length <= 12 && hasAny(query,[
      "그거","그건","그제품","그상품","얼마","어디","방법","링크","그러면","보내"
    ]);
    if(shortFollowUp && previousResult){
      return `${previousResult.title} ${previousQuery} ${query}`;
    }
    return query;
  }

  function scoreItem(item, query){
    const q = normalize(query);
    const qCompact = compact(q);
    const queryTokens = tokens(q);
    let score = 0;
    if(!qCompact) return 0;

    if(item._titleCompact === qCompact) score += 180;
    if(item._titleCompact.includes(qCompact) && qCompact.length > 2) score += 95;
    if(qCompact.includes(item._titleCompact) && item._titleCompact.length > 3) score += 72;

    queryTokens.forEach(function(token){
      const c = compact(token);
      if(!c) return;
      if(item._titleCompact.includes(c)) score += c.length >= 4 ? 24 : 15;
      else if(compact(item._keywords).includes(c)) score += c.length >= 4 ? 15 : 9;
      else if(compact(item._answer).includes(c)) score += c.length >= 4 ? 7 : 3;
    });

    score += dice(qCompact,item._titleCompact)*44;

    const priceIntent = hasAny(q,["얼마","가격","금액","비용","보상가"]);
    const addressIntent = hasAny(q,["주소","어디로","보내","발송","택배","반납"]);
    const linkIntent = hasAny(q,["링크","페이지","사이트","홈페이지","접수"]);
    const repairIntent = hasAny(q,["as","에이에스","수리","고장","불량","작동안","안돼","안되"]);
    const tradeIntent = hasAny(q,["보상","보상판매","기기반납"]);

    if(priceIntent && item.kind === "price") score += 58;
    if(addressIntent && item.kind === "address") score += 52;
    if(linkIntent && item.kind === "link") score += 32;
    if(repairIntent && ["faq","guide","manual"].includes(item.kind)) score += 13;
    if(tradeIntent && item.module === "trade") score += 32;
    if(tradeIntent && item.title.includes("인천 창고") && addressIntent) score += 52;
    if(repairIntent && addressIntent && item.title.includes("고빅스")) score += 46;
    if(hasAny(q,["사무실","특이사항","직접검수"]) && item.title.includes("사무실")) score += 70;
    if(hasAny(q,["톡톡","네이버"]) && item.title.includes("톡톡")) score += 80;
    if(hasAny(q,["접수방법","어떻게접수"]) && item.title.includes("접수방법")) score += 65;

    return score;
  }

  function search(query){
    return knowledge
      .map(function(item){ return {item:item,score:scoreItem(item,query)}; })
      .filter(function(row){ return row.score >= 18; })
      .sort(function(a,b){ return b.score-a.score; })
      .slice(0,8);
  }

  const priceAliases = [
    ["에어몬스터 프로 New",["에어몬스터프로new","에어몬스터프로뉴","에어몬스터pro","프로new","프로뉴","윈코프로new","윈코프로뉴"]],
    ["에어몬스터 터보",["에어몬스터터보","윈코터보","터보"]],
    ["에어몬스터2",["에어몬스터2","에어몬스터투","몬스터2","몬스터투"]],
    ["스트레치 랜턴",["스트레치랜턴","스트레치등","스트레치"]],
    ["LED 캠핑 랜턴",["led캠핑랜턴","led랜턴","캠핑랜턴","캠핑등"]],
    ["에어매트·에어베드 교체용 모터",["에어매트모터","에어베드모터","교체용모터","매트모터","베드모터","모터만"]]
  ];

  function itemByTitle(title){
    return knowledge.find(function(item){ return item.title === title; });
  }

  function exactPriceItem(query){
    const q = compact(query);
    const matches = priceAliases.filter(function(row){
      return row[1].some(function(alias){ return q.includes(compact(alias)); });
    });
    return matches.length === 1 ? itemByTitle(matches[0][0]) : null;
  }

  function answerResolution(query){
    const q = contextualQuery(query);
    const wantsPrice = hasAny(query,["얼마","가격","금액","비용","보상가"]);
    const wantsTrade = hasAny(query,["보상","보상판매","기기반납"]);
    const wantsAddress = hasAny(query,["주소","어디로","보내","보낼","발송","택배","반납"]);
    const wantsLink = hasAny(query,["링크","페이지","사이트","홈페이지","접수"]);
    const wantsRepair = hasAny(query,["as","에이에스","수리","고장","불량","검수"]);
    const contextTrade = hasAny(q,["보상","보상판매","기기반납"]);
    const contextRepair = hasAny(q,["as","에이에스","수리","고장","불량","검수"]);
    const followsPrevious = compact(query).length <= 12 &&
      hasAny(query,["그거","그건","그제품","그상품","그러면","어디","보내"]);

    if(wantsPrice || (wantsTrade && !wantsAddress && !wantsLink)){
      const price = exactPriceItem(q);
      if(price){
        return {
          item:price,
          text:`${price.title} 보상판매 가격은 ${price.answer}입니다.`
        };
      }
      return {
        text:"어떤 제품의 보상판매 가격을 확인할까요?\n제품명을 알려주시면 해당 금액 하나만 정확하게 안내해 드릴게요."
      };
    }

    if(wantsAddress){
      let address = null;
      let lead = "";
      if(wantsTrade){
        address = itemByTitle("인천 창고 · 보상판매 반납");
        lead = "보상판매로 기존 기기를 반납할 때는 이곳으로 보내면 됩니다.";
      }else if(hasAny(q,["사무실","특이사항","직접검수"])){
        address = itemByTitle("윈코 사무실 · 특이사항 검수");
        lead = "특이사항이 있어 사무실에서 직접 검수할 때는 이곳으로 보내면 됩니다.";
      }else if(wantsRepair){
        address = itemByTitle("고빅스 · 제품 검수 및 A/S");
        lead = "A/S 또는 제품 검수가 필요할 때는 이곳으로 보내면 됩니다.";
      }else if(followsPrevious && previousResult &&
        (previousResult.kind === "price" || previousResult.category === "보상판매")){
        address = itemByTitle("인천 창고 · 보상판매 반납");
        lead = "보상판매로 기존 기기를 반납할 때는 이곳으로 보내면 됩니다.";
      }else if(contextTrade){
        address = itemByTitle("인천 창고 · 보상판매 반납");
        lead = "보상판매로 기존 기기를 반납할 때는 이곳으로 보내면 됩니다.";
      }else if(contextRepair || hasAny(q,["제품검수","점검"])){
        address = itemByTitle("고빅스 · 제품 검수 및 A/S");
        lead = "A/S 또는 제품 검수가 필요할 때는 이곳으로 보내면 됩니다.";
      }
      if(address) return {item:address,text:`${lead}\n\n${address.answer}`};
      return {text:"어떤 용도로 보내는 제품인가요?\n보상판매 반납인지, A/S 검수인지 알려주시면 정확한 주소 하나만 안내해 드릴게요."};
    }

    if(wantsLink){
      let link = null;
      if(hasAny(q,["톡톡","네이버"])) link = itemByTitle("네이버 톡톡");
      else if(hasAny(q,["접수방법","어떻게접수","접수절차"])) link = itemByTitle("A/S 접수방법");
      else if(hasAny(q,["faq","자주묻는질문"])) link = itemByTitle("WINCO FAQ 원문");
      else if(hasAny(q,["접수","신청"])) link = itemByTitle("A/S 접수");
      if(link) return {item:link,text:`${link.title} 페이지를 바로 열어드릴게요.`};
    }

    const results = search(q);
    if(!results.length){
      return {text:"지금 등록된 내부 자료만으로는 정확한 답을 확인하기 어려워요.\n제품명이나 증상을 한 가지만 더 알려주세요."};
    }

    const top = results[0];
    const second = results[1];
    const sameAnswer = second && compact(top.item.answer) === compact(second.item.answer);
    const clearlyAhead = !second || top.score-second.score >= 14;
    const exactWords = compact(q).length > 3 &&
      (top.item._titleCompact.includes(compact(q)) || compact(q).includes(top.item._titleCompact));

    if(top.score < 42 || (!clearlyAhead && !sameAnswer && !exactWords)){
      return {text:"비슷한 내용이 여러 개라서 제품을 임의로 정하면 안 될 것 같아요.\n제품명이나 모델명을 알려주시면 정확한 답 하나만 말씀드릴게요."};
    }

    let text = top.item.answer;
    if(top.item.kind === "product") text = `${top.item.title} 상품 정보입니다.\n\n${top.item.answer}`;
    return {item:top.item,text:text};
  }

  function scrollBottom(){
    requestAnimationFrame(function(){ messages.scrollTop = messages.scrollHeight; });
  }

  function addUser(text){
    const row = document.createElement("div");
    row.className = "assistant-row user";
    const bubble = document.createElement("div");
    bubble.className = "assistant-bubble";
    bubble.textContent = text;
    row.appendChild(bubble);
    messages.appendChild(row);
  }

  function actionButton(label, action, value, primary){
    const button = document.createElement("button");
    button.type = "button";
    button.className = "assistant-action"+(primary?" primary":"");
    button.dataset.action = action;
    button.dataset.value = value || "";
    button.textContent = label;
    return button;
  }

  function addBot(text,resultRows){
    const row = document.createElement("div");
    row.className = "assistant-row bot";
    const bubble = document.createElement("div");
    bubble.className = "assistant-bubble";
    const intro = document.createElement("div");
    intro.textContent = text;
    bubble.appendChild(intro);

    (resultRows || []).forEach(function(rowData){
      const item = rowData.item;
      const card = document.createElement("article");
      card.className = "assistant-result";

      const head = document.createElement("div");
      head.className = "assistant-result-head";
      const title = document.createElement("div");
      title.className = "assistant-result-title";
      title.textContent = item.title;
      const source = document.createElement("span");
      source.className = "assistant-result-source";
      source.textContent = moduleNames[item.module] || item.category || "내부 정보";
      head.append(title,source);

      const answer = document.createElement("div");
      answer.className = "assistant-result-answer";
      answer.textContent = item.answer;

      const actions = document.createElement("div");
      actions.className = "assistant-result-actions";
      actions.appendChild(actionButton("답변 복사","copy",`${item.title}\n${item.answer}`));
      if(item.url) actions.appendChild(actionButton("링크 열기","url",item.url,true));
      if(item.module && typeof window.openModule === "function"){
        actions.appendChild(actionButton("관련 모듈","module",item.module,!item.url));
      }

      card.append(head,answer,actions);
      bubble.appendChild(card);
    });
    row.appendChild(bubble);
    messages.appendChild(row);
    scrollBottom();
  }

  function addBotAnswer(text,item){
    const row = document.createElement("div");
    row.className = "assistant-row bot";
    const bubble = document.createElement("div");
    bubble.className = "assistant-bubble assistant-direct";
    const answer = document.createElement("div");
    answer.className = "assistant-direct-text";
    answer.textContent = text;
    bubble.appendChild(answer);

    if(item){
      const actions = document.createElement("div");
      actions.className = "assistant-result-actions";
      actions.appendChild(actionButton("답변 복사","copy",text));
      if(item.url) actions.appendChild(actionButton("페이지 열기","url",item.url,true));
      if(item.module && typeof window.openModule === "function"){
        actions.appendChild(actionButton("관련 자료 보기","module",item.module,!item.url));
      }
      bubble.appendChild(actions);
    }
    row.appendChild(bubble);
    messages.appendChild(row);
    scrollBottom();
  }

  function submit(raw){
    const query = String(raw || "").trim();
    if(!query) return;
    addUser(query);
    input.value = "";
    input.style.height = "";

    if(hasAny(query,["안녕","하이","헬로"])){
      addBot("안녕하세요. 제품명이나 증상만 짧게 적어도 괜찮아요. 예: “터보 얼마”, “청소기 충전 안 됨”, “수리 어디로 보내?”");
      return;
    }
    if(hasAny(query,["고마워","감사","땡큐"])){
      addBot("천만에요. 이어서 “그거 얼마야?”, “어디로 보내?”처럼 짧게 물어봐도 앞 내용을 이어서 찾아드릴게요.");
      return;
    }

    const fullQuery = contextualQuery(query);
    const resolved = answerResolution(query);
    previousQuery = fullQuery;
    if(resolved.item) previousResult = resolved.item;
    addBotAnswer(resolved.text,resolved.item);
  }

  function setOpen(opened){
    widget.classList.toggle("is-open",opened);
    launch.setAttribute("aria-expanded",String(opened));
    if(opened){
      setTimeout(function(){ input.focus(); scrollBottom(); },30);
    }
  }

  launch.addEventListener("click",function(){ setOpen(true); });
  close.addEventListener("click",function(){ setOpen(false); });
  send.addEventListener("click",function(){ submit(input.value); });
  input.addEventListener("input",function(){
    this.style.height = "";
    this.style.height = Math.min(this.scrollHeight,110)+"px";
  });
  input.addEventListener("keydown",function(event){
    if(event.key === "Enter" && !event.shiftKey){
      event.preventDefault();
      submit(input.value);
    }
  });
  widget.addEventListener("click",async function(event){
    const chip = event.target.closest("[data-prompt]");
    if(chip){ setOpen(true); submit(chip.dataset.prompt); return; }
    const button = event.target.closest("[data-action]");
    if(!button) return;
    if(button.dataset.action === "module"){
      setOpen(false);
      window.openModule(button.dataset.value,true);
    }else if(button.dataset.action === "url"){
      window.open(button.dataset.value,"_blank","noopener");
    }else if(button.dataset.action === "copy"){
      try{
        await navigator.clipboard.writeText(button.dataset.value);
        const original = button.textContent;
        button.textContent = "복사됨 ✓";
        setTimeout(function(){ button.textContent = original; },1200);
      }catch(error){
        const area = document.createElement("textarea");
        area.value = button.dataset.value;
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        area.remove();
      }
    }
  });
  document.addEventListener("keydown",function(event){
    if(event.key === "Escape" && widget.classList.contains("is-open")) setOpen(false);
  });
})();
