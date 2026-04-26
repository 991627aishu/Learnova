import { Response } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma.js";
import { AuthRequest } from "../middlewares/auth.js";
import { AppError } from "../middlewares/errorHandler.js";
// type QuestionType imported removed as it was enum

const createQuizSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
});

const bulkUpdateSchema = z.object({
  title: z.string().min(1),
  questions: z.array(z.object({
    id: z.string().optional(),
    text: z.string().min(1),
    type: z.enum(["multiple_choice", "multiple_select", "true_false", "short_answer"]),
    marks: z.number().int().min(0).default(1),
    order: z.number().int().min(0).optional(),
    explanation: z.string().optional(),
    options: z.array(z.object({
      id: z.string().optional(),
      text: z.string(),
      isCorrect: z.boolean(),
      order: z.number().optional()
    })).optional(),
  }))
});

const questionOptionSchema = z.object({ text: z.string(), isCorrect: z.boolean(), order: z.number().optional() });
const createQuestionSchema = z.object({
  text: z.string().min(1),
  type: z.enum(["multiple_choice", "multiple_select", "true_false", "short_answer"]),
  marks: z.number().int().min(0).default(1),
  order: z.number().int().min(0).optional(),
  explanation: z.string().optional(),
  options: z.array(questionOptionSchema).optional(),
});
const submitAttemptSchema = z.object({
  answers: z.record(z.union([z.string(), z.array(z.string())])),
});

export async function create(req: AuthRequest, res: Response) {
  if (!req.user) throw new AppError(401, "Unauthorized");
  const data = createQuizSchema.parse(req.body);
  const quiz = await prisma.quiz.create({ data });
  res.status(201).json({ success: true, quiz });
}

export async function getOne(req: AuthRequest, res: Response) {
  const id = req.params.id;
  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: "asc" }, include: { options: { orderBy: { order: "asc" } } } } },
  });
  if (!quiz) throw new AppError(404, "Quiz not found");
  res.json({ success: true, quiz });
}

export async function addQuestion(req: AuthRequest, res: Response) {
  if (!req.user) throw new AppError(401, "Unauthorized");
  const quizId = req.params.id;
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) throw new AppError(404, "Quiz not found");
  const data = createQuestionSchema.parse(req.body);
  const maxOrder = await prisma.question.findFirst({
    where: { quizId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const question = await prisma.question.create({
    data: {
      quizId,
      text: data.text,
      type: data.type,
      marks: data.marks,
      order: data.order ?? (maxOrder?.order ?? 0) + 1,
      explanation: data.explanation,
    },
  });
  if (data.options?.length) {
    await prisma.option.createMany({
      data: data.options.map((o, i) => ({
        questionId: question.id,
        text: o.text,
        isCorrect: o.isCorrect,
        order: o.order ?? i,
      })),
    });
  }
  const totalMarks = await prisma.question.aggregate({ where: { quizId }, _sum: { marks: true } });
  await prisma.quiz.update({ where: { id: quizId }, data: { totalMarks: totalMarks._sum.marks ?? 0 } });
  const withOptions = await prisma.question.findUnique({
    where: { id: question.id },
    include: { options: true },
  });
  res.status(201).json({ success: true, question: withOptions });
}

export async function submitAttempt(req: AuthRequest, res: Response) {
  if (!req.user) throw new AppError(401, "Unauthorized");
  const quizId = req.params.id;
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { include: { options: true } } },
  });
  if (!quiz) throw new AppError(404, "Quiz not found");
  const { answers } = submitAttemptSchema.parse(req.body);
  
  let score = 0;
  const results = quiz.questions.map(q => {
    const userAnswer = answers[q.id];
    let isCorrect = false;
    const correctOptions = q.options.filter(o => o.isCorrect).map(o => o.id);

    if (q.type === "multiple_choice" || q.type === "true_false") {
      isCorrect = typeof userAnswer === "string" && correctOptions.includes(userAnswer);
    } else if (q.type === "multiple_select") {
      const submitted = Array.isArray(userAnswer) ? new Set(userAnswer) : new Set<string>();
      isCorrect = correctOptions.length === submitted.size && correctOptions.every(id => submitted.has(id));
    }

    if (isCorrect) score += q.marks;

    return {
      questionId: q.id,
      userAnswer,
      isCorrect,
      correctOptions,
      explanation: q.explanation
    };
  });

  const attempt = await prisma.quizAttempt.create({
    data: { 
      userId: req.user.id, 
      quizId, 
      score, 
      totalMarks: quiz.totalMarks, 
      answers: JSON.stringify({ answers, results }) 
    },
  });

  res.json({ 
    success: true, 
    attempt: { ...attempt, score: Number(attempt.score) }, 
    totalMarks: quiz.totalMarks,
    results 
  });
}

export async function myAttempts(req: AuthRequest, res: Response) {
  if (!req.user) throw new AppError(401, "Unauthorized");
  const attempts = await prisma.quizAttempt.findMany({
    where: { userId: req.user.id },
    include: { 
      quiz: { 
        select: { 
          id: true,
          title: true,
          lectures: {
            select: {
              section: {
                select: {
                  course: {
                    select: {
                      id: true,
                      title: true
                    }
                  }
                }
              }
            }
          }
        } 
      } 
    },
    orderBy: { createdAt: "desc" },
  });

  // Format attempts to include course info directly
  const formattedAttempts = attempts.map(a => {
    const course = a.quiz.lectures[0]?.section?.course;
    return {
      id: a.id,
      score: Number(a.score),
      totalMarks: a.totalMarks,
      createdAt: a.createdAt,
      quizName: a.quiz.title,
      quizId: a.quiz.id,
      courseName: course?.title || "Unknown Course",
      courseId: course?.id,
      answers: JSON.parse(a.answers)
    };
  });

  res.json({ success: true, attempts: formattedAttempts });
}

export async function bulkUpdate(req: AuthRequest, res: Response) {
  if (!req.user) throw new AppError(401, "Unauthorized");
  const quizId = req.params.id;
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) throw new AppError(404, "Quiz not found");
  
  const data = bulkUpdateSchema.parse(req.body);

  // For simplicity, delete all old questions and options, and recreate them
  await prisma.question.deleteMany({ where: { quizId } });
  
  await prisma.quiz.update({ where: { id: quizId }, data: { title: data.title } });

  for (const [index, q] of data.questions.entries()) {
    const question = await prisma.question.create({
      data: {
        quizId,
        text: q.text,
        type: q.type,
        marks: q.marks,
        order: q.order ?? index,
        explanation: q.explanation,
      }
    });
    
    if (q.options?.length) {
      await prisma.option.createMany({
        data: q.options.map((o, optIndex) => ({
          questionId: question.id,
          text: o.text,
          isCorrect: o.isCorrect,
          order: o.order ?? optIndex
        }))
      });
    }
  }

  const totalMarks = await prisma.question.aggregate({ where: { quizId }, _sum: { marks: true } });
  await prisma.quiz.update({ where: { id: quizId }, data: { totalMarks: totalMarks._sum.marks ?? 0 } });

  res.json({ success: true, message: "Quiz updated successfully" });
}
