(function(root,factory){
  const refine=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=refine;
  if(root)root.wincoRefineReply=refine;
})(typeof window!=="undefined"?window:null,function(){
  const closings={friendly:"감사합니다.",concise:"",firm:"감사합니다.",apology:"감사합니다."};
  function cleanSpacing(value){
    return String(value||"")
      .replace(/\r/g,"")
      .replace(/[\t ]+/g," ")
      .replace(/\s*([!?])\s*/g,"$1 ")
      .replace(/ +\n/g,"\n")
      .replace(/\n +/g,"\n")
      .replace(/\n{3,}/g,"\n\n")
      .trim();
  }
  function normalizeFacts(value){
    return value
      .replace(/\b(?:a\s*\/?\s*s)\b/gi,"A/S")
      .replace(/\b5\s*v\s*\/?\s*1\s*a\b/gi,"5V 1A")
      .replace(/\b5\s*v\s*\/?\s*2\s*a\b/gi,"5V 2A")
      .replace(/안되요/g,"안 돼요")
      .replace(/되요/g,"돼요")
      .replace(/해달라고/g,"해 달라고")
      .replace(/해주세요/g,"해 주세요")
      .replace(/부탁드려요/g,"부탁드립니다")
      .replace(/확인바랍니다/g,"확인해 주세요");
  }
  function expandRoughNotes(value){
    let text=value;
    text=text.replace(/고객(?:이|님이)?\s*([^\n.!?]+?)\s*(?:이라고|라고|다고)?\s*(?:함|하심)(?=$|[,.!?\n ])/g,function(_,issue){
      issue=issue.trim().replace(/안\s*된$/,"되지 않는 증상").replace(/안된$/,"되지 않는 증상");
      return issue+"으로 문의해 주셨습니다";
    });
    text=text.replace(/([^\n.!?]+?)\s*(?:해\s*보고|해보고)\s*(?:안\s*되면|안되면)/g,function(_,step){
      step=step.trim();
      if(/5V 1A/.test(step)&&/충전/.test(text))return"먼저 5V 1A 충전기를 사용해 충전해 주세요.\n동일한 증상이 계속될 경우";
      return"먼저 "+step.replace(/(?:으로|로)$/,"으로")+" 확인해 주세요.\n동일한 증상이 계속될 경우";
    });
    text=text
      .replace(/충전\s*안\s*(?:됨|된다고)/g,"충전이 되지 않는다고")
      .replace(/전원\s*안\s*(?:들어옴|들어온다고|켜짐)/g,"전원이 들어오지 않는다고")
      .replace(/작동\s*안\s*(?:됨|된다고)/g,"작동하지 않는다고")
      .replace(/안\s*되면/g,"동일한 증상이 계속될 경우")
      .replace(/A\/S\s*접수\s*해\s*달라고\s*안내(?:해)?/g,"A/S 접수를 부탁드립니다")
      .replace(/A\/S\s*접수\s*안내/g,"A/S 접수를 안내해 주세요")
      .replace(/접수\s*해\s*달라고\s*안내(?:해)?/g,"접수를 부탁드립니다")
      .replace(/라고\s*안내(?:해)?(?=$|[.!?\n])/g,"라고 안내드립니다")
      .replace(/\b안됨\b/g,"정상적으로 작동하지 않습니다")
      .replace(/\b가능함\b/g,"가능합니다")
      .replace(/\b불가함\b/g,"어렵습니다")
      .replace(/\b확인\s*필요\b/g,"확인이 필요합니다");
    return text;
  }
  function interpretCommand(value,tone){
    let text=value;
    if(/(?:죄송|사과)(?:하게|를?\s*포함|하는\s*식으로)/.test(text))tone="apology";
    else if(/(?:짧게|간단하게|간결하게)/.test(text))tone="concise";
    else if(/(?:명확하게|단호하게)/.test(text))tone="firm";
    text=text
      .replace(/(?:부드럽게|친절하게|자연스럽게|정중하게|짧게|간단하게|간결하게|명확하게|단호하게|죄송하게|사과를?\s*포함해서)\s*(?=(?:말|안내|답변|작성|적|써|바꿔|다듬))/g,"")
      .replace(/\s*(?:이런|그런)?\s*(?:내용|느낌|말투|방식|식)으로\s*(?:적어|써\s*줘|써줘|작성해\s*줘|작성해줘|말해\s*줘|말해줘|안내해\s*줘|안내해줘|답변해\s*줘|답변해줘|바꿔\s*줘|바꿔줘|다듬어\s*줘|다듬어줘)\s*[.!?]*$/g,"")
      .replace(/\s*(?:적어|써\s*줘|써줘|작성해\s*줘|작성해줘|말해\s*줘|말해줘|답변해\s*줘|답변해줘)\s*[.!?]*$/g,"")
      .replace(/\s*(?:안내|말|답변|작성)(?:해)?\s*줘\s*/g,". ")
      .trim();
    text=text
      .replace(/충전이?\s*안\s*될\s*경우/g,"충전이 정상적으로 되지 않는 경우에는")
      .replace(/충전이?안될경우/g,"충전이 정상적으로 되지 않는 경우에는")
      .replace(/작동이?\s*안\s*될\s*경우/g,"제품이 정상적으로 작동하지 않는 경우에는")
      .replace(/전원이?\s*안\s*(?:들어올|켜질)\s*경우/g,"전원이 들어오지 않는 경우에는")
      .replace(/A\/S\s*접수\s*해\s*주세요/g,"A/S 접수를 부탁드립니다")
      .replace(/A\/S\s*접수\s*해주세요/g,"A/S 접수를 부탁드립니다")
      .replace(/A\/S\s*접수\s*해\s*달라(?:고)?/g,"A/S 접수를 부탁드립니다")
      .replace(/A\/S\s*접수(?:를)?\s*해\s*달라고/g,"A/S 접수를 부탁드립니다")
      .replace(/환불\s*불가하다고/g,"해당 건은 환불이 어려운 점 양해 부탁드립니다")
      .replace(/환불\s*불가/g,"해당 건은 환불이 어려운 점 양해 부탁드립니다")
      .replace(/교환\s*가능(?:하다고)?/g,"교환이 가능합니다")
      .replace(/배송(?:이)?\s*늦어진다고/g,"배송이 지연되고 있습니다")
      .replace(/내일\s*출고(?=$|[,.!?\s])/g,"내일 출고될 예정입니다");
    return{text:text,tone:tone};
  }
  function finishSentence(line){
    let value=line.trim().replace(/^[•·▪◦*-]+\s*/,"");
    if(!value)return"";
    if(/^https?:\/\//i.test(value))return value;
    value=value
      .replace(/(?:라고)?\s*함$/,"합니다")
      .replace(/해야\s*함$/,"해 주세요")
      .replace(/안내\s*필요$/,"안내해 주세요")
      .replace(/확인\s*필요$/,"확인이 필요합니다")
      .replace(/접수\s*부탁$/,"접수를 부탁드립니다")
      .replace(/확인\s*부탁$/,"확인을 부탁드립니다")
      .replace(/보내\s*주세요$/,"보내 주세요")
      .replace(/해\s*주세요$/,"해 주세요");
    if(!/[.!?。]$/.test(value))value+=".";
    return value;
  }
  function toParagraphs(value){
    const protectedUrls=[];
    value=value.replace(/https?:\/\/[^\s]+/g,function(url){protectedUrls.push(url);return"__URL_"+(protectedUrls.length-1)+"__"});
    value=value.replace(/([.!?])\s+(?=[가-힣A-Za-z0-9])/g,"$1\n");
    const lines=value.split(/\n|\s+[|]\s+|\s+\/\s+(?!S\b)/).map(finishSentence).filter(Boolean);
    return lines.map(function(line){return line.replace(/__URL_(\d+)__/g,function(_,index){return protectedUrls[Number(index)]})});
  }
  function refine(raw,tone){
    tone=["friendly","concise","firm","apology"].includes(tone)?tone:"friendly";
    let text=cleanSpacing(normalizeFacts(String(raw||"")));
    if(!text)return"";
    const command=interpretCommand(text,tone);
    text=command.text;tone=command.tone;
    text=expandRoughNotes(text);
    let paragraphs=toParagraphs(text);
    paragraphs=paragraphs.filter(function(line){return !/^(고객(?:님)?에게\s*)?(?:이렇게\s*)?(?:답변|안내)(?:해\s*줘|해줘|하면\s*됨|하면됨)\.?$/.test(line)});
    const hasGreeting=paragraphs.some(function(line){return /^안녕하세요/.test(line)});
    const hasThanks=paragraphs.some(function(line){return /감사합니다[.!]?$/.test(line)});
    const hasApology=paragraphs.some(function(line){return /죄송|사과|불편을 드려/.test(line)});
    const output=[];
    if(tone!=="concise"&&!hasGreeting)output.push("안녕하세요, 고객님. 윈코입니다.");
    if(tone==="apology"&&!hasApology)output.push("이용에 불편을 드려 죄송합니다.");
    output.push.apply(output,paragraphs);
    if(closings[tone]&&!hasThanks&&!output.some(function(line){return line===closings[tone]}))output.push(closings[tone]);
    return output.join("\n\n").replace(/\n{3,}/g,"\n\n").trim();
  }
  return refine;
});
