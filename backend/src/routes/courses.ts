import { Router } from "express";
import * as coursesController from "../controllers/coursesController.js";
import { authenticate, optionalAuthenticate, requireRole, Role } from "../middlewares/auth.js";

export const courseRouter = Router();

courseRouter.get("/", optionalAuthenticate, coursesController.list);
courseRouter.get("/my-instructor", authenticate, requireRole("instructor", "admin" as Role), coursesController.listMyInstructor);
courseRouter.get("/:id", optionalAuthenticate, coursesController.getOne);
courseRouter.get("/:id/learn", optionalAuthenticate, coursesController.getStudentCourse);
courseRouter.get("/:id/ai-details", optionalAuthenticate, coursesController.getAIDetails);

courseRouter.post("/", authenticate, requireRole("instructor", "admin" as Role), coursesController.create);
courseRouter.post("/generate-ai", authenticate, requireRole("instructor", "admin" as Role), coursesController.generateAICourse);
courseRouter.post("/:id/generate-landing", authenticate, requireRole("instructor", "admin" as Role), coursesController.generateAILandingPage);
courseRouter.patch("/:id", authenticate, coursesController.update);
courseRouter.delete("/:id", authenticate, coursesController.remove);
