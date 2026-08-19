const MODEL = "claude-haiku-4-5-20251001";

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
  if (!apiKey) { res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured" }); return; }
  const toneGuide = {
    friendly: "친절하고 자연스러운 고객 상담 말투로 정리합니다.",
    concise: "중복 표현을 덜어내고 핵심 정보가 빠르게 보이도록 간결하게 정리합니다.",
    firm: "무례하지 않으면서 기준과 불가 사항이 명확하게 전달되도록 정리합니다.",
    apology: "진정성 있는 사과를 앞에 두고 해결 절차가 분명하게 보이도록 정리합니다."
  };
  const system = [
    "당신은 윈코 고객센터의 한국어 상담 문장 편집기입니다.", toneGuide[tone],
    "원문에 있는 사실, 제품명, 숫자, 금액, 날짜, 주소, 전화번호, URL과 처리 기준을 절대 바꾸지 마세요.",
    "원문에 없는 보상, 약속, 정책이나 정보를 추가하지 마세요.",
    "직원이 그대로 복사해 고객에게 보낼 수 있는 완성된 답변만 출력하고 설명이나 제목은 붙이지 마세요."
  ].join(" ");
  let timer = null;
  try {
    const controller = new AbortController();
    timer = setTimeout(function () { controller.abort(); }, 14000);
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", signal: controller.signal,
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: 1200, system: system, messages: [{ role: "user", content: text }] })
    });
    if (!response.ok) { res.status(502).json({ error: "Claude API request failed" }); return; }
    const data = await response.json();
    const answer = Array.isArray(data.content) && data.content[0] && data.content[0].text ? data.content[0].text.trim() : "";
    if (!answer) { res.status(502).json({ error: "Empty response" }); return; }
    res.status(200).json({ answer: answer });
  } catch (error) {
    res.status(500).json({ error: "Unexpected server error" });
  } finally {
    if (timer) clearTimeout(timer);
  }
};
