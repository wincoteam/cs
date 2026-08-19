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
    product: "상품 목록",
    parts: "부품 구매",
    vendor: "거래처·배송비"
    ,clipboard: "복사 보관함"
  };
  let previousQuery = "";
  let previousResult = null;
  let pendingIntent = "";
  let pendingQuery = "";
  let isAnswering = false;
  const AI_ENDPOINT = "/api/ask";

  const groups = [
    ["as","a/s","에이에스","수리","고장","점검","서비스","서비스센터"],
    ["주소","어디","어디로","보내","보낼","발송","택배","반납","회수"],
    ["가격","금액","얼마","비용","원","보상가"],
    ["보상","보상판매","교환","반납판매"],
    ["접수","신청","등록","접수방법"],
    ["충전","충전기","배터리","전원"],
    ["불량","안돼","안됨","안되","되지않","고장","문제","작동안"],
    ["출력","바람","풍량","세기","약함"],
    ["사용법","작동법","작동방법","어떻게사용","사용방법"],
    ["구성품","구성","동봉","뭐들어","포함"],
    ["사용시간","작동시간","몇시간","얼마나사용"],
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
      _semanticTitle:semanticCompact(item.title),
      _semanticKeywords:semanticCompact(item.keywords+" "+item.category),
      _semanticAnswer:semanticCompact(item.answer),
      _all:`${title} ${keywords} ${answer}`
    });
  }

  let knowledge = [];

  function savedRows(key){
    try{
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return Array.isArray(value) ? value : null;
    }catch(error){
      return null;
    }
  }

  function savedObject(key){
    try{
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value && typeof value === "object" && !Array.isArray(value) ? value : null;
    }catch(error){
      return null;
    }
  }

  function refreshKnowledge(){
    let rows = data.slice();
    const savedCs = savedRows("winco_cs_faqs_v1");
    const savedTrade = savedRows("winco_trade_prices_v1");
    const savedProducts = savedRows("winco_products_v1");
    const savedParts = savedObject("winco_parts_db_v1");
    const savedVendors = savedObject("winco_vendor_db_v1");
    const savedNotes = savedRows("winco_postit_notes_v1");
    const savedClipboard = savedRows("winco_clipboard_v1");

    if(savedCs){
      rows = rows.filter(function(item){ return item.module !== "cs"; });
      savedCs.forEach(function(row,index){
        if(!row.question || !row.answer) return;
        rows.push({
          id:`saved-cs-${index}`,
          kind:"manual",
          title:row.question,
          answer:row.answer,
          module:"cs",
          category:row.category || "CS",
          keywords:`${row.category || ""} 고객안내 상담 답변 매뉴얼`
        });
      });
    }

    if(savedTrade){
      rows = rows.filter(function(item){ return item.module !== "trade"; });
      savedTrade.forEach(function(item,index){
        if(!item.name || item.price === undefined) return;
        const price = Number(item.price || 0).toLocaleString("ko-KR");
        rows.push({
          id:`saved-trade-${index}`,
          kind:"price",
          title:item.name,
          answer:`${price}원${item.note ? ` (${item.note})` : ""}`,
          module:"trade",
          category:item.type === "trade" ? "보상판매" : "협의구매",
          keywords:`${item.type === "trade" ? "보상판매 반납 교환" : "협의구매"} 가격 금액 얼마 비용`
        });
      });
    }

    if(savedProducts){
      rows = rows.filter(function(item){ return item.module !== "product"; });
      savedProducts.forEach(function(product,index){
        if(!product.name) return;
        const details = [
          product.sku && `상품번호: ${product.sku}`,
          product.model && `모델명: ${product.model}`,
          product.option && `옵션: ${product.option}`
        ].filter(Boolean);
        rows.push({
          id:`saved-product-${index}`,
          kind:"product",
          title:product.name,
          answer:details.length ? details.join("\n") : "상품 목록에 등록된 제품입니다.",
          module:"product",
          category:product.category || "상품",
          keywords:`${product.sku || ""} ${product.model || ""} ${product.option || ""} 상품 제품 검색`
        });
      });
    }

    if(savedParts && Array.isArray(savedParts.categories)){
      rows = rows.filter(function(item){ return item.module !== "parts"; });
      savedParts.categories.forEach(function(category,categoryIndex){
        (category.items || []).forEach(function(item,itemIndex){
          if(!item.name) return;
          const details = [...new Set([
            item.price === null ? "개별 구매 불가" : `부품 가격: ${Number(item.price || 0).toLocaleString("ko-KR")}원`,
            item.note,
            typeof savedParts.ship === "number" && `기본 배송비: ${savedParts.ship.toLocaleString("ko-KR")}원`
          ].filter(Boolean))];
          rows.push({
            id:`saved-part-${categoryIndex}-${itemIndex}`,
            kind:"part",
            title:`${category.cat || "부품"} · ${item.name}`,
            answer:details.join("\n"),
            module:"parts",
            category:category.cat || "부품",
            keywords:`${category.cat || ""} ${item.name} 부품 소모품 구매 가격 재고 배송비`
          });
        });
      });
    }

    if(savedVendors && Array.isArray(savedVendors.products)){
      rows = rows.filter(function(item){ return item.module !== "vendor"; });
      savedVendors.products.forEach(function(product,index){
        if(!product.name) return;
        const prices = Object.entries(product.prices || {}).map(function(entry){
          const vendor = entry[0];
          const price = entry[1];
          const ship = product.ship ?? (savedVendors.vendorShip || {})[vendor];
          return `${vendor}: ${Number(price || 0).toLocaleString("ko-KR")}원${typeof ship === "number" ? ` · 배송비 ${ship.toLocaleString("ko-KR")}원` : ""}`;
        });
        const details = [
          product.sku && `상품번호: ${product.sku}`,
          ...prices,
          !prices.length && typeof product.ship === "number" && `배송비: ${product.ship.toLocaleString("ko-KR")}원`
        ].filter(Boolean);
        rows.push({
          id:`saved-vendor-${index}`,
          kind:"vendor",
          title:product.name,
          answer:details.length ? details.join("\n") : "거래처 모듈에 등록된 상품입니다.",
          module:"vendor",
          category:"거래처·배송비",
          keywords:`${product.sku || ""} ${Object.keys(product.prices || {}).join(" ")} 거래처 공급가 배송비 발주`
        });
      });
    }

    if(savedNotes){
      rows = rows.filter(function(item){ return item.kind !== "note"; });
      savedNotes.forEach(function(note,index){
        if(!note || !String(note.text || "").trim()) return;
        const text = String(note.text).trim();
        rows.push({
          id:`saved-note-${index}`,
          kind:"note",
          title:`업무 메모 ${index + 1}`,
          answer:text,
          module:"",
          category:"업무 포스트잇",
          keywords:`업무 메모 포스트잇 ${text}`
        });
      });
    }
    if(savedClipboard){
      rows = rows.filter(function(item){ return item.module !== "clipboard"; });
      savedClipboard.forEach(function(item,index){
        if(!item || !String(item.content || "").trim()) return;
        rows.push({
          id:`saved-clipboard-${index}`,
          kind:"clipboard",
          title:String(item.title || `복사 보관함 ${index + 1}`),
          answer:String(item.content).trim(),
          module:"clipboard",
          category:item.kind || "복사 보관함",
          keywords:`${item.kind || ""} 자주 사용 복사 보관함 즐겨찾기`
        });
      });
    }
    knowledge = rows.map(prepare);
  }

  refreshKnowledge();

  function hasAny(text, words){
    const value = compact(text);
    return words.some(function(word){ return value.includes(compact(word)); });
  }

  function contextualQuery(query){
    const compactQuery = compact(query);
    const explicitFollowUp = hasAny(query,[
      "그거","그건","그제품","그상품","이거","이제품","그럼","그러면","아까","방금","위에"
    ]);
    const terseFollowUp = compactQuery.length <= 7 && hasAny(query,[
      "얼마","가격","배송비","어디","주소","방법","링크","접수","보내","어떻게","안내","뭐라고","추가","더"
    ]);
    const shortFollowUp = compactQuery.length <= 30 && (explicitFollowUp || terseFollowUp);
    if(shortFollowUp && previousResult){
      const currentProduct = detectedProduct(query);
      const previousProduct = detectedProduct(previousResult.title);
      if(!currentProduct || !previousProduct || currentProduct === previousProduct){
        return `${previousResult.title} ${previousResult.category || ""} ${previousQuery} ${query}`;
      }
    }
    return query;
  }

  function scoreItem(item, query){
    const q = normalize(query);
    const qCompact = semanticCompact(q);
    const titleCompact = semanticCompact(item.title);
    const keywordCompact = semanticCompact(item.keywords+" "+item.category);
    const answerCompact = semanticCompact(item.answer);
    const queryTokens = tokens(q);
    let score = 0;
    if(!qCompact) return 0;

    if(titleCompact === qCompact) score += 180;
    if(titleCompact.includes(qCompact) && qCompact.length > 2) score += 95;
    if(qCompact.includes(titleCompact) && titleCompact.length > 3) score += 72;

    queryTokens.forEach(function(token){
      const c = semanticCompact(token);
      if(!c) return;
      if(titleCompact.includes(c)) score += c.length >= 4 ? 24 : 15;
      else if(keywordCompact.includes(c)) score += c.length >= 4 ? 15 : 9;
      else if(answerCompact.includes(c)) score += c.length >= 4 ? 7 : 3;
    });

    score += dice(qCompact,titleCompact)*44;

    const priceIntent = hasAny(q,["얼마","가격","금액","비용","보상가"]);
    const addressIntent = hasAny(q,["주소","어디로","보내","발송","택배","반납"]);
    const linkIntent = hasAny(q,["링크","페이지","사이트","홈페이지","접수"]);
    const repairIntent = hasAny(q,["as","에이에스","수리","고장","불량","작동안","안돼","안되"]);
    const tradeIntent = hasAny(q,["보상","보상판매","기기반납"]);
    const chargeIntent = hasAny(q,["충전","배터리","전원"]);
    const failureIntent = hasAny(q,["불량","안돼","안됨","안되","되지않","고장","문제","작동안"]);
    const requestedProduct = detectedProduct(q);
    const itemProduct = itemProductName(item);

    if(priceIntent && item.kind === "price") score += tradeIntent ? 58 : 8;
    if(!priceIntent && !tradeIntent && item.kind === "price") score -= 95;
    if(priceIntent && ["part","vendor"].includes(item.kind)) score += 13;
    if(addressIntent && item.kind === "address") score += 52;
    if(linkIntent && item.kind === "link") score += 32;
    if(repairIntent && ["faq","guide","manual"].includes(item.kind)) score += 13;
    if(chargeIntent && failureIntent && hasAny(item.title,["충전","배터리","전원"])){
      score += item.kind === "faq" || item.kind === "manual" ? 72 : 12;
      if(hasAny(item.title,["되지않","안돼","안됨","불량"])) score += 38;
    }
    if(tradeIntent && item.module === "trade") score += 32;
    if(tradeIntent && item.title.includes("인천 창고") && addressIntent) score += 52;
    if(repairIntent && addressIntent && item.title.includes("고빅스")) score += 46;
    if(hasAny(q,["사무실","특이사항","직접검수"]) && item.title.includes("사무실")) score += 70;
    if(hasAny(q,["톡톡","네이버"]) && item.title.includes("톡톡")) score += 80;
    if(hasAny(q,["접수방법","어떻게접수"]) && item.title.includes("접수방법")) score += 65;

    if(requestedProduct){
      const requested = canonicalProduct(requestedProduct);
      const itemName = canonicalProduct(itemProduct || item.title);
      if(itemName === requested) score += 125;
      else if(item.module === "faq") score -= 34;
    }

    symptomRules.forEach(function(rule){
      if(hasAny(q,rule.query) && hasAny(item.title,rule.title)){
        score += rule.boost || 90;
      }
    });

    return score;
  }

  function search(query){
    return knowledge
      .map(function(item){ return {item:item,score:scoreItem(item,query)}; })
      .filter(function(row){ return row.score >= 18; })
      .sort(function(a,b){ return b.score-a.score; })
      .slice(0,8);
  }

  window.wincoRefreshUnifiedSearch = refreshKnowledge;
  window.wincoUnifiedSearch = function(query,limit){
    const normalizedQuery = normalize(query);
    const compactQuery = semanticCompact(normalizedQuery);
    if(!compactQuery) return [];
    const queryTokens = tokens(normalizedQuery).map(semanticCompact).filter(Boolean);
    const priceIntent = hasAny(normalizedQuery,["얼마","가격","금액","비용","보상가"]);
    const addressIntent = hasAny(normalizedQuery,["주소","어디로","보내","발송","택배","반납"]);
    const linkIntent = hasAny(normalizedQuery,["링크","페이지","사이트","홈페이지","접수"]);
    const repairIntent = hasAny(normalizedQuery,["as","에이에스","수리","고장","불량","작동안","안돼","안되"]);
    const tradeIntent = hasAny(normalizedQuery,["보상","보상판매","기기반납"]);
    const chargeFailure = hasAny(normalizedQuery,["충전","배터리","전원"]) && hasAny(normalizedQuery,["불량","안돼","안됨","안되","되지않","고장","문제","작동안"]);
    const activeSymptoms = symptomRules.filter(function(rule){ return hasAny(normalizedQuery,rule.query); });
    const seen = new Set();
    return knowledge
      .map(function(item){
        const title = item._semanticTitle;
        const keywords = item._semanticKeywords;
        const answer = item._semanticAnswer;
        let score = 0;
        if(title === compactQuery) score += 220;
        if(title.includes(compactQuery)) score += 112;
        else if(keywords.includes(compactQuery)) score += 54;
        else if(answer.includes(compactQuery)) score += 28;
        queryTokens.forEach(function(token){
          if(title.includes(token)) score += token.length >= 4 ? 28 : 18;
          else if(keywords.includes(token)) score += token.length >= 4 ? 16 : 10;
          else if(answer.includes(token)) score += token.length >= 4 ? 8 : 4;
        });
        score += dice(compactQuery,title)*40;
        if(priceIntent && item.kind === "price") score += tradeIntent ? 64 : 12;
        if(addressIntent && item.kind === "address") score += 58;
        if(linkIntent && item.kind === "link") score += 38;
        if(repairIntent && ["faq","guide","manual"].includes(item.kind)) score += 14;
        if(tradeIntent && item.module === "trade") score += 38;
        if(chargeFailure && hasAny(item.title,["충전","배터리","전원","작동"])) score += 68;
        activeSymptoms.forEach(function(rule){ if(hasAny(item.title,rule.title)) score += rule.boost || 90; });
        return Object.assign({},item,{score:score});
      })
      .filter(function(item){
        if(item.score < 6) return false;
        const key = compact(item.title)+"|"+compact(item.answer);
        if(seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort(function(a,b){ return b.score-a.score; })
      .slice(0,Math.max(1,Number(limit)||40));
  };

  const priceAliases = [
    ["에어몬스터 프로 New",[
      "에어몬스터프로new","에어몬스터프로뉴","에어몬스터pro","에어몬스터pronew",
      "프로new","프로뉴","프로제품","윈코프로new","윈코프로뉴",
      "pro new","pronew","pro뉴","pro제품","윈코pro","윈코pro new","윈코pronew"
    ]],
    ["에어몬스터 터보",["에어몬스터터보","윈코터보","터보"]],
    ["에어몬스터2",["에어몬스터2","에어몬스터투","몬스터2","몬스터투"]],
    ["스트레치 랜턴",["스트레치랜턴","스트레치등","스트레치"]],
    ["LED 캠핑 랜턴",["led캠핑랜턴","led랜턴","캠핑랜턴","캠핑등"]],
    ["에어매트·에어베드 교체용 모터",["에어매트모터","에어베드모터","교체용모터","매트모터","베드모터","모터만"]]
  ];

  function itemByTitle(title){
    return knowledge.find(function(item){ return item.title === title; });
  }

  function canonicalProduct(value){
    return compact(value)
      .replace(/winc?o/g,"윈코")
      .replace(/pro/g,"프로")
      .replace(/new/g,"뉴")
      .replace(/turbo/g,"터보")
      .replace(/스트래치/g,"스트레치");
  }

  function semanticCompact(value){
    return canonicalProduct(value)
      .replace(/충전이?되지않아요?|충전이?안돼요?|충전안됨|충전불량/g,"충전실패")
      .replace(/전원이?켜지지않아요?|전원안켜짐|전원불량/g,"전원실패")
      .replace(/작동이?되지않아요?|작동안됨|작동안함/g,"작동실패")
      .replace(/출력이?약해요?|바람이?약해요?|풍량이?약해요?/g,"출력약함")
      .replace(/사용하는방법|사용방법|작동하는방법|작동방법/g,"사용법")
      .replace(/구성품목|제품구성|기본구성/g,"구성품")
      .replace(/완전충전|완충/g,"완충")
      .replace(/몇시간|얼마나사용/g,"사용시간");
  }

  const symptomRules = [
    {query:["충전불량","충전안돼","충전안됨","충전이안되","충전되지않"],title:["충전이되지않","충전이안돼","충전불량"],boost:125},
    {query:["전원안켜","전원불량","켜지지않"],title:["전원이켜지지않","전원불량","작동이되지않"],boost:115},
    {query:["작동안돼","작동안됨","작동불량"],title:["작동이되지않","작동안돼","전원이켜지지않"],boost:105},
    {query:["바람약","출력약","풍량약","세기약"],title:["출력이약","바람이약","출력","풍량"],boost:105},
    {query:["꺼져","꺼짐","자동종료"],title:["꺼져","종료","출력이약해지고"],boost:92},
    {query:["역풍","바람거꾸로"],title:["역풍"],boost:125},
    {query:["노즐","연장노즐","와이드노즐","좁은노즐"],title:["노즐"],boost:118},
    {query:["같이사용","동시에사용","같이써","동시에써"],title:["동시에사용","같이사용"],boost:105},
    {query:["필터","헤파"],title:["필터"],boost:112},
    {query:["구성품","뭐들어","동봉","포함품"],title:["제품구성","구성품"],boost:112},
    {query:["사용법","사용방법","작동방법","어떻게써"],title:["작동방법","사용방법"],boost:108},
    {query:["사용시간","몇시간","얼마나사용"],title:["사용시간","충전안내"],boost:108},
    {query:["충전시간","완충시간","완충"],title:["사용시간","충전안내"],boost:102},
    {query:["기내","비행기","항공"],title:["기내반입"],boost:118},
    {query:["에어텐트","텐트공기"],title:["에어텐트"],boost:118}
  ];

  function itemProductName(item){
    if(item.module === "faq" && item.title.includes("·")){
      return item.title.split("·")[0].trim();
    }
    return "";
  }

  function exactPriceItem(query, allowFuzzy){
    const q = canonicalProduct(query);
    const matches = priceAliases.filter(function(row){
      return row[1].some(function(alias){ return q.includes(canonicalProduct(alias)); });
    });
    if(matches.length === 1){
      const aliased = itemByTitle(matches[0][0]);
      if(aliased) return aliased;
    }
    if(!allowFuzzy) return null;

    const noise = /보상판매|협의구매|가격|금액|얼마|비용|알려줘|찾아줘|확인|제품|상품|윈코/g;
    const productQuery = q.replace(noise,"");
    const candidates = knowledge
      .filter(function(item){ return item.kind === "price"; })
      .map(function(item){
        const name = canonicalProduct(item.title);
        const shortName = name.replace(/에어몬스터|윈코/g,"");
        let score = 0;
        if(q.includes(name)) score += 120;
        if(shortName.length >= 2 && q.includes(shortName)) score += 85;
        score += dice(productQuery,name)*45;
        score += dice(productQuery,shortName)*35;
        return {item:item,score:score};
      })
      .sort(function(a,b){ return b.score-a.score; });
    if(!candidates.length || candidates[0].score < 48) return null;
    if(candidates[1] && candidates[0].score-candidates[1].score < 9) return null;
    return candidates[0].item;
  }

  function detectedProduct(query){
    const q = canonicalProduct(query);
    if(q.includes("프로뉴")) return "에어몬스터 프로 New";
    if(q.includes("프로2") || q.includes("프로투")) return "에어몬스터 프로2";
    if(q.includes("에어몬스터터보") || q.includes("윈코터보") || q.includes("터보")) return "에어몬스터 터보";
    if(q.includes("에어몬스터2") || q.includes("에어몬스터투")) return "에어몬스터2";
    if(q.includes("에어몬스터프로") || q.includes("윈코프로")) return "에어몬스터 프로";
    if(q.includes("스트레치랜턴")) return "스트레치 랜턴";
    if(q.includes("led캠핑랜턴") || q.includes("led랜턴")) return "LED 캠핑 랜턴";
    const products = [...new Set(knowledge
      .filter(function(item){ return item.module === "faq" && item.title.includes("·"); })
      .map(function(item){ return item.title.split("·")[0].trim(); }))];
    let best = null;
    products.forEach(function(product){
      const canonical = canonicalProduct(product);
      const modelMatches = [...String(product).matchAll(/\(([^)]+)\)/g)]
        .map(function(match){ return canonicalProduct(match[1]); });
      const variants = [
        canonical,
        canonical.replace(/윈코|무선|제품/g,""),
        ...modelMatches
      ].filter(function(value){ return value.length >= 3; });
      variants.forEach(function(variant){
        if(q.includes(variant) && (!best || variant.length > best.length)){
          best = {name:product,length:variant.length};
        }
      });
    });
    if(best) return best.name;
    return "";
  }

  function answerResolution(query){
    const q = pendingIntent && pendingQuery
      ? `${pendingQuery} ${query}`
      : contextualQuery(query);
    const wantsPrice = hasAny(query,["얼마","가격","금액","비용","보상가"]);
    const wantsTrade = hasAny(query,["보상","보상판매","기기반납"]);
    const wantsAddress = hasAny(query,["주소","어디로","보내","보낼","발송","택배","반납"]);
    const wantsLink = hasAny(query,["링크","페이지","사이트","홈페이지","접수"]);
    const wantsRepair = hasAny(query,["as","에이에스","수리","고장","불량","검수"]);
    const contextTrade = hasAny(q,["보상","보상판매","기기반납"]);
    const contextRepair = hasAny(q,["as","에이에스","수리","고장","불량","검수"]);
    const followsPrevious = compact(query).length <= 12 &&
      hasAny(query,["그거","그건","그제품","그상품","그러면","어디","보내"]);
    const matchedTradePrice = exactPriceItem(q,wantsTrade || pendingIntent === "price");
    const productName = detectedProduct(q);

    if(hasAny(query,["출시","출시일","언제나왔","언제출시","발매"])){
      return {
        text:productName
          ? `현재 저장된 업무 자료에는 ${productName}의 정확한 출시일 정보가 등록되어 있지 않습니다.`
          : "현재 저장된 업무 자료에는 해당 제품의 정확한 출시일 정보가 등록되어 있지 않습니다."
      };
    }

    if((wantsPrice && matchedTradePrice) ||
      (pendingIntent === "price" && !wantsAddress && !wantsLink && !wantsRepair) ||
      (wantsTrade && !wantsAddress && !wantsLink)){
      const price = matchedTradePrice;
      if(price){
        return {
          item:price,
          text:`${price.title} 보상판매 가격은 ${price.answer}입니다.`
        };
      }
      return {
        text:"어떤 제품의 보상판매 가격을 확인할까요?\n제품명만 짧게 적어주세요. 예: 프로 New, 터보, 에어몬스터2",
        pending:"price",
        pendingQuery:q
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

    const minimumScore = top.item.kind === "note" ? 20 : 28;
    if(top.score < minimumScore){
      if(productName){
        return {
          text:`${productName} 관련 자료는 확인했지만, 질문하신 내용에 대한 정확한 안내는 현재 저장된 자료에 없습니다.`
        };
      }
      return {text:"현재 저장된 전체 업무 자료에서 질문과 관련된 내용을 확인하지 못했습니다."};
    }

    let text = top.item.answer;
    if(top.item.kind === "product") text = `${top.item.title} 상품 정보입니다.\n\n${top.item.answer}`;
    const wantsCustomerReply = hasAny(query,[
      "어떻게안내","안내해야","안내해","뭐라고말해","뭐라고","답변해야","답변해","고객안내","고객한테"
    ]);
    if(productName && top.item.module === "faq" && !wantsCustomerReply){
      text = `${productName} 기준으로 안내드립니다.\n\n${top.item.answer}`;
    }
    if(wantsCustomerReply){
      const subject = productName ? `${productName} 제품은 ` : "";
      text = `고객님께는 이렇게 안내하시면 됩니다.\n\n안녕하세요, 고객님. ${subject}${top.item.answer}`;
    }
    return {item:top.item,text:text,rows:results};
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

  function addThinking(){
    const row = document.createElement("div");
    row.className = "assistant-row bot assistant-thinking";
    const bubble = document.createElement("div");
    bubble.className = "assistant-bubble assistant-direct";
    bubble.textContent = "생각 중…";
    row.appendChild(bubble);
    messages.appendChild(row);
    scrollBottom();
    return row;
  }

  function buildAiContext(primaryItem, extraRows){
    const seen = new Set();
    const list = [];
    if(primaryItem){
      list.push(primaryItem);
      seen.add(primaryItem.id);
    }
    (extraRows || []).forEach(function(row){
      const item = row && row.item ? row.item : row;
      if(!item || seen.has(item.id)) return;
      seen.add(item.id);
      list.push(item);
    });
    return list.slice(0,5).map(function(item){
      return {title:item.title, answer:item.answer, category:item.category};
    });
  }

  async function askAI(query, contextItems){
    const controller = new AbortController();
    const timeout = setTimeout(function(){ controller.abort(); },12000);
    try{
      const response = await fetch(AI_ENDPOINT,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({query:query, context:contextItems}),
        signal:controller.signal
      });
      if(!response.ok) return null;
      const result = await response.json();
      const answer = result && typeof result.answer === "string" ? result.answer.trim() : "";
      return answer || null;
    }catch(error){
      return null;
    }finally{
      clearTimeout(timeout);
    }
  }

  function setAnswering(answering){
    isAnswering = answering;
    send.disabled = answering;
    send.setAttribute("aria-label",answering ? "답변을 작성하는 중" : "질문 보내기");
    messages.setAttribute("aria-busy",String(answering));
  }

  function submit(raw){
    if(isAnswering) return;
    const query = String(raw || "").trim();
    if(!query) return;
    addUser(query);
    if(typeof window.wincoRecordActivity === "function"){
      window.wincoRecordActivity({type:"assistant",title:"업무 도우미 질문",detail:query});
    }
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
    refreshKnowledge();
    const resolved = answerResolution(query);
    previousQuery = fullQuery;
    if(resolved.item){
      previousResult = resolved.item;
      pendingIntent = "";
      pendingQuery = "";
    }else if(resolved.pending){
      pendingIntent = resolved.pending;
      pendingQuery = resolved.pendingQuery || fullQuery;
    }

    if(!resolved.item){
      addBotAnswer(resolved.text,resolved.item);
      return;
    }

    const thinkingRow = addThinking();
    const contextItems = buildAiContext(resolved.item, resolved.rows);
    setAnswering(true);
    askAI(query, contextItems).then(function(aiText){
      thinkingRow.remove();
      addBotAnswer(aiText || resolved.text, resolved.item);
    }).finally(function(){
      setAnswering(false);
      if(widget.classList.contains("is-open")) input.focus();
    });
  }

  function setOpen(opened){
    widget.classList.toggle("is-open",opened);
    launch.setAttribute("aria-expanded",String(opened));
    if(opened){
      refreshKnowledge();
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
      if(typeof window.wincoRecordActivity === "function") window.wincoRecordActivity({type:"link",title:"도우미 안내 링크 열기",detail:button.dataset.value,url:button.dataset.value});
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
      if(typeof window.wincoRecordActivity === "function") window.wincoRecordActivity({type:"copy",title:"도우미 답변 복사",detail:button.dataset.value});
    }
  });
  document.addEventListener("keydown",function(event){
    if(event.key === "Escape" && widget.classList.contains("is-open")) setOpen(false);
  });
})();
