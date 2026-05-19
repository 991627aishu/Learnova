import { Router } from "express";
import * as resourceController from "../controllers/resourceController.js";
import { authenticate, requireRole, Role } from "../middlewares/auth.js";

export const resourceRouter = Router();

// Resource course routes
resourceRouter.post("/courses", authenticate, requireRole("instructor", "admin" as Role), resourceController.createResourceCourse);
resourceRouter.get("/courses/instructor", authenticate, requireRole("instructor", "admin" as Role), resourceController.getInstructorResourceCourses);
resourceRouter.get("/courses/:id", resourceController.getResourceCourse);

// Resource content routes
resourceRouter.post("/content/save", authenticate, requireRole("instructor", "admin" as Role), resourceController.saveResourceContent);
resourceRouter.get("/content/:courseId", resourceController.getResourceContent);
