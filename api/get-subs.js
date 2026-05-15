export default async function handler(req, res) {
  const { videoId } = req.query;
  if (!videoId) return res.status(400).json({ error: "Нет ID видео" });

  try {
    // Пробуем достучаться до субтитров YouTube через официальный шлюз
    const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return res.status(200).json({ 
        status: "error", 
        msg: "YouTube заблокировал запрос сервера. Попробуй другое видео." 
      });
    }

    const data = await response.json();
    
    // Если субтитров в видео вообще нет (автор не добавил)
    if (!data.events) {
      return res.status(200).json({ 
        status: "error", 
        msg: "В этом видео нет английских субтитров для перевода." 
      });
    }

    const subtitles = data.events
      .filter(e => e.segs)
      .map(e => ({
        start: e.tStartMs / 1000,
        text: e.segs.map(s => s.utf8).join(' ')
      }));

    return res.status(200).json({ status: "ok", subtitles });

  } catch (e) {
    return res.status(200).json({ status: "error", msg: "Ошибка сервера: " + e.message });
  }
}
