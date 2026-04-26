import { Response } from "express";
import { prisma } from "../utils/prisma.js";
import { AuthRequest } from "../middlewares/auth.js";
import { AppError } from "../middlewares/errorHandler.js";

export async function list(req: AuthRequest, res: Response) {
  if (!req.user) throw new AppError(401, "Unauthorized");
  const items = await prisma.wishlistItem.findMany({
    where: { userId: req.user.id },
    include: {
      course: {
        include: {
          categoryRel: { select: { name: true, slug: true } },
          instructor: { select: { firstName: true, lastName: true } },
          _count: { select: { enrollments: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({ success: true, items });
}

export async function add(req: AuthRequest, res: Response) {
  if (!req.user) throw new AppError(401, "Unauthorized");
  const courseId = req.params.courseId;
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new AppError(404, "Course not found");
  const item = await prisma.wishlistItem.upsert({
    where: { userId_courseId: { userId: req.user.id, courseId } },
    create: { userId: req.user.id, courseId },
    update: {},
  });
  res.status(201).json({ success: true, item });
}

export async function remove(req: AuthRequest, res: Response) {
  if (!req.user) throw new AppError(401, "Unauthorized");
  const courseId = req.params.courseId;
  await prisma.wishlistItem.deleteMany({
    where: { userId: req.user.id, courseId },
  });
  res.json({ success: true });
}
