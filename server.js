const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { execFile } = require('child_process');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PROJECT_DIR = __dirname;
const YTDLP_PATH = path.join(PROJECT_DIR, 'yt-dlp.exe');
const FFMPEG_PATH = path.join(PROJECT_DIR, 'ffmpeg.exe');

// Ensure ffmpeg is accessible
process.env.PATH = `${process.env.PATH};${path.dirname(FFMPEG_PATH)}`;

app.post('/download', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "No URL provided" });

  console.log("📥 Fetching video info for:", url);

  // Run yt-dlp with increased buffer (to handle long output)
  execFile(
    YTDLP_PATH,
    ['-j', url],
    { cwd: PROJECT_DIR, maxBuffer: 1024 * 1024 * 10 }, // 10MB buffer
    (err, stdout, stderr) => {
      if (err) {
        console.error("❌ yt-dlp execution failed");
        console.error("stderr output:\n", stderr);
        console.error("error message:\n", err.message);
        return res.status(500).json({
          error: "Failed to fetch video info",
          details: stderr || err.message,
        });
      }

      try {
        // Remove warning lines before parsing
        const cleanOutput = stdout
          .split('\n')
          .filter(line => line.trim().startsWith('{'))
          .join('\n');

        const info = JSON.parse(cleanOutput);

        const videoFormat =
          info.formats.find(f => f.format_note === '720p' && f.vcodec !== 'none') ||
          info.formats.find(f => f.vcodec !== 'none');

        const audioFormats = info.formats.filter(f => f.acodec !== 'none' && f.vcodec === 'none');
        const audioFormat = audioFormats.sort((a, b) => b.abr - a.abr)[0];

        res.json({
          title: info.title,
          thumbnail: info.thumbnail,
          formats: videoFormat
            ? [
                {
                  url: videoFormat.url,
                  ext: videoFormat.ext,
                  resolution: videoFormat.format_note || videoFormat.height || 'N/A',
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
      } catch (parseErr) {
        console.error("⚠️ JSON parse error:", parseErr.message);
        res.status(500).json({ error: "Failed to parse video info" });
      }
    }
  );
});

app.listen(3000, () => console.log("🚀 Server running at http://localhost:3000"));
