import { Response } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma.js";
import { AuthRequest } from "../middlewares/auth.js";
import { AppError } from "../middlewares/errorHandler.js";

const createSchema = z.object({
  title: z.string().min(1),
  type: z.enum(["video", "article", "file", "quiz", "notes"]),
  content: z.string().optional(),
  videoUrl: z.string().optional(),
  duration: z.number().int().min(0).optional(),
  order: z.number().int().min(0).optional(),
  quizId: z.string().optional(),
});

const reorderSchema = z.object({ lectureIds: z.array(z.string()) });

const updateSchema = createSchema.partial();

export async function listBySection(req: AuthRequest, res: Response) {
  const sectionId = req.params.sectionId;
  const section = await prisma.section.findUnique({ where: { id: sectionId }, include: { course: true } });
  if (!section) throw new AppError(404, "Section not found");
  if (section.course.instructorId !== req.user?.id && req.user?.role !== "admin") {
    throw new AppError(403, "Forbidden");
  }
  const lectures = await prisma.lecture.findMany({
    where: { sectionId },
    orderBy: { order: "asc" },
    include: { attachments: true, quiz: true },
  });
  res.json({ success: true, lectures });
}

export async function getOne(req: AuthRequest, res: Response) {
  const id = req.params.id;
  const lecture = await prisma.lecture.findUnique({
    where: { id },
    include: {
      section: { include: { course: true } },
      attachments: true,
      quiz: { include: { questions: { include: { options: true } } } },
    },
  });
  if (!lecture) throw new AppError(404, "Lecture not found");
  const canAccess =
    lecture.section.course.status === "published" ||
    lecture.section.course.instructorId === req.user?.id ||
    req.user?.role === "admin";
  if (!canAccess) throw new AppError(403, "Forbidden");
  res.json({ success: true, lecture });
}

export async function getLectureQuiz(req: AuthRequest, res: Response) {
  const id = req.params.id;
  const lecture = await prisma.lecture.findUnique({
    where: { id },
    include: {
      section: { include: { course: true } },
      quiz: { include: { questions: { include: { options: true } } } },
    },
  });
  if (!lecture) throw new AppError(404, "Lecture not found");
  const canAccess =
    lecture.section.course.status === "published" ||
    lecture.section.course.instructorId === req.user?.id ||
    req.user?.role === "admin";
  if (!canAccess) throw new AppError(403, "Forbidden");
  if (!lecture.quiz) throw new AppError(404, "Quiz not found for this lecture");
  res.json({ success: true, quiz: lecture.quiz });
}

export async function create(req: AuthRequest, res: Response) {
  if (!req.user) throw new AppError(401, "Unauthorized");
  const sectionId = req.params.sectionId;
  const section = await prisma.section.findUnique({ where: { id: sectionId }, include: { course: true } });
  if (!section) throw new AppError(404, "Section not found");
  if (section.course.instructorId !== req.user.id) throw new AppError(403, "Forbidden");
  const data = createSchema.parse(req.body);
  const maxOrder = await prisma.lecture.findFirst({
    where: { sectionId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  
  let quizId = data.quizId;
  if (data.type === "quiz" && !quizId) {
    const newQuiz = await prisma.quiz.create({ data: { title: data.title } });
    quizId = newQuiz.id;
  }

  const lecture = await prisma.lecture.create({
    data: {
      sectionId,
      title: data.title,
      type: data.type as "video" | "article" | "file" | "quiz" | "notes",
      content: data.content,
      videoUrl: data.videoUrl,
      duration: data.duration,
      order: data.order ?? (maxOrder?.order ?? 0) + 1,
      quizId: quizId,
    },
    include: { attachments: true },
  });
  res.status(201).json({ success: true, lecture });
}

export async function update(req: AuthRequest, res: Response) {
  if (!req.user) throw new AppError(401, "Unauthorized");
  const id = req.params.id;
  const lecture = await prisma.lecture.findUnique({ where: { id }, include: { section: { include: { course: true } } } });
  if (!lecture) throw new AppError(404, "Lecture not found");
  if (lecture.section.course.instructorId !== req.user.id) throw new AppError(403, "Forbidden");
  const data = updateSchema.parse(req.body);
  const updated = await prisma.lecture.update({
    where: { id },
    data: data as Record<string, unknown>,
    include: { attachments: true },
  });
  res.json({ success: true, lecture: updated });
}

export async function remove(req: AuthRequest, res: Response) {
  if (!req.user) throw new AppError(401, "Unauthorized");
  const id = req.params.id;
  const lecture = await prisma.lecture.findUnique({ where: { id }, include: { section: { include: { course: true } } } });
  if (!lecture) throw new AppError(404, "Lecture not found");
  if (lecture.section.course.instructorId !== req.user.id) throw new AppError(403, "Forbidden");
  await prisma.lecture.delete({ where: { id } });
  res.json({ success: true });
}

export async function reorder(req: AuthRequest, res: Response) {
  if (!req.user) throw new AppError(401, "Unauthorized");
  const sectionId = req.params.sectionId;
  const section = await prisma.section.findUnique({ where: { id: sectionId }, include: { course: true } });
  if (!section || (section.course.instructorId !== req.user.id && req.user.role !== "admin")) {
    throw new AppError(403, "Forbidden");
  }
  const { lectureIds } = reorderSchema.parse(req.body);
  await prisma.$transaction(
    lectureIds.map((id, index) => prisma.lecture.update({ where: { id }, data: { order: index } }))
  );
  const lectures = await prisma.lecture.findMany({
    where: { sectionId },
    orderBy: { order: "asc" },
    include: { attachments: true, quiz: true },
  });
  res.json({ success: true, lectures });
}
