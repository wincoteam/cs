const MODEL = "claude-haiku-4-5-20251001";
const localRefine = require("../counsel-refiner.js");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  let body = req.body;
  if (!body || typeof body === "string") {
    try { body = JSON.parse(body || "{}"); }
    catch (error) { res.status(400).json({ error: "Invalid JSON body" }); return; }
  }
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 4000) : "";
  const tone = ["friendly", "concise", "firm", "apology"].includes(body.tone) ? body.tone : "friendly";
  if (!text) { res.status(400).json({ error: "text is required" }); return; }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(200).json({ answer: localRefine(text, tone), source: "local" }); return; }
  const toneGuide = {
    friendly: "친절하고 자연스러운 고객 상담 말투로 정리합니다.",
    concise: "중복 표현을 덜어내고 핵심 정보가 빠르게 보이도록 간결하게 정리합니다.",
    firm: "무례하지 않으면서 기준과 불가 사항이 명확하게 전달되도록 정리합니다.",
    apology: "진정성 있는 사과를 앞에 두고 해결 절차가 분명하게 보이도록 정리합니다."
  };
  const system = [
    "당신은 윈코 고객센터의 최상급 한국어 상담 답변 작성자입니다.", toneGuide[tone],
    "입력은 완성 문장이 아니라 직원의 짧은 메모, 키워드, 고객 상황 설명일 수 있습니다. 의도를 파악해 고객에게 바로 보낼 수 있는 완성 답변으로 새로 작성하세요.",
    "원문의 어색한 어순이나 반말을 그대로 따라 쓰지 말고, 자연스러운 존댓말과 읽기 쉬운 문단으로 구성하세요.",
    "필요하면 인사, 문의 내용 확인, 안내 절차, 마무리 순서로 구성하되 불필요하게 길게 쓰지 마세요.",
    "원문에 있는 사실, 제품명, 숫자, 금액, 날짜, 주소, 전화번호, URL과 처리 기준을 절대 바꾸지 마세요.",
    "원문에 없는 보상, 약속, 정책이나 정보를 추가하지 마세요.",
    "직원이 그대로 복사해 고객에게 보낼 수 있는 완성된 답변만 출력하고 설명이나 제목은 붙이지 마세요."
  ].join(" ");
  let timer = null;
  try {
    const controller = new AbortController();
    timer = setTimeout(function () { controller.abort(); }, 25000);
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", signal: controller.signal,
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: 1600, temperature: 0.25, system: system, messages: [{ role: "user", content: text }] })
    });
    if (!response.ok) { res.status(200).json({ answer: localRefine(text, tone), source: "local" }); return; }
    const data = await response.json();
    const answer = Array.isArray(data.content) && data.content[0] && data.content[0].text ? data.content[0].text.trim() : "";
    if (!answer) { res.status(200).json({ answer: localRefine(text, tone), source: "local" }); return; }
    res.status(200).json({ answer: answer, source: "ai" });
  } catch (error) {
    res.status(200).json({ answer: localRefine(text, tone), source: "local" });
  } finally {
    if (timer) clearTimeout(timer);
  }
};
