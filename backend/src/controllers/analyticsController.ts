import { Response } from "express";
import { prisma } from "../utils/prisma.js";
import { AuthRequest } from "../middlewares/auth.js";
import { AppError } from "../middlewares/errorHandler.js";

  export async function getInstructorAnalytics(req: AuthRequest, res: Response) {
  if (!req.user || (req.user.role !== "instructor" && req.user.role !== "admin")) {
    throw new AppError(403, "Forbidden");
  }

  const instructorId = req.user.id;

  const totalCourses = await prisma.course.count({ where: { instructorId } });
  
  // Calculate true enrollments and live revenue
  const instructorCourses = await prisma.course.findMany({
    where: { instructorId },
    select: {
      id: true,
      price: true,
      averageRating: true,
      reviewCount: true,
      _count: {
        select: { enrollments: true }
      }
    }
  });

  let totalEnrollments = 0;
  let totalRevenue = 0;
  let totalRatingSum = 0;
  let totalRatingCount = 0;

  for (const course of instructorCourses) {
    const enrolls = course._count.enrollments;
    totalEnrollments += enrolls;
    totalRevenue += enrolls * course.price;

    if (course.averageRating > 0 && course.reviewCount > 0) {
      totalRatingSum += course.averageRating * course.reviewCount;
      totalRatingCount += course.reviewCount;
    }
  }

  const averageRating = totalRatingCount > 0 ? Number((totalRatingSum / totalRatingCount).toFixed(1)) : 0;

  // Calculate live engagement data (Enrollments per day for the last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const recentEnrollments = await prisma.enrollment.findMany({
    where: {
      course: { instructorId },
      enrolledAt: { gte: sevenDaysAgo }
    },
    select: { enrolledAt: true }
  });

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const engagementMap = new Map<string, number>();

  // Initialize last 7 days with 0
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    engagementMap.set(daysOfWeek[d.getDay()], 0);
  }

  recentEnrollments.forEach(e => {
    const dayName = daysOfWeek[e.enrolledAt.getDay()];
    if (engagementMap.has(dayName)) {
      engagementMap.set(dayName, engagementMap.get(dayName)! + 1);
    }
  });

  const engagementData = Array.from(engagementMap.entries()).map(([name, activeStudents]) => ({
    name,
    activeStudents
  }));

  // Empty revenue array for now since we aren't tracking multi-month complex revenue cycles yet natively
  const revenueData: any[] = [];
  
  res.json({ 
    success: true, 
    stats: {
      totalCourses, 
      totalEnrollments, 
      totalRevenue,
      averageRating: averageRating > 0 ? averageRating : "N/A"
    },
    revenueData, 
    engagementData 
  });
}
