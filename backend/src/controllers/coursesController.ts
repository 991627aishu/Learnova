import { Response } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma.js";
import { AuthRequest } from "../middlewares/auth.js";
import { AppError } from "../middlewares/errorHandler.js";
import { generateCourseContent, generateCourseLandingPage, generateAutoDescription } from "../services/aiService.js";
import { generateCourseDetails } from "../services/aiCourseService.js";

async function triggerAutoDescription(courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      sections: {
        include: { lectures: true }
      }
    }
  });

  if (!course) return;

  const contentSummary = course.sections.map(s => {
    return `Section: ${s.title}\nLectures: ${s.lectures.map(l => l.title).join(", ")}\nNotes: ${s.lectures.map(l => l.content || "").join("\n")}`;
  }).join("\n\n");

  const description = await generateAutoDescription(course.title, contentSummary);

  await prisma.course.update({
    where: { id: courseId },
    data: { description }
  });
}

const requiredTrimmedString = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.string().min(1)
);

const optionalTrimmedString = z.preprocess((value) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().optional());

const safePriceSchema = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return 0;
  return value;
}, z.coerce.number().min(0));

const createSchema = z.object({
  title: requiredTrimmedString,
  subtitle: optionalTrimmedString,
  description: optionalTrimmedString,
  price: safePriceSchema,
  category: optionalTrimmedString,
  subcategory: optionalTrimmedString,
  categoryId: optionalTrimmedString,
  subcategoryId: optionalTrimmedString,
  thumbnail: optionalTrimmedString,
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  language: optionalTrimmedString,
  status: z.enum(["draft", "published", "archived"]).optional(),
});

const updateSchema = createSchema.partial().extend({
  status: z.enum(["draft", "published", "archived"]).optional(),
});

function normalizeCourseCategory<T extends { categoryRel?: { id?: string; name: string; slug?: string } | null; category?: string | null }>(course: T) {
  return {
    ...course,
    category: course.categoryRel ?? (course.category ? { name: course.category } : null),
  };
}

async function resolveCategoryFields(input: {
  category?: string;
  categoryId?: string;
  subcategory?: string;
  subcategoryId?: string;
}) {
  let categoryName = input.category;
  let categoryId = input.categoryId;

  if (categoryId && !categoryName) {
    const categoryById = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true, name: true },
    });
    if (!categoryById) throw new AppError(400, "Invalid categoryId");
    categoryName = categoryById.name;
  }

  if (!categoryId && categoryName) {
    const categoryByName = await prisma.category.findFirst({
      where: { name: { equals: categoryName, mode: "insensitive" } },
      select: { id: true, name: true },
    });
    if (categoryByName) {
      categoryId = categoryByName.id;
      categoryName = categoryByName.name;
    }
  }

  let subcategoryName = input.subcategory;
  let subcategoryId = input.subcategoryId;

  if (subcategoryId && !subcategoryName) {
    const subcategoryById = await prisma.category.findUnique({
      where: { id: subcategoryId },
      select: { id: true, name: true },
    });
    if (!subcategoryById) throw new AppError(400, "Invalid subcategoryId");
    subcategoryName = subcategoryById.name;
  }

  if (!subcategoryId && subcategoryName) {
    const subcategoryByName = await prisma.category.findFirst({
      where: {
        name: { equals: subcategoryName, mode: "insensitive" },
        ...(categoryId ? { parentId: categoryId } : {}),
      },
      select: { id: true, name: true },
    });
    if (subcategoryByName) {
      subcategoryId = subcategoryByName.id;
      subcategoryName = subcategoryByName.name;
    }
  }

  return {
    categoryName: categoryName || "General",
    categoryId: categoryId || null,
    subcategoryName: subcategoryName || "General",
    subcategoryId: subcategoryId || null,
  };
}

export async function list(req: AuthRequest, res: Response) {
  const role = req.user?.role;
  const statusFilter = role === "admin" ? undefined : "published";
  const andFilters: Record<string, unknown>[] = [];

  if (statusFilter) {
    andFilters.push({ status: statusFilter });
  }

  const categoryQuery = typeof req.query.category === "string" ? req.query.category : undefined;
  const categoryIdQuery = typeof req.query.categoryId === "string" ? req.query.categoryId : undefined;
  if (categoryQuery || categoryIdQuery) {
    const categoryMatches: Record<string, unknown>[] = [];
    if (categoryQuery) {
      categoryMatches.push({ category: { equals: categoryQuery, mode: "insensitive" } });
      categoryMatches.push({ categoryRel: { is: { name: { equals: categoryQuery, mode: "insensitive" } } } });
    }

    if (categoryIdQuery) {
      categoryMatches.push({ categoryId: categoryIdQuery });
      const matchedCategory = await prisma.category.findUnique({
        where: { id: categoryIdQuery },
        select: { name: true },
      });
      if (matchedCategory) {
        categoryMatches.push({ category: matchedCategory.name });
      }
    }

    if (categoryMatches.length) {
      andFilters.push({ OR: categoryMatches });
    }
  }

  if (req.query.subcategory && typeof req.query.subcategory === "string") {
    andFilters.push({ subcategory: req.query.subcategory });
  }

  if (req.query.search && typeof req.query.search === "string") {
    andFilters.push({
      OR: [
        { title: { contains: req.query.search, mode: "insensitive" } },
        { subtitle: { contains: req.query.search, mode: "insensitive" } },
      ],
    });
  }

  if (req.query.difficulty && typeof req.query.difficulty === "string") {
    andFilters.push({ difficulty: req.query.difficulty });
  }

  if (req.query.price && typeof req.query.price === "string") {
    if (req.query.price === "free") andFilters.push({ price: 0 });
    else if (req.query.price === "paid") andFilters.push({ price: { gt: 0 } });
  }

  const where = andFilters.length ? { AND: andFilters } : {};
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));

  const courses = await prisma.course.findMany({
    where,
    include: {
      categoryRel: { select: { id: true, name: true, slug: true } },
      instructor: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      _count: { select: { enrollments: true, reviews: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  res.json({ success: true, courses: courses.map(normalizeCourseCategory) });
}

export async function listMyInstructor(req: AuthRequest, res: Response) {
  if (!req.user) throw new AppError(401, "Unauthorized");
  const courses = await prisma.course.findMany({
    where: { instructorId: req.user.id },
    include: {
      categoryRel: { select: { id: true, name: true, slug: true } },
      _count: { select: { enrollments: true, sections: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  res.json({ success: true, courses: courses.map(normalizeCourseCategory) });
}

export async function getOne(req: AuthRequest, res: Response) {
  const id = req.params.id;
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      categoryRel: true,
      instructor: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      sections: {
        orderBy: { order: "asc" },
        include: {
          lectures: { orderBy: { order: "asc" }, include: { attachments: true } },
        },
      },
      _count: { select: { enrollments: true, reviews: true } },
      enrollments: req.user ? { where: { userId: req.user.id } } : false,
      payments: req.user ? { where: { userId: req.user.id, status: "completed" } } : false,
    },
  });
  if (!course) throw new AppError(404, "Course not found");
  if (course.status !== "published" && req.user?.id !== course.instructorId && req.user?.role !== "admin") {
    throw new AppError(404, "Course not found");
  }

  // Check if content should be masked for unpaid users
  const isEnrolled = (course as any).enrollments?.length > 0;
  const isPaid = course.price === 0 || (course as any).payments?.length > 0;
  const isInstructor = req.user?.id === course.instructorId;
  const isAdmin = req.user?.role === "admin";

  if (!isInstructor && !isAdmin && (!isEnrolled || !isPaid)) {
    // Mask lecture content/urls if not paid/enrolled
    course.sections.forEach(s => {
      s.lectures.forEach(l => {
        l.videoUrl = null;
        l.content = "Locked Content - Please enroll or purchase to view.";
      });
    });
  }

  res.json({ success: true, course: normalizeCourseCategory(course) });
}

export async function getAIDetails(req: AuthRequest, res: Response) {
  const id = req.params.id;
  try {
    const details = await generateCourseDetails(id);
    res.json({ success: true, details });
  } catch (err: any) {
    throw new AppError(500, err.message || "Failed to generate AI details");
  }
}

export async function create(req: AuthRequest, res: Response) {
  if (!req.user) throw new AppError(401, "Unauthorized");
  const data = createSchema.parse(req.body);

  const resolvedCategory = await resolveCategoryFields({
    category: data.category,
    categoryId: data.categoryId,
    subcategory: data.subcategory,
    subcategoryId: data.subcategoryId,
  });

  const course = await prisma.course.create({
    data: {
      title: data.title,
      subtitle: data.subtitle,
      description: data.description,
      price: data.price,
      category: resolvedCategory.categoryName,
      subcategory: resolvedCategory.subcategoryName,
      categoryId: resolvedCategory.categoryId,
      subcategoryId: resolvedCategory.subcategoryId,
      thumbnail: data.thumbnail,
      difficulty: data.difficulty,
      language: data.language || "en",
      status: data.status || "draft",
      instructorId: req.user.id,
    },
    include: { categoryRel: true },
  });
  res.status(201).json({ success: true, course: normalizeCourseCategory(course) });
}

export async function generateAICourse(req: AuthRequest, res: Response) {
  if (!req.user || (req.user.role !== "instructor" && req.user.role !== "admin")) {
    throw new AppError(403, "Forbidden");
  }
  const { title } = req.body;
  if (!title) throw new AppError(400, "Course title is required");

  const aiData = await generateCourseContent(title);

  const course = await prisma.course.create({
    data: {
      title,
      description: aiData.description,
      instructorId: req.user.id,
      status: "draft",
      sections: {
        create: aiData.curriculum.map((section, sIndex) => ({
          title: section.title,
          order: sIndex,
          lectures: {
            create: section.topics.map((topic, lIndex) => {
              const lectureData: any = {
                title: topic.title,
                type: "article",
                content: topic.content,
                order: lIndex,
              };
              if (topic.quiz) {
                lectureData.quiz = {
                  create: {
                    title: `Quiz: ${topic.title}`,
                    description: `A quick assessment on ${topic.title}`,
                    totalMarks: topic.quiz.questions.length,
                    questions: {
                      create: topic.quiz.questions.map((q, qIndex) => ({
                        text: q.text,
                        type: "multiple_choice",
                        marks: 1,
                        order: qIndex,
                        explanation: q.explanation,
                        options: {
                          create: q.options.map((opt, oIndex) => ({
                            text: opt,
                            isCorrect: opt === q.correctAnswer,
                            order: oIndex,
                          })),
                        },
                      })),
                    },
                  },
                };
              }
              return lectureData;
            }),
          },
        })),
      },
    },
    include: {
      sections: {
        include: {
          lectures: {
            include: {
              quiz: {
                include: {
                  questions: {
                    include: {
                      options: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  // Also trigger landing page generation for the new AI course
  const summary = `Course Title: ${title}. Description: ${aiData.description}. Curriculum: ${aiData.curriculum.map(s => s.title).join(", ")}`;
  const landingData = await generateCourseLandingPage(title, summary);
  await prisma.course.update({
    where: { id: course.id },
    data: { aiLandingData: JSON.stringify(landingData) }
  });

  res.status(201).json({ success: true, course });
}

export async function generateAILandingPage(req: AuthRequest, res: Response) {
  if (!req.user || (req.user.role !== "instructor" && req.user.role !== "admin")) {
    throw new AppError(403, "Forbidden");
  }
  const { id } = req.params;

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      sections: {
        include: {
          lectures: {
            include: {
              quiz: {
                include: {
                  questions: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!course) throw new AppError(404, "Course not found");
  if (course.instructorId !== req.user.id && req.user.role !== "admin") {
    throw new AppError(403, "Unauthorized to generate description for this course");
  }

  // Build a summary of instructor-provided content
  let summary = `Title: ${course.title}. `;
  if (course.subtitle) summary += `Subtitle: ${course.subtitle}. `;
  if (course.description) summary += `Initial Description: ${course.description}. `;

  const sectionSummaries = course.sections.map(s => {
    const lectureTitles = s.lectures.map(l => l.title).join(", ");
    const quizCount = s.lectures.filter(l => l.quiz).length;
    return `Section "${s.title}" has lessons: ${lectureTitles}. It contains ${quizCount} quizzes.`;
  }).join(" ");

  summary += sectionSummaries;

  // Extract skills/questions for context
  const questions = course.sections.flatMap(s => 
    s.lectures.flatMap(l => l.quiz?.questions.map(q => q.text) || [])
  ).slice(0, 10).join("; ");
  
  if (questions) summary += ` Skills tested in quizzes include questions about: ${questions}`;

  const landingData = await generateCourseLandingPage(course.title, summary);

  const updatedCourse = await prisma.course.update({
    where: { id },
    data: { aiLandingData: JSON.stringify(landingData) }
  });

  res.json({ success: true, aiLandingData: landingData });
}

export async function update(req: AuthRequest, res: Response) {
  if (!req.user) throw new AppError(401, "Unauthorized");
  const id = req.params.id;
  const existing = await prisma.course.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "Course not found");
  if (existing.instructorId !== req.user.id && req.user.role !== "admin") {
    throw new AppError(403, "Not allowed to update this course");
  }
  const data = updateSchema.parse(req.body);
  if (!Object.keys(data).length) {
    throw new AppError(400, "No valid fields provided for update");
  }

  const updateData: Record<string, unknown> = {};

  if (data.title !== undefined) updateData.title = data.title;
  if (data.subtitle !== undefined) updateData.subtitle = data.subtitle;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.price !== undefined) updateData.price = data.price;
  if (data.thumbnail !== undefined) updateData.thumbnail = data.thumbnail;
  if (data.difficulty !== undefined) updateData.difficulty = data.difficulty;
  if (data.language !== undefined) updateData.language = data.language;
  if (data.status !== undefined) updateData.status = data.status;

  const isCategoryPatch =
    Object.prototype.hasOwnProperty.call(data, "category") ||
    Object.prototype.hasOwnProperty.call(data, "categoryId") ||
    Object.prototype.hasOwnProperty.call(data, "subcategory") ||
    Object.prototype.hasOwnProperty.call(data, "subcategoryId");

  if (isCategoryPatch) {
    const resolvedCategory = await resolveCategoryFields({
      category: data.category ?? existing.category ?? undefined,
      categoryId: data.categoryId ?? existing.categoryId ?? undefined,
      subcategory: data.subcategory ?? existing.subcategory ?? undefined,
      subcategoryId: data.subcategoryId ?? existing.subcategoryId ?? undefined,
    });

    updateData.category = resolvedCategory.categoryName;
    updateData.categoryId = resolvedCategory.categoryId;
    updateData.subcategory = resolvedCategory.subcategoryName;
    updateData.subcategoryId = resolvedCategory.subcategoryId;
  }

  if (data.status === "published" && existing.status !== "published") {
    updateData.publishedAt = new Date();
  }
  const course = await prisma.course.update({
    where: { id },
    data: updateData,
    include: { categoryRel: true },
  });

  // Non-blocking auto-description generation if lectures or title changed
  triggerAutoDescription(id).catch(err => console.error("Auto-description failed", err));

  res.json({ success: true, course: normalizeCourseCategory(course) });
}

export async function remove(req: AuthRequest, res: Response) {
  if (!req.user) throw new AppError(401, "Unauthorized");
  const id = req.params.id;
  const existing = await prisma.course.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "Course not found");
  if (existing.instructorId !== req.user.id && req.user.role !== "admin") {
    throw new AppError(403, "Not allowed to delete this course");
  }
  await prisma.course.delete({ where: { id } });
  res.json({ success: true });
}
