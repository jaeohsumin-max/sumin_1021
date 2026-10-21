// Vercel 서버리스 함수: 브라우저 대신 TMDB 를 불러줘요.
// 키는 Vercel 환경변수(Settings → Environment Variables)에서 읽어요. 브라우저에는 키가 절대 안 보여요.
module.exports = async (req, res) => {
  const key = process.env.MOVIE;   // Vercel 환경변수 이름: MOVIE
  if (!key) {
    return res.status(500).json({ error: "Vercel 환경변수 MOVIE 가 없어요. 넣은 뒤 Redeploy 해주세요." });
  }

  const { path, ...params } = req.query;

  // 영화 검색·정보만 허용 (다른 용도로 키가 쓰이지 않게)
  if (!path || !/^\/(movie|search\/movie)(\/[\w]+)*$/.test(path)) {
    return res.status(400).json({ error: "허용되지 않은 요청이에요." });
  }

  const url = new URL("https://api.themoviedb.org/3" + path);
  url.searchParams.set("api_key", key);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  try {
    const r = await fetch(url);
    const data = await r.json();
    res.setHeader("Cache-Control", "s-maxage=600"); // 같은 요청은 10분 캐시
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(502).json({ error: "TMDB 연결 실패" });
  }
};
