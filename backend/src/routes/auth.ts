import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as authController from "../controllers/authController.js";
import { authenticate } from "../middlewares/auth.js";

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === "production" ? 5 : 50, // 5 attempts per minute max
  message: { success: false, error: "Too many attempts, try again in 60 seconds" },
  statusCode: 429
});

authRouter.post("/register", authController.register);
authRouter.post("/login", loginLimiter, authController.login);
authRouter.get("/me", authenticate, authController.me);
authRouter.post("/forgot-password", authController.forgotPassword);
authRouter.post("/reset-password", authController.resetPassword);
