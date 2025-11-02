import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import youtubedl from "youtube-dl-exec";
import ffmpegPath from "ffmpeg-static";

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post("/download", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "No URL provided" });

  try {
    const info = await youtubedl(url, {
      dumpSingleJson: true,
      ffmpegLocation: ffmpegPath,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
    });

    const videoFormat =
      info.formats.find(f => f.format_note === '720p' && f.vcodec !== 'none') ||
      info.formats.find(f => f.vcodec !== 'none');

    const audioFormat = info.formats
      .filter(f => f.acodec !== 'none' && f.vcodec === 'none')
      .sort((a, b) => b.abr - a.abr)[0];

    res.json({
      title: info.title,
      thumbnail: info.thumbnail,
      formats: videoFormat ? [{ url: videoFormat.url, ext: videoFormat.ext, resolution: videoFormat.format_note || videoFormat.height }] : [],
      audio: audioFormat ? [{ url: audioFormat.url, ext: audioFormat.ext, abr: audioFormat.abr }] : [],
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch video info", details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
