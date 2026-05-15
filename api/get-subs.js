export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  let { videoId } = req.query;
  if (!videoId) return res.status(400).json({ error: "Missing videoId" });

  // Очищаем ID от хвостов, если туда случайно прилетела вся ссылка целиком
  if (videoId.includes('v=')) videoId = videoId.split('v=')[1];
  if (videoId.includes('&')) videoId = videoId.split('&')[0];
  if (videoId.includes('?')) videoId = videoId.split('?')[0];
  videoId = videoId.trim();

  try {
    // Способ №1: Запрос через мобильную версию (её Ютуб реже блокирует)
    let pageRes = await fetch(`https://m.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });
    let html = await pageRes.text();

    let regex = /"captionTracks":\s*(\[.*?\])/;
    let match = html.match(regex);

    // Способ №2: Если мобилка не дала, пробуем обычную версию компьютера
    if (!match) {
      pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8'
        }
      });
      html = await pageRes.text();
      match = html.match(regex);
    }

    if (!match) {
      return res.status(200).json({ status: "error", msg: "Ютуб заблокировал запрос текста. Попробуй перезагрузить страницу сайта." });
    }

    const tracks = JSON.parse(match[1]);
    const track = tracks.find(t => t.languageCode === 'en') || tracks.find(t => t.languageCode === 'ru') || tracks[0];

    if (!track || !track.baseUrl) {
      return res.status(200).json({ status: "error", msg: "У этого видео нет текстовой дорожки." });
    }

    const subRes = await fetch(`${track.baseUrl}&fmt=json3`);
    const subData = await subRes.json();

    if (!subData.events) {
      return res.status(200).json({ status: "error", msg: "Текст видео оказался пустым." });
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
