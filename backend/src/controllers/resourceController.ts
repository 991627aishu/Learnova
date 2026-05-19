import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { marked } from "marked";
import katex from "katex";

const prisma = new PrismaClient();

// Create a new resource course
export const createResourceCourse = async (req: Request, res: Response) => {
  try {
    const { title, description } = req.body;
    const instructorId = req.user!.id;

    const course = await prisma.resourceCourse.create({
      data: {
        title,
        description,
        instructorId,
      },
      include: {
        instructor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json(course);
  } catch (error) {
    console.error("Error creating resource course:", error);
    res.status(500).json({ error: "Failed to create resource course" });
  }
};

// Get all resource courses for an instructor
export const getInstructorResourceCourses = async (req: Request, res: Response) => {
  try {
    const instructorId = req.user!.id;

    const courses = await prisma.resourceCourse.findMany({
      where: { instructorId },
      include: {
        content: {
          select: {
            updatedAt: true,
          },
        },
        _count: {
          select: {
            content: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    res.json(courses);
  } catch (error) {
    console.error("Error getting instructor resource courses:", error);
    res.status(500).json({ error: "Failed to get resource courses" });
  }
};

// Get a single resource course
export const getResourceCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const course = await prisma.resourceCourse.findUnique({
      where: { id },
      include: {
        instructor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        content: true,
      },
    });

    if (!course) {
      return res.status(404).json({ error: "Resource course not found" });
    }

    res.json(course);
  } catch (error) {
    console.error("Error getting resource course:", error);
    res.status(500).json({ error: "Failed to get resource course" });
  }
};

// Save or update resource content
export const saveResourceContent = async (req: Request, res: Response) => {
  try {
    const { courseId, latexContent } = req.body;

    // Verify the user owns this course
    const course = await prisma.resourceCourse.findUnique({
      where: { id: courseId },
      select: { instructorId: true },
    });

    if (!course || course.instructorId !== req.user!.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Convert LaTeX + Markdown to HTML
    const compiledHtml = await compileLatexToHtml(latexContent);

    // Upsert the content
    const content = await prisma.resourceContent.upsert({
      where: { courseId },
      update: {
        latexContent,
        compiledHtml,
      },
      create: {
        courseId,
        latexContent,
        compiledHtml,
      },
    });

    res.json(content);
  } catch (error) {
    console.error("Error saving resource content:", error);
    res.status(500).json({ error: "Failed to save resource content" });
  }
};

// Get resource content for a course
export const getResourceContent = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;

    const content = await prisma.resourceContent.findUnique({
      where: { courseId },
    });

    if (!content) {
      return res.status(404).json({ error: "Content not found" });
    }

    res.json(content);
  } catch (error) {
    console.error("Error getting resource content:", error);
    res.status(500).json({ error: "Failed to get resource content" });
  }
};

// Helper function to compile LaTeX + Markdown to HTML
async function compileLatexToHtml(latexContent: string): Promise<string> {
  try {
    // First, convert Markdown to HTML
    const markdownHtml = await marked(latexContent);
    
    // Then process LaTeX math expressions
    // Process display math (block math between $$ ... $$)
    let processedHtml = markdownHtml.replace(
      /\$\$([\s\S]*?)\$\$/g,
      (match, math) => {
        try {
          return katex.renderToString(math.trim(), {
            displayMode: true,
            throwOnError: false,
          });
        } catch (error) {
          console.error("LaTeX display math error:", error);
          return match; // Return original if LaTeX fails
        }
      }
    );

    // Process inline math (between $ ... $)
    processedHtml = processedHtml.replace(
      /\$([^$\n]+?)\$/g,
      (match, math) => {
        try {
          return katex.renderToString(math.trim(), {
            displayMode: false,
            throwOnError: false,
          });
        } catch (error) {
          console.error("LaTeX inline math error:", error);
          return match; // Return original if LaTeX fails
        }
      }
    );

    return processedHtml;
  } catch (error) {
    console.error("Error compiling LaTeX to HTML:", error);
    // Fallback to basic markdown if LaTeX compilation fails
    return marked(latexContent);
  }
}
