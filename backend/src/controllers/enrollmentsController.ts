import { Response } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma.js";
import { AuthRequest } from "../middlewares/auth.js";
import { AppError } from "../middlewares/errorHandler.js";

export async function enroll(req: AuthRequest, res: Response) {
  if (!req.user) throw new AppError(401, "Unauthorized");
  const courseId = req.params.courseId;
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new AppError(404, "Course not found");
  if (course.status !== "published") throw new AppError(400, "Course is not available for enrollment");

  // Check if course is paid and if payment exists
  if (course.price > 0) {
    const payment = await prisma.payment.findFirst({
      where: { userId: req.user.id, courseId, status: "completed" }
    });
    if (!payment) throw new AppError(402, "Payment required for this course");
  }

  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: req.user.id, courseId } },
  });
  if (existing) {
    return res.json({ success: true, enrollment: existing, alreadyEnrolled: true });
  }
  const enrollment = await prisma.enrollment.create({
    data: { userId: req.user.id, courseId },
  });
  await prisma.courseProgress.create({
    data: { enrollmentId: enrollment.id, percent: 0 },
  });
  res.status(201).json({ success: true, enrollment });
}

export async function check(req: AuthRequest, res: Response) {
  if (!req.user) return res.json({ success: true, enrolled: false });
  const courseId = req.params.courseId;
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: req.user.id, courseId } },
  });
  const payment = await prisma.payment.findFirst({
    where: { userId: req.user.id, courseId, status: "completed" }
  });
  res.json({ success: true, enrolled: !!enrollment, paid: !!payment });
}

export async function myEnrollments(req: AuthRequest, res: Response) {
  if (!req.user) throw new AppError(401, "Unauthorized");
  const enrollments = await prisma.enrollment.findMany({
    where: { userId: req.user.id },
    include: {
      course: {
        include: {
          categoryRel: { select: { name: true, slug: true } },
          instructor: { select: { firstName: true, lastName: true } },
          _count: { select: { sections: true } },
        },
      },
      progress: true,
    },
    orderBy: { enrolledAt: "desc" },
  });
  res.json({ success: true, enrollments });
}

export async function getProgress(req: AuthRequest, res: Response) {
  if (!req.user) throw new AppError(401, "Unauthorized");
  const courseId = req.params.courseId;
  console.log("Enrollment progress request received:", courseId, "User:", req.user.id);
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: req.user.id, courseId } },
    include: {
      progress: {
        include: {
          lectureProgress: { select: { lectureId: true, completed: true } },
        },
      },
      course: {
        include: {
          sections: {
            orderBy: { order: "asc" },
            include: { lectures: { orderBy: { order: "asc" }, include: { attachments: true } } },
          },
        },
      },
    },
  });
  if (!enrollment) throw new AppError(404, "Not enrolled");
  res.json({ success: true, enrollment, progress: enrollment.progress });
}

export async function updateLectureProgress(req: AuthRequest, res: Response) {
  if (!req.user) throw new AppError(401, "Unauthorized");
  const { courseId, lectureId } = req.params;
  const completed = req.body.completed === true;
  const progressPercent = typeof req.body.progressPercent === "number" ? req.body.progressPercent : 0;
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: req.user.id, courseId } },
    include: { progress: true },
  });
  if (!enrollment?.progress) throw new AppError(404, "Not enrolled");
  const lecture = await prisma.lecture.findUnique({ where: { id: lectureId } });
  if (!lecture) throw new AppError(404, "Lecture not found");
  await prisma.lectureProgress.upsert({
    where: {
      courseProgressId_lectureId: { courseProgressId: enrollment.progress.id, lectureId },
    },
    create: {
      courseProgressId: enrollment.progress.id,
      lectureId,
      completed,
      progressPercent,
      ...(completed ? { completedAt: new Date() } : {}),
    },
    update: {
      completed: completed || undefined,
      progressPercent,
      ...(completed ? { completedAt: new Date() } : {}),
    },
  });
  const allLectures = await prisma.lecture.findMany({
    where: { section: { courseId } },
    select: { id: true },
  });
  const completedCount = await prisma.lectureProgress.count({
    where: {
      courseProgressId: enrollment.progress.id,
      completed: true,
    },
  });
  const percent = allLectures.length ? Math.round((completedCount / allLectures.length) * 100) : 0;
  
  await prisma.courseProgress.update({
    where: { id: enrollment.progress.id },
    data: { percent, lastAccessed: new Date() },
  });

  // If 100% completed, update enrollment completion state
  if (percent === 100) {
    console.log(`[PROGRESS] Course ${courseId} completed by user ${req.user.id}. Setting isCompleted=true.`);
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { 
        completedAt: new Date(),
        isCompleted: true
      }
    });
  }

  res.json({ success: true, percent, isCompleted: percent === 100 });
}

export async function getInstructorStudents(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== "instructor") throw new AppError(403, "Forbidden");
  
  const enrollments = await prisma.enrollment.findMany({
    where: { course: { instructorId: req.user.id } },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } },
      course: { 
        select: { 
          id: true, 
          title: true, 
          thumbnail: true, 
          status: true,
          averageRating: true,
          reviewCount: true
        } 
      },
      progress: true
    },
    orderBy: { enrolledAt: "desc" }
  });
  
  // Group by course
  const groupedData: Record<string, any> = {};
  
  enrollments.forEach(en => {
    const courseId = en.course.id;
    if (!groupedData[courseId]) {
      groupedData[courseId] = {
        courseTitle: en.course.title,
        courseId: en.course.id,
        courseThumbnail: en.course.thumbnail,
        courseStatus: en.course.status,
        courseRating: en.course.averageRating,
        courseReviewCount: en.course.reviewCount,
        students: []
      };
    }
    groupedData[courseId].students.push({
      id: en.user.id,
      name: `${en.user.firstName} ${en.user.lastName}`,
      email: en.user.email,
      avatar: en.user.avatar,
      enrolledAt: en.enrolledAt,
      progress: en.progress?.percent || 0
    });
  });

  res.json({ success: true, courses: Object.values(groupedData) });
}
