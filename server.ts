import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import nodeID3 from "node-id3";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Configure Multer for temp storage
  const upload = multer({ dest: "uploads/" });

  // API Routes
  app.post("/api/scrub", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const filePath = req.file.path;
      const originalName = req.file.originalname;
      const customMarker = req.body.marker || "REDACTED";
      const ext = path.extname(originalName).toLowerCase();

      let fileBuffer = fs.readFileSync(filePath);

      if (ext === ".mp3") {
        // 1. Remove all known tags using the library first
        fileBuffer = nodeID3.removeTagsFromBuffer(fileBuffer);

        // 2. Manual Binary Scrubbing - Removing APE Tags from the tail
        // APE tags often start with "APETAGEX"
        const apeIndex = fileBuffer.indexOf(Buffer.from("APETAGEX"));
        if (apeIndex !== -1) {
          fileBuffer = fileBuffer.subarray(0, apeIndex);
        }

        // 3. ID3v1 Scrubbing (last 128 bytes)
        // ID3v1 tags starts with "TAG" at -128 offset
        const tail = fileBuffer.subarray(fileBuffer.length - 128);
        if (tail.subarray(0, 3).toString() === "TAG") {
          fileBuffer = fileBuffer.subarray(0, fileBuffer.length - 128);
        }

        // 4. FIND FIRST SYNC FRAME (The "Dry" Start)
        // Valid MP3 frames start with 11 bits of 1s (0xFF + mask)
        // This effectively trims ANY remaining header at the start (ID3, Lyrics, etc.)
        let firstFrameIndex = -1;
        for (let i = 0; i < fileBuffer.length - 1; i++) {
          if (fileBuffer[i] === 0xFF && (fileBuffer[i+1] & 0xE0) === 0xE0) {
            firstFrameIndex = i;
            break;
          }
        }

        if (firstFrameIndex !== -1) {
          fileBuffer = fileBuffer.subarray(firstFrameIndex);
        }

        // 5. Deep Signature Wipe inside the stream
        const signatures = [
          "LAME", "Lavf", "Xing", "VBRI", "iTunes", "encoder", "software",
          "FL Studio", "Ableton", "Logic Pro", "Fraunhofer", "Snd ", "INFO", "TSSE"
        ];
        
        for (const sig of signatures) {
          const sigBuffer = Buffer.from(sig);
          let offset = 0;
          while (true) {
            const index = fileBuffer.indexOf(sigBuffer, offset);
            if (index === -1) break;
            // Overwrite with null bytes to break the signature
            for (let i = 0; i < sig.length; i++) {
              fileBuffer[index + i] = 0;
            }
            offset = index + 1;
          }
        }

        // 6. MD5 Salting (Variable Length)
        // Adding 16-64 bytes of pure random noise at the tail
        const saltSize = Math.floor(Math.random() * 48) + 16;
        const salt = Buffer.alloc(saltSize);
        for (let i = 0; i < saltSize; i++) salt[i] = Math.floor(Math.random() * 256);
        fileBuffer = Buffer.concat([fileBuffer, salt]);
        
        // 7. WE DO NOT ADD ANY NEW TAGS (Pure Dry Mode)
        // This ensures the header starts with 0xFF (MPEG Frame)
      }

      // Cleanup original temp file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Create a completely random filename to avoid duplicate suffixes and leak no metadata
      const randomHex = uuidv4().replace(/-/g, '');
      const scrubbedFileName = `${randomHex}${ext}`;

      res.setHeader("Content-Disposition", `attachment; filename="${scrubbedFileName}"`);
      res.setHeader("Content-Type", req.file.mimetype);
      res.send(fileBuffer);

    } catch (error) {
      console.error("Scrub error:", error);
      res.status(500).json({ error: "Failed to process file" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Ensure upload dir exists
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

startServer();
