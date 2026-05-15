export default function handler(req, res) {
  // Сервер считывает ID видео, которое отправил плеер
  const { videoId } = req.query;

  if (!videoId) {
    return res.status(400).json({ error: "Передайте videoId" });
  }

  // Робот подтверждает плееру, что он поймал нужное видео
  res.status(200).json({ 
    status: "success",
    msg: `Робот Vercel перехватил видео ${videoId}. Готовлюсь выгружать текст.`
  });
}
