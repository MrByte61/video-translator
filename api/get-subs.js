export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { videoId } = req.query;
  if (!videoId) return res.status(400).json({ error: "Missing videoId" });

  try {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });
    const html = await pageRes.text();

    const regex = /"captionTracks":\s*(\[.*?\])/;
    const match = html.match(regex);

    if (!match) {
      return res.status(200).json({ status: "error", msg: "Субтитры заблокированы или отсутствуют в этом видео." });
    }

    const tracks = JSON.parse(match[1]);
    const track = tracks.find(t => t.languageCode === 'en') || tracks[0];

    if (!track || !track.baseUrl) {
      return res.status(200).json({ status: "error", msg: "Текстовая дорожка не найдена." });
    }

    const subRes = await fetch(`${track.baseUrl}&fmt=json3`);
    const subData = await subRes.json();

    if (!subData.events) {
      return res.status(200).json({ status: "error", msg: "Текст видео пуст." });
    }

    const subtitles = subData.events
      .filter(e => e.segs && e.segs.length > 0)
      .map(e => ({
        start: e.tStartMs / 1000,
        text: e.segs.map(s => s.utf8).join('').trim()
      }))
      .filter(s => s.text.length > 0);

    return res.status(200).json({ status: "ok", subtitles });

  } catch (err) {
    return res.status(200).json({ status: "error", msg: "Ошибка сервера: " + err.message });
  }
}
