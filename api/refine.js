const localRefine = require("../counsel-refiner.js");
const GATEWAY_MODEL = "openai/gpt-5.4";
const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";

function requestHeader(req, name) {
  const headers = (req && req.headers) || {};
  const value = headers[name] || headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function buildPrompt(text, tone) {
  const toneGuide = {
    friendly: "친절하고 자연스럽게",
    concise: "중복 없이 짧고 핵심이 잘 보이게",
    firm: "무례하지 않으면서 기준과 불가 사항이 명확하게",
    apology: "진정성 있는 사과와 해결 절차가 잘 보이게"
  };
  const system = [
    "당신은 윈코 고객센터의 한국어 고객 답변 작성 AI입니다.",
    "직원이 입력한 것은 고객에게 보낼 원문이 아니라 답변을 만들어 달라는 명령 또는 메모입니다.",
    "명령의 의도와 사실을 파악하여 고객에게 바로 보낼 수 있는 완전히 새롭고 자연스러운 답변을 작성하세요.",
    "'적어 줘', '말해 줘', '식으로', '안내해 줘' 같은 직원의 명령 표현을 답변에 절대 옮기지 마세요.",
    "입력 내용을 그대로 반복하거나 단순히 존댓말로 바꾸지 말고, 필요한 문장 구조와 연결 표현을 스스로 구성하세요.",
    toneGuide[tone] + " 작성하세요.",
    "제품명, 숫자, 금액, 날짜, 주소, 전화번호, URL과 처리 기준은 바꾸지 마세요.",
    "입력에 없는 보상, 약속, 정책, 처리 결과는 만들지 마세요.",
    "필요하면 인사, 상황 확인, 안내 내용, 다음 절차, 마무리 순서로 구성하세요.",
    "설명이나 제목 없이 고객에게 보낼 최종 답변만 출력하세요."
  ].join(" ");
  return { system, user: "[직원의 답변 작성 명령]\n" + text + "\n\n위 명령을 실행한 고객용 최종 답변만 작성하세요." };
}

async function callGateway(token, prompt, signal) {
  const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
    method: "POST",
    signal,
    headers: { "content-type": "application/json", authorization: "Bearer " + token },
    body: JSON.stringify({
      model: GATEWAY_MODEL,
      messages: [{ role: "system", content: prompt.system }, { role: "user", content: prompt.user }],
      stream: false
    })
  });
  if (!response.ok) throw new Error("AI Gateway request failed");
  const data = await response.json();
  return data && data.choices && data.choices[0] && data.choices[0].message
    ? String(data.choices[0].message.content || "").trim()
    : "";
}

async function callAnthropic(apiKey, prompt, signal) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal,
    headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1200,
      temperature: 0.25,
      system: prompt.system,
      messages: [{ role: "user", content: prompt.user }]
    })
  });
  if (!response.ok) throw new Error("Anthropic request failed");
  const data = await response.json();
  return Array.isArray(data.content) && data.content[0] ? String(data.content[0].text || "").trim() : "";
}

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }
  let body = req.body;
  if (!body || typeof body === "string") {
    try { body = JSON.parse(body || "{}"); }
    catch (error) { res.status(400).json({ error: "Invalid JSON body" }); return; }
  }
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 4000) : "";
  const tone = ["friendly", "concise", "firm", "apology"].includes(body.tone) ? body.tone : "friendly";
  if (!text) { res.status(400).json({ error: "text is required" }); return; }

  const prompt = buildPrompt(text, tone);
  const gatewayToken = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || requestHeader(req, "x-vercel-oidc-token");
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, 28000);
  try {
    let answer = "", source = "local";
    if (gatewayToken) {
      try { answer = await callGateway(gatewayToken, prompt, controller.signal); source = "ai-gateway"; }
      catch (error) { answer = ""; }
    }
    if (!answer && anthropicKey) {
      try { answer = await callAnthropic(anthropicKey, prompt, controller.signal); source = "anthropic"; }
      catch (error) { answer = ""; }
    }
    if (!answer) answer = localRefine(text, tone);
    res.status(200).json({ answer, source });
  } catch (error) {
    res.status(200).json({ answer: localRefine(text, tone), source: "local" });
  } finally {
    clearTimeout(timer);
  }
};
