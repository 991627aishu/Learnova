import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { latexUpload } from "../middlewares/latexUpload.js";
import { 
  getProjects, 
  createProject, 
  getProject, 
  createFile, 
  deleteFile, 
  uploadFile, 
  renameFile,
  getProjectFilesTree,
  getFileContent
} from "../controllers/latexProjectController.js";

export const latexProjectsRouter = Router();

latexProjectsRouter.use(authenticate);

latexProjectsRouter.get("/", getProjects);
latexProjectsRouter.post("/", createProject);
latexProjectsRouter.get("/:projectId", getProject);

latexProjectsRouter.get("/:projectId/files/tree", getProjectFilesTree);
latexProjectsRouter.get("/:projectId/files/content", getFileContent);
latexProjectsRouter.post("/:projectId/files/create", createFile);
latexProjectsRouter.post("/:projectId/files/upload", latexUpload.single("file"), uploadFile);
latexProjectsRouter.patch("/:projectId/files/rename", renameFile);
latexProjectsRouter.delete("/:projectId/files/delete", deleteFile);
