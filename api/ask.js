const MODEL = "claude-haiku-4-5-20251001";

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let body = req.body;
  if (!body || typeof body === "string") {
    try {
      body = JSON.parse(body || "{}");
    } catch (error) {
      res.status(400).json({ error: "Invalid JSON body" });
      return;
    }
  }

  const query = typeof (body && body.query) === "string" ? body.query.trim() : "";
  const context = Array.isArray(body && body.context) ? body.context : [];

  if (!query) {
    res.status(400).json({ error: "query is required" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured" });
    return;
  }

  const contextText = context.length
    ? context
        .slice(0, 5)
        .map(function (item, index) {
          const title = String((item && item.title) || "").slice(0, 200);
          const answer = String((item && item.answer) || "").slice(0, 1200);
          const category = String((item && item.category) || "").slice(0, 80);
          return "[자료 " + (index + 1) + "]\n제목: " + title + "\n분류: " + category + "\n내용: " + answer;
        })
        .join("\n\n")
    : "관련 내부 자료를 찾지 못했습니다.";

  const systemPrompt = [
    "당신은 윈코(WINCO) 운영팀 내부 업무 도우미입니다.",
    "아래 제공된 내부 자료 범위 안에서만 답변하세요.",
    "자료에 없는 내용은 추측하지 말고, 모른다고 솔직히 답하세요.",
    "직원이 바로 활용할 수 있도록 간결하고 실무적인 한국어로 답하세요.",
    "필요하면 자료의 숫자, 금액, 링크, 주소를 그대로 정확히 인용하세요."
  ].join(" ");

  const userPrompt = "[내부 자료]\n" + contextText + "\n\n[직원 질문]\n" + query;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }]
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      res.status(502).json({ error: "Claude API request failed", detail: detail.slice(0, 500) });
      return;
    }

    const data = await response.json();
    const answer =
      Array.isArray(data.content) && data.content[0] && data.content[0].text
        ? data.content[0].text
        : "";

    res.status(200).json({ answer: answer });
  } catch (error) {
    res.status(500).json({
      error: "Unexpected server error",
      detail: String((error && error.message) || error)
    });
  }
};
