export default async function handler(req, res) {
  const { videoId } = req.query;
  if (!videoId) return res.status(400).json({ error: "No videoId provided" });

  try {
    // 1. Имитируем запрос от реального браузера к странице видео
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });
    const html = await pageRes.text();

    // 2. Ищем блок со ссылками на субтитры внутри кода страницы
    const regex = /"captionTracks":\s*(\[.*?\])/;
    const match = html.match(regex);

    if (!match) {
      return res.status(200).json({ 
        status: "error", 
        msg: "YouTube не отдал субтитры. Возможно, в этом видео они отключены." 
      });
    }

    const tracks = JSON.parse(match[1]);
    // Ищем английскую дорожку, если её нет — берем самую первую доступную
    const enTrack = tracks.find(t => t.languageCode === 'en') || tracks[0];

    if (!enTrack || !enTrack.baseUrl) {
      return res.status(200).json({ status: "error", msg: "Английские субтитры отсутствуют." });
    }

    // 3. Скачиваем официальный JSON3 файл субтитров по подписанной ссылке
    const subRes = await fetch(`${enTrack.baseUrl}&fmt=json3`);
    const subData = await subRes.json();

    if (!subData.events) {
      return res.status(200).json({ status: "error", msg: "Поток текста пуст." });
    }

    // 4. Форматируем данные в чистый массив без лишнего мусора
    const subtitles = subData.events
      .filter(e => e.segs && e.segs.length > 0)
      .map(e => ({
        start: e.tStartMs / 1000,
        text: e.segs.map(s => s.utf8).join('').trim()
      }))
      .filter(s => s.text.length > 0);

    return res.status(200).json({ status: "ok", subtitles });

  } catch (err) {
    return res.status(200).json({ status: "error", msg: "Ошибка парсинга: " + err.message });
  }
}
