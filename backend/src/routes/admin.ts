import { Router } from "express";
import * as adminController from "../controllers/adminController.js";
import { authenticate, requireRole, Role } from "../middlewares/auth.js";

export const adminRouter = Router();

adminRouter.use(authenticate, requireRole("admin" as Role));

adminRouter.get("/dashboard", adminController.dashboard);
adminRouter.get("/users", adminController.listUsers);
adminRouter.patch("/users/:id", adminController.updateUser);
adminRouter.get("/courses", adminController.listCoursesAdmin);
adminRouter.patch("/courses/:id/status", adminController.updateCourseStatus);
adminRouter.get("/reviews", adminController.listReviews);
adminRouter.patch("/reviews/:id/hide", adminController.hideReview);
adminRouter.get("/categories", adminController.listCategories);
adminRouter.post("/categories", adminController.createCategory);
adminRouter.patch("/categories/:id", adminController.updateCategory);
adminRouter.get("/analytics", adminController.adminAnalytics);
