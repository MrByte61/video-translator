export default async function handler(req, res) {
  const { videoId } = req.query;

  if (!videoId) {
    return res.status(400).json({ error: "Укажите ID видео (videoId)" });
  }

  try {
    // Делаем официальный запрос к скрытому серверу субтитров YouTube
    const response = await fetch(`https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`);
    
    if (!response.ok) {
      return res.status(500).json({ error: "Не удалось получить текст от YouTube" });
    }

    const data = await response.json();
    
    // Собираем текст в понятный формат: время и фраза
    const sentences = data.events
      .filter(event => event.segs && event.segs.length > 0)
      .map(event => {
        const text = event.segs.map(seg => seg.utf8).join('').trim();
        return {
          start: event.tStartMs / 1000, // переводим в секунды
          text: text
        };
      })
      .filter(item => item.text.length > 0);

    // Возвращаем нашему плееру готовый массив субтитров
    return res.status(200).json({
      status: "success",
      videoId: videoId,
      subtitles: sentences
    });

  } catch (error) {
    return res.status(500).json({ error: "Ошибка сервера: " + error.message });
  }
}
