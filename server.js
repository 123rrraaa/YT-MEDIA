import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import bodyParser from "body-parser";
import youtubedl from "youtube-dl-exec";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, "public")));

app.get("/*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/download", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "No URL provided" });

  console.log("📥 Fetching video info for:", url);

  try {
    // Use youtube-dl-exec to fetch video info in JSON
    const info = await youtubedl(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noCheckCertificates: true,
      youtubeSkipDashManifest: true,
    });

    // Select best video and audio formats
    const videoFormat =
      info.formats.find(f => f.format_note === "720p" && f.vcodec !== "none") ||
      info.formats.find(f => f.vcodec !== "none");

    const audioFormats = info.formats.filter(f => f.acodec !== "none" && f.vcodec === "none");
    const audioFormat = audioFormats.sort((a, b) => b.abr - a.abr)[0];

    res.json({
      title: info.title,
      thumbnail: info.thumbnail,
      formats: videoFormat
        ? [
            {
              url: videoFormat.url,
              ext: videoFormat.ext,
              resolution: videoFormat.format_note || videoFormat.height || "N/A",
            },
          ]
        : [],
      audio: audioFormat
        ? [
            {
              url: audioFormat.url,
              ext: audioFormat.ext,
              abr: audioFormat.abr,
            },
          ]
        : [],
    });
  } catch (err) {
    console.error("❌ Failed to fetch video info:", err);
    res.status(500).json({ error: "Failed to fetch video info", details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
