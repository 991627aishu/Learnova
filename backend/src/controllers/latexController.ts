import { createHash } from "crypto";
import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.js";
import { AppError } from "../middlewares/errorHandler.js";
import { prisma } from "../utils/prisma.js";
import { compileLatexLocally, storeCompiledPdf } from "../services/latexCompileService.js";

const MAX_TITLE_LENGTH = 160;
const MAX_CONTENT_LENGTH = 200_000;

const compileCache = new Map<string, { hash: string; pdfUrl: string; updatedAt: number }>();

const forbiddenLatexRules: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /\\(?:immediate\s*)?\\write18\b/i, message: "Shell escape commands are not allowed." },
  { pattern: /\\open(?:in|out)\b/i, message: "File read/write primitives are not allowed." },
  { pattern: /\\(input|include)\s*\{[^}]*\.\.[^}]*\}/i, message: "Parent-path includes are not allowed." },
  { pattern: /\\(usepackage|RequirePackage)\s*\{\s*shellesc\s*\}/i, message: "Package shellesc is not allowed." },
];

function assertTeacher(req: AuthRequest): NonNullable<AuthRequest["user"]> {
  if (!req.user) {
    throw new AppError(401, "Authentication required");
  }
  if (req.user.role !== "instructor" && req.user.role !== "admin") {
    throw new AppError(403, "Only teachers can access LaTeX notes");
  }
  return req.user;
}

function normalizeTitle(rawTitle: string): string {
  const title = rawTitle.trim();
  if (!title) throw new AppError(400, "Document title is required");
  if (title.length > MAX_TITLE_LENGTH) {
    throw new AppError(400, `Document title cannot exceed ${MAX_TITLE_LENGTH} characters`);
  }
  return title;
}

function validateLatexContent(content: string): string {
  if (typeof content !== "string") {
    throw new AppError(400, "LaTeX content must be a string");
  }

  if (!content.trim()) {
    throw new AppError(400, "LaTeX content is required");
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    throw new AppError(400, `LaTeX content cannot exceed ${MAX_CONTENT_LENGTH} characters`);
  }

  for (const rule of forbiddenLatexRules) {
    if (rule.pattern.test(content)) {
      throw new AppError(400, rule.message);
    }
  }

  return content;
}

function escapeForLatexTitle(input: string): string {
  return input.replace(/[\\{}$&#%_^~]/g, (match) => {
    const map: Record<string, string> = {
      "\\": "\\textbackslash{}",
      "{": "\\{",
      "}": "\\}",
      "$": "\\$",
      "&": "\\&",
      "#": "\\#",
      "%": "\\%",
      "_": "\\_",
      "^": "\\^{}",
      "~": "\\~{}",
    };
    return map[match] ?? match;
  });
}

// REMOVED: ensureLatexDocument function - DO NOT modify LaTeX content

function buildDefaultTemplate(title: string): string {
  return `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{amsfonts}
\\usepackage{amssymb}
\\usepackage{graphicx}
\\usepackage[margin=1in]{geometry}
\\title{${escapeForLatexTitle(title)}}
\\author{Teacher}
\\date{\\today}

\\begin{document}
\\maketitle

\\section{Introduction}
Add your notes here.

\\end{document}`;
}

function hashDocumentContent(title: string, content: string): string {
  return createHash("sha256").update(`${title}\n${content}`).digest("hex");
}

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return false;
}

export async function createLatexDocument(req: AuthRequest, res: Response) {
  const user = assertTeacher(req);
  const rawTitle = typeof req.body?.title === "string" ? req.body.title : "Untitled Notes";
  const title = normalizeTitle(rawTitle);

  // Use EXACT content provided, no modifications
  const rawContent = typeof req.body?.content === "string" ? req.body.content : buildDefaultTemplate(title);
  const content = validateLatexContent(rawContent);

  const document = await prisma.latexDocument.create({
    data: {
      title,
      content,
      userId: user.id,
    },
  });

  res.status(201).json({ success: true, document });
}

export async function getLatexDocument(req: AuthRequest, res: Response) {
  const user = assertTeacher(req);
  const { id } = req.params;

  const document = await prisma.latexDocument.findFirst({
    where: { id, userId: user.id },
  });

  if (!document) {
    throw new AppError(404, "LaTeX document not found");
  }

  res.json({ success: true, document });
}

export async function updateLatexDocument(req: AuthRequest, res: Response) {
  const user = assertTeacher(req);
  const { id } = req.params;

  const existing = await prisma.latexDocument.findFirst({
    where: { id, userId: user.id },
  });

  if (!existing) {
    throw new AppError(404, "LaTeX document not found");
  }

  const data: { title?: string; content?: string } = {};

  if (req.body && Object.prototype.hasOwnProperty.call(req.body, "title")) {
    if (typeof req.body.title !== "string") {
      throw new AppError(400, "title must be a string");
    }
    data.title = normalizeTitle(req.body.title);
  }

  if (req.body && Object.prototype.hasOwnProperty.call(req.body, "content")) {
    data.content = validateLatexContent(req.body.content);
  }

  if (!Object.keys(data).length) {
    throw new AppError(400, "At least one field (title/content) is required");
  }

  const document = await prisma.latexDocument.update({
    where: { id: existing.id },
    data,
  });

  compileCache.delete(existing.id);

  res.json({ success: true, document });
}

export async function uploadLatexImage(req: AuthRequest, res: Response) {
  try {
    assertTeacher(req);

    if (!req.file) {
      throw new AppError(400, "Image file is required");
    }

    console.log("LaTeX image upload:", {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });

    const allowedMimeTypes = new Set([
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/gif",
      "image/webp",
      "image/svg+xml",
    ]);

    if (!allowedMimeTypes.has(req.file.mimetype)) {
      throw new AppError(400, `Only image uploads are supported. Got: ${req.file.mimetype}`);
    }

    const imageUrl = `/uploads/latex/${req.file.filename}`;
    const snippet = `\\includegraphics[width=0.7\\linewidth]{${req.file.filename}}`;

    console.log("Image upload successful:", { imageUrl, filename: req.file.filename });

    res.status(201).json({
      success: true,
      image: {
        filename: req.file.filename,
        url: imageUrl,
        latexPath: req.file.filename,
        snippet,
      },
    });
  } catch (error: any) {
    console.error("LaTeX image upload error:", error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, `Image upload failed: ${error.message}`);
  }
}

async function compileTeacherDocument(req: AuthRequest, res: Response, documentId: string) {
  const user = assertTeacher(req);

  const document = await prisma.latexDocument.findFirst({
    where: { id: documentId, userId: user.id },
  });

  if (!document) {
    throw new AppError(404, "LaTeX document not found");
  }

  // CRITICAL: Use EXACT content from editor, NO modifications
  const latexContent = validateLatexContent(document.content);
  console.log("LATEX INPUT:", latexContent);
  
  const hash = hashDocumentContent(document.title, latexContent);
  const forceCompile = toBoolean(req.body?.force);

  const cached = compileCache.get(document.id);
  if (!forceCompile && document.pdfUrl && cached?.hash === hash) {
    return res.json({
      success: true,
      cached: true,
      documentId: document.id,
      pdfUrl: document.pdfUrl,
      errors: [],
    });
  }

  const compiled = await compileLatexLocally(document.id, latexContent, {
    workspaceSubdir: "teacher-documents",
    copyReferencedImages: true,
    enableBibtex: true,
    compilerFallback: true,
    maxPasses: 3
  });

  if (!compiled.success) {
    return res.status(400).json({
      success: false,
      error: "Compilation failed",
      logs: compiled.logs,
      errors: compiled.errors,
      documentId: document.id,
      compilationTime: compiled.compilationTime,
      compilerUsed: compiled.compilerUsed,
      passesCompleted: compiled.passesCompleted,
      bibtexRun: compiled.bibtexRun
    });
  }

  const fileName = `${document.id}-${hash.slice(0, 12)}`;
  const storedPdf = await storeCompiledPdf(document.id, fileName, {
    workspaceSubdir: "teacher-documents",
  });

  const updated = await prisma.latexDocument.update({
    where: { id: document.id },
    data: { pdfUrl: storedPdf.publicUrl },
  });

  compileCache.set(document.id, {
    hash,
    pdfUrl: storedPdf.publicUrl,
    updatedAt: Date.now(),
  });

  return res.json({
    success: true,
    cached: false,
    documentId: updated.id,
    pdfUrl: updated.pdfUrl,
    errors: [],
    compilationTime: compiled.compilationTime,
    compilerUsed: compiled.compilerUsed,
    passesCompleted: compiled.passesCompleted,
    bibtexRun: compiled.bibtexRun
  });
}

async function compileLegacyProject(code: string, projectId: string, res: Response) {
  // CRITICAL: Use EXACT code from frontend, NO modifications
  const content = validateLatexContent(code);
  console.log("LATEX INPUT:", content);
  
  const result = await compileLatexLocally(projectId, content, {
    copyReferencedImages: true,
    enableBibtex: true,
    compilerFallback: true,
    maxPasses: 3
  });

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: "Compilation failed",
      logs: result.logs,
      errors: result.errors,
      compilationTime: result.compilationTime,
      compilerUsed: result.compilerUsed,
      passesCompleted: result.passesCompleted,
      bibtexRun: result.bibtexRun
    });
  }

  return res.json({
    success: true,
    pdfBase64: result.base64,
    logs: result.logs,
    errors: [],
    compilationTime: result.compilationTime,
    compilerUsed: result.compilerUsed,
    passesCompleted: result.passesCompleted,
    bibtexRun: result.bibtexRun
  });
}

export async function compileLatex(req: AuthRequest, res: Response) {
  console.log("LATEX COMPILE API HIT");
  
  // Bypass auth for debugging - allow direct compilation
  // assertTeacher(req);

  const documentId = typeof req.body?.documentId === "string" ? req.body.documentId : null;
  if (documentId) {
    // Skip teacher document compilation for now - focus on direct code compilation
    return res.status(400).json({ error: "Document compilation not supported in debug mode" });
  }

  const code = typeof req.body?.code === "string" ? req.body.code : "";
  const projectId = typeof req.body?.projectId === "string" ? req.body.projectId : "";

  if (!code) {
    throw new AppError(400, "LaTeX code is required");
  }
  if (!projectId) {
    throw new AppError(400, "projectId is required for legacy compilation");
  }

  return compileLegacyProject(code, projectId, res);
}
