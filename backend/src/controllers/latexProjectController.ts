import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AppError } from "../middlewares/errorHandler.js";
import { AuthRequest } from "../middlewares/auth.js";

const prisma = new PrismaClient();

// Get all projects for the logged in user
export async function getProjects(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const projects = await prisma.latexProject.findMany({
    where: { ownerId: userId },
    include: {
      collaborators: { include: { user: { select: { id: true, firstName: true, email: true } } } }
    },
    orderBy: { updatedAt: 'desc' }
  });
  res.json({ success: true, projects });
}

// Create a new empty or templated project
export async function createProject(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const { title, lectureId } = req.body;

  if (!title) throw new AppError(400, "Project title is required");

  // Create project and root main.tex
  const project = await prisma.$transaction(async (tx) => {
    const p = await tx.latexProject.create({
      data: {
        title,
        ownerId: userId,
        lectureId: lectureId || null,
        files: {
          create: [
            {
              name: "main.tex",
              path: "/main.tex",
              isFolder: false,
              content: `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}

\\title{${title}}
\\author{Author Name}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}

\\end{document}`
            }
          ]
        }
      },
      include: { files: true }
    });
    return p;
  });

  res.status(201).json({ success: true, project });
}

// Fetch single project with entire file tree
export async function getProject(req: AuthRequest, res: Response) {
  const projectId = req.params.projectId;
  const project = await prisma.latexProject.findUnique({
    where: { id: projectId },
    include: { files: true, collaborators: true }
  });

  // Verify access (owner or collaborator)
  if (!project) throw new AppError(404, "Project not found");
  if (project.ownerId !== req.user!.id && !project.collaborators.some(c => c.userId === req.user!.id)) {
    throw new AppError(403, "Not authorized to access this project");
  }

  res.json({ success: true, project });
}

// Create a new logic file/folder inside a project
export async function createFile(req: AuthRequest, res: Response) {
  const projectId = req.params.projectId;
  const { path, name, isFolder, content } = req.body;

  if (!path || !name) throw new AppError(400, "Path and name are required");
  if (path.includes("..") || name.includes("..")) throw new AppError(400, "Invalid path: no directory traversal allowed");

  const file = await prisma.latexFile.create({
    data: {
      projectId,
      path,
      name,
      isFolder: !!isFolder,
      content: content || ""
    }
  });

  res.json({ success: true, file });
}

export async function deleteFile(req: AuthRequest, res: Response) {
  const projectId = req.params.projectId;
  const fileId = req.body.fileId || req.query.fileId as string;
  
  const file = await prisma.latexFile.findUnique({
    where: { id: fileId, projectId }
  });

  if (!file) {
    throw new AppError(404, "File not found");
  }

  // If it's a folder, delete all files that are inside this folder
  if (file.isFolder) {
    await prisma.latexFile.deleteMany({
      where: {
        projectId,
        path: {
          startsWith: `${file.path}/`
        }
      }
    });
  }

  // Delete the file/folder itself
  await prisma.latexFile.delete({
    where: { id: fileId }
  });

  res.json({ success: true });
}

export async function uploadFile(req: AuthRequest, res: Response) {
  const projectId = req.params.projectId;
  const pathField = req.body.path; // e.g., /images/logo.png

  console.log(`[Upload] Hit /files/upload for project ${projectId}`);
  console.log(`[Upload] File details:`, req.file);
  console.log(`[Upload] Body details:`, req.body);

  if (!req.file) {
    console.error("[Upload Error] No file uploaded.");
    throw new AppError(400, "No file uploaded.");
  }
  if (!pathField) {
    console.error("[Upload Error] Target path missing.");
    throw new AppError(400, "Target path is required.");
  }
  if (pathField.includes("..")) {
    console.error("[Upload Error] Directory traversal attempt:", pathField);
    throw new AppError(400, "Invalid path: no directory traversal allowed");
  }

  // For binaries or files stored locally, we store the s3Url as the local path
  const baseUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 3001}`;
  const localUrl = `${baseUrl}/uploads/latex/${req.file.filename}`;
  
  const basePathName = pathField.split('/').pop() || req.file.originalname;

  // upsert or create the new file
  const existingFile = await prisma.latexFile.findUnique({
    where: { projectId_path: { projectId, path: pathField } }
  });

  let file;
  try {
    if (existingFile) {
      file = await prisma.latexFile.update({
        where: { id: existingFile.id },
        data: {
          s3Url: localUrl,
          content: null // it's a binary/uploaded file
        }
      });
    } else {
      file = await prisma.latexFile.create({
        data: {
          projectId,
          name: basePathName,
          path: pathField,
          isFolder: false,
          s3Url: localUrl,
          content: null
        }
      });
    }
  } catch (err) {
    console.error("[Upload Error] Database saving failed:", err);
    throw new AppError(500, "Failed to save file metadata to database");
  }

  console.log(`[Upload] Success! File saved at: ${file.path}`);
  
  res.json({ 
    success: true, 
    file: {
      id: file.id,
      path: file.path,
      name: file.name,
      url: file.s3Url
    } 
  });
}

export async function renameFile(req: AuthRequest, res: Response) {
  const projectId = req.params.projectId;
  const { fileId, newName, newPath } = req.body;

  if (!fileId || !newName || !newPath) throw new AppError(400, "fileId, newName and newPath are required");
  if (newPath.includes("..") || newName.includes("..")) throw new AppError(400, "Invalid path: no directory traversal allowed");

  const file = await prisma.latexFile.findUnique({
    where: { id: fileId, projectId }
  });

  if (!file) throw new AppError(404, "File not found");

  const oldPath = file.path;

  await prisma.$transaction(async (tx) => {
    // 1. Update the file/folder itself
    await tx.latexFile.update({
      where: { id: fileId },
      data: { name: newName, path: newPath }
    });

    // 2. If it's a folder, recursively update children
    if (file.isFolder) {
      const children = await tx.latexFile.findMany({
        where: {
          projectId,
          path: { startsWith: `${oldPath}/` }
        }
      });

      for (const child of children) {
        const childNewPath = child.path.replace(oldPath, newPath);
        await tx.latexFile.update({
          where: { id: child.id },
          data: { path: childNewPath }
        });
      }
    }
  });

  // Fetch updated file to return
  const updatedFile = await prisma.latexFile.findUnique({
    where: { id: fileId }
  });

  res.json({ success: true, file: updatedFile });
}

export async function getProjectFilesTree(req: AuthRequest, res: Response) {
  const projectId = req.params.projectId;
  
  const project = await prisma.latexProject.findUnique({
    where: { id: projectId },
    include: { files: { select: { id: true, name: true, path: true, isFolder: true, updatedAt: true } }, collaborators: true }
  });

  if (!project) throw new AppError(404, "Project not found");
  if (project.ownerId !== req.user!.id && !project.collaborators.some(c => c.userId === req.user!.id)) {
    throw new AppError(403, "Not authorized to access this project");
  }

  res.json({ success: true, files: project.files });
}

export async function getFileContent(req: AuthRequest, res: Response) {
  const projectId = req.params.projectId;
  const fileId = req.query.fileId as string;

  if (!fileId) throw new AppError(400, "fileId is required in query");

  const project = await prisma.latexProject.findUnique({
    where: { id: projectId },
    include: { collaborators: true }
  });

  if (!project) throw new AppError(404, "Project not found");
  if (project.ownerId !== req.user!.id && !project.collaborators.some(c => c.userId === req.user!.id)) {
    throw new AppError(403, "Not authorized to access this project");
  }

  const file = await prisma.latexFile.findUnique({
    where: { id: fileId, projectId }
  });

  if (!file) throw new AppError(404, "File not found");

  res.json({ success: true, file });
}
