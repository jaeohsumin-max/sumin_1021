// Vercel 서버리스 함수: POST /api/chat
// Vercel 환경변수 ABC 에 든 Anthropic API 키로 Claude 를 대신 호출한다 (키는 브라우저로 안 나감)

const MODEL = "claude-opus-5-5";

const SYSTEM_PROMPT = `너는 제주도 오름 전문 길잡이 '오름 길잡이'야.
- 사용자의 동행, 체력, 날씨, 시간대에 맞춰 제주 오름을 추천하고 안내한다.
- 추천할 때는 오름 이름, 위치(지역), 난이도, 정상까지 소요 시간, 추천 이유, 주의할 점(주차·화장실·경사·바람)을 짧게 정리한다.
- 실시간 날씨나 통제 정보는 알 수 없으니, 필요하면 기상청·오름 통제 공지 확인을 권한다.
- 휴식년제 등으로 출입이 제한되는 오름은 그 사실을 알린다.
- 모바일 채팅 화면이므로 마크다운 표·제목 없이, 짧은 문단과 '•' 목록으로 친근하게 답한다.`;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST 만 가능해요." });

  const key = process.env.ABC;
  if (!key) return res.status(500).json({ error: "Vercel 환경변수 ABC 가 설정되지 않았어요." });

  const { messages, prefs = "" } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "잘못된 요청이에요." });
  }

  try {
    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "server-side-fallback-2026-07-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        system: SYSTEM_PROMPT + String(prefs).slice(0, 1000),
        messages,
        output_config: { effort: "low" }, // 채팅이라 가볍게
        fallbacks: "default",              // 거절 시 서버가 다른 모델로 재시도
      }),
    });

    const data = await apiRes.json();
    if (!apiRes.ok) {
      const msg = apiRes.status === 401
        ? "Vercel 환경변수 ABC 의 키가 올바르지 않아요."
        : `API 오류 (${apiRes.status}): ${data?.error?.message || ""}`;
      return res.status(apiRes.status).json({ error: msg });
    }
    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({ error: `Claude 호출 실패: ${err.message}` });
  }
};
