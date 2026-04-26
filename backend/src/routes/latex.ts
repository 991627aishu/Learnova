import { Router } from "express";
import {
  compileLatex,
  createLatexDocument,
  getLatexDocument,
  updateLatexDocument,
  uploadLatexImage,
} from "../controllers/latexController.js";
import { authenticate, requireRole } from "../middlewares/auth.js";
import { latexUpload } from "../middlewares/latexUpload.js";

export const latexRouter = Router();

// Apply auth to all routes EXCEPT compile
latexRouter.post("/compile", compileLatex);

latexRouter.use(authenticate, requireRole("instructor", "admin"));

latexRouter.post("/create", createLatexDocument);
latexRouter.post("/upload-image", latexUpload.single("image"), uploadLatexImage);
latexRouter.get("/:id", getLatexDocument);
latexRouter.put("/:id", updateLatexDocument);
