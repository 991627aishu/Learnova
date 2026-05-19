import { Router } from "express";
import * as lecturesController from "../controllers/lecturesController.js";
import { authenticate } from "../middlewares/auth.js";
import { upload } from "../middlewares/upload.js";
import { prisma } from "../utils/prisma.js";
import { AuthRequest } from "../middlewares/auth.js";
import { AppError } from "../middlewares/errorHandler.js";

export const lectureRouter = Router({ mergeParams: true });

lectureRouter.get("/", authenticate, lecturesController.listBySection);
lectureRouter.patch("/reorder", authenticate, lecturesController.reorder);

// Public video streaming endpoint - NO AUTH required for HTML video element
lectureRouter.get("/video/:id", async (req, res) => {
  try {
    console.log("PUBLIC VIDEO API HIT");
    console.log("LECTURE ID:", req.params.id);

    const lecture = await prisma.lecture.findUnique({
      where: { id: req.params.id },
      include: { section: { include: { course: true } } }
    });

    if (!lecture || !lecture.videoUrl) {
      console.log("NO VIDEO FOUND");
      return res.status(404).send("No video");
    }

    // Check if user is enrolled (optional - for public access)
    // For now, allow access to all uploaded videos
    console.log("✅ VIDEO ACCESS GRANTED for:", lecture.title);

    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(process.cwd(), "uploads", lecture.videoUrl);

    console.log("VIDEO PATH:", filePath);
    console.log("EXISTS:", fs.existsSync(filePath));

    if (!fs.existsSync(filePath)) {
      console.log("FILE NOT FOUND:", filePath);
      return res.status(404).send("File missing");
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    console.log("SIZE:", fileSize);

    const range = req.headers.range;

    if (!range) {
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": "video/mp4",
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    const CHUNK_SIZE = 10 ** 6; // 1MB
    const start = Number(range.replace(/\D/g, ""));
    const end = Math.min(start + CHUNK_SIZE, fileSize - 1);

    const chunkSize = end - start + 1;

    const stream = fs.createReadStream(filePath, { start, end });

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": "video/mp4",
    });

    stream.pipe(res);
  } catch (err) {
    console.error("VIDEO ERROR:", err);
    res.status(500).send("Streaming error");
  }
});

// Protected video streaming endpoint - for API calls with auth
lectureRouter.get("/video-protected/:id", authenticate, async (req: AuthRequest, res) => {
  try {
    console.log("VIDEO API HIT");
    console.log("LECTURE ID:", req.params.id);

    const lecture = await prisma.lecture.findUnique({
      where: { id: req.params.id },
    });

    if (!lecture || !lecture.videoUrl) {
      console.log("NO VIDEO FOUND");
      return res.status(404).send("No video");
    }

    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(process.cwd(), "uploads", lecture.videoUrl);

    console.log("VIDEO PATH:", filePath);
    console.log("EXISTS:", fs.existsSync(filePath));

    if (!fs.existsSync(filePath)) {
      console.log("FILE NOT FOUND:", filePath);
      return res.status(404).send("File missing");
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    console.log("SIZE:", fileSize);

    const range = req.headers.range;

    if (!range) {
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": "video/mp4",
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    const CHUNK_SIZE = 10 ** 6; // 1MB
    const start = Number(range.replace(/\D/g, ""));
    const end = Math.min(start + CHUNK_SIZE, fileSize - 1);

    const chunkSize = end - start + 1;

    const stream = fs.createReadStream(filePath, { start, end });

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": "video/mp4",
    });

    stream.pipe(res);
  } catch (err) {
    console.error("VIDEO ERROR:", err);
    res.status(500).send("Streaming error");
  }
});

lectureRouter.get("/:id", authenticate, lecturesController.getOne);
lectureRouter.get("/:id/quiz", authenticate, lecturesController.getLectureQuiz);
lectureRouter.get("/:id/notes", authenticate, lecturesController.getLectureNotes);
lectureRouter.patch("/:id/notes", authenticate, lecturesController.updateLectureNotes);
lectureRouter.post("/:lectureId/attach-notes", authenticate, lecturesController.attachNotes);
lectureRouter.post("/:id/upload-video", authenticate, upload.single("video"), async (req: AuthRequest, res) => {
  if (!req.file) throw new AppError(400, "No video file uploaded");
  if (!req.file.mimetype.startsWith("video/")) throw new AppError(400, "File must be a video");
  
  const lectureId = req.params.id;
  const lecture = await prisma.lecture.findUnique({ 
    where: { id: lectureId }, 
    include: { section: { include: { course: true } } } 
  });
  
  if (!lecture) throw new AppError(404, "Lecture not found");
  if (lecture.section.course.instructorId !== req.user?.id) throw new AppError(403, "Forbidden");
  
  const baseUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 3001}`;
  const videoUrl = `${baseUrl}/uploads/${req.file.filename}`;
  
  await prisma.lecture.update({
    where: { id: lectureId },
    data: { 
      videoUrl,
      videoType: "upload"
    } as any
  });
  
  res.json({ success: true, videoUrl, videoType: "upload" });
});
lectureRouter.post("/", authenticate, lecturesController.create);
lectureRouter.patch("/:id", authenticate, lecturesController.update);
lectureRouter.delete("/:id", authenticate, lecturesController.remove);

lectureRouter.post("/:id/upload", authenticate, upload.single("file"), async (req: AuthRequest, res) => {
  if (!req.file) throw new AppError(400, "No file uploaded");
  const lectureId = req.params.id;
  const lecture = await prisma.lecture.findUnique({ where: { id: lectureId }, include: { section: { include: { course: true } } } });
  if (!lecture) throw new AppError(404, "Lecture not found");
  if (lecture.section.course.instructorId !== req.user?.id) throw new AppError(403, "Forbidden");
  const baseUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 3001}`;
  const url = `${baseUrl}/uploads/${req.file.filename}`;
  const attachment = await prisma.attachment.create({
    data: {
      lectureId,
      name: req.file.originalname,
      url,
      type: req.file.mimetype,
      size: req.file.size,
    },
  });
  res.status(201).json({ success: true, attachment });
});
