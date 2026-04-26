import { Router } from "express";
import * as certController from "../controllers/certificateController.js";
import { authenticate } from "../middlewares/auth.js";

export const certificateRouter = Router();

certificateRouter.get("/my", authenticate, certController.getMyCertificates);
certificateRouter.get("/:courseId", authenticate, certController.generateCertificate);
certificateRouter.post("/course/:courseId/generate", authenticate, certController.generateCertificate);
