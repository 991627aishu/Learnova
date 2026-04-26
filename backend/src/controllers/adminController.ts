import { Response } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma.js";
import { AuthRequest } from "../middlewares/auth.js";
import { AppError } from "../middlewares/errorHandler.js";

const updateUserSchema = z.object({
  role: z.enum(["student", "instructor", "admin"]).optional(),
  suspended: z.boolean().optional(),
});

const updateCourseStatusSchema = z.object({
  status: z.enum(["draft", "published", "archived"]),
});

export async function dashboard(_req: AuthRequest, res: Response) {
  const [userCount, courseCount, enrollmentCount, reviewCount] = await Promise.all([
    prisma.user.count(),
    prisma.course.count(),
    prisma.enrollment.count(),
    prisma.review.count(),
  ]);
  const recentUsers = await prisma.user.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true },
  });
  const recentCourses = await prisma.course.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { instructor: { select: { firstName: true, lastName: true } }, categoryRel: { select: { name: true } } },
  });
  res.json({
    success: true,
    stats: { userCount, courseCount, enrollmentCount, reviewCount },
    recentUsers,
    recentCourses,
  });
}

export async function listUsers(req: AuthRequest, res: Response) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;
  const role = typeof req.query.role === "string" ? req.query.role : undefined;
  const where = role ? { role: role as "student" | "instructor" | "admin" } : {};
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, suspended: true, createdAt: true },
    }),
    prisma.user.count({ where }),
  ]);
  res.json({ success: true, users, total, page, limit });
}

export async function updateUser(req: AuthRequest, res: Response) {
  const id = req.params.id;
  const data = updateUserSchema.parse(req.body);
  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, firstName: true, lastName: true, role: true, suspended: true },
  });
  res.json({ success: true, user });
}

export async function listCoursesAdmin(req: AuthRequest, res: Response) {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const where = status ? { status: status as "draft" | "published" | "archived" } : {};
  const courses = await prisma.course.findMany({
    where,
    include: {
      instructor: { select: { id: true, firstName: true, lastName: true, email: true } },
      categoryRel: { select: { name: true } },
      _count: { select: { enrollments: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  res.json({ success: true, courses });
}

export async function updateCourseStatus(req: AuthRequest, res: Response) {
  const id = req.params.id;
  const { status } = updateCourseStatusSchema.parse(req.body);
  const course = await prisma.course.update({
    where: { id },
    data: { status, ...(status === "published" ? { publishedAt: new Date() } : {}) },
  });
  res.json({ success: true, course });
}

export async function listReviews(req: AuthRequest, res: Response) {
  const reviews = await prisma.review.findMany({
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
      course: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json({ success: true, reviews });
}

export async function hideReview(req: AuthRequest, res: Response) {
  const id = req.params.id;
  await prisma.review.update({ where: { id }, data: { hidden: true } });
  res.json({ success: true });
}

export async function listCategories(req: AuthRequest, res: Response) {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { courses: true } } },
  });
  res.json({ success: true, categories });
}

export async function createCategory(req: AuthRequest, res: Response) {
  const body = z.object({ name: z.string().min(1), slug: z.string().min(1), description: z.string().optional() }).parse(req.body);
  const category = await prisma.category.create({ data: body });
  res.status(201).json({ success: true, category });
}

export async function updateCategory(req: AuthRequest, res: Response) {
  const id = req.params.id;
  const body = z.object({ name: z.string().min(1).optional(), slug: z.string().min(1).optional(), description: z.string().optional() }).parse(req.body);
  const category = await prisma.category.update({ where: { id }, data: body });
  res.json({ success: true, category });
}

export async function adminAnalytics(req: AuthRequest, res: Response) {
  // Aggregate real global platform data

  // 1. Course Popularity
  const courses = await prisma.course.findMany({
    select: {
      title: true,
      _count: { select: { enrollments: true } }
    },
    orderBy: {
      enrollments: { _count: 'desc' }
    },
    take: 5
  });

  const popularity = courses.map(c => ({
    name: c.title.substring(0, 15) + (c.title.length > 15 ? "..." : ""),
    enrollments: c._count.enrollments
  }));

  // 2. User Growth (Last 7 Days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const recentUsers = await prisma.user.findMany({
    where: { createdAt: { gte: sevenDaysAgo } },
    select: { createdAt: true }
  });

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const growthMap = new Map<string, number>();

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    growthMap.set(daysOfWeek[d.getDay()], 0);
  }

  recentUsers.forEach(u => {
    const dayName = daysOfWeek[u.createdAt.getDay()];
    if (growthMap.has(dayName)) {
      growthMap.set(dayName, growthMap.get(dayName)! + 1);
    }
  });

  const userGrowth = Array.from(growthMap.entries()).map(([name, users]) => ({
    name,
    users
  }));

  // For Revenue, we'll send empty for now as it's complex to aggregate without an order table
  const revenueData: any[] = [];
  
  res.json({ success: true, userGrowth, revenueData, popularity });
}
