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
lectureRouter.get("/:id", authenticate, lecturesController.getOne);
lectureRouter.get("/:id/quiz", authenticate, lecturesController.getLectureQuiz);
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
