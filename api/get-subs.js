export default async function handler(req, res) {
  const { videoId } = req.query;
  if (!videoId) return res.status(400).json({ error: "No videoId" });

  try {
    // Пытаемся достать список доступных субтитров
    const listRes = await fetch(`https://www.youtube.com/api/timedtext?v=${videoId}&type=list`);
    const listText = await listRes.text();
    
    // Если английских субтитров нет в явном виде, пробуем забрать их напрямую
    const subRes = await fetch(`https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`);
    
    if (!subRes.ok) throw new Error("YouTube blocks this request");

    const data = await subRes.json();
    const subtitles = data.events
      .filter(e => e.segs)
      .map(e => ({
        start: e.tStartMs / 1000,
        text: e.segs.map(s => s.utf8).join('')
      }));

    res.status(200).json({ status: "ok", subtitles });
  } catch (e) {
    // Вместо ошибки 500 возвращаем пустой массив, чтобы сайт не «падал»
    res.status(200).json({ status: "error", subtitles: [], details: e.message });
  }
}
