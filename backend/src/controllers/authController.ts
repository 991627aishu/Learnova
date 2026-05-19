import { Response } from "express";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import * as authService from "../services/authService.js";
import { AuthRequest } from "../middlewares/auth.js";
import { AppError } from "../middlewares/errorHandler.js";

const prisma = new PrismaClient();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(["student", "instructor"]).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function register(req: AuthRequest, res: Response) {
  console.log("REGISTER BODY:", req.body);
  const data = registerSchema.parse(req.body);
  const result = await authService.register(data);
  res.status(201).json({ success: true, ...result });
}

export async function login(req: AuthRequest, res: Response) {
  console.log("LOGIN BODY:", req.body);
  console.log(await prisma.user.findMany());
  try {
    const { email, password } = loginSchema.parse(req.body);
    
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const result = await authService.login(email, password);
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error("LOGIN ERROR:", error);
    
    // If it's an AppError, it has a statusCode and message
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }

    // Default error
    res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
}

export async function me(req: AuthRequest, res: Response) {
  if (!req.user) throw new AppError(401, "Authentication required");
  const user = await authService.getMe(req.user.id);
  res.json({ success: true, user });
}

export async function forgotPassword(req: AuthRequest, res: Response) {
  console.log("🚨 FORGOT PASSWORD API HIT");
  console.log("EMAIL RECEIVED:", req.body.email);
  
  const { email } = z.object({ email: z.string().email() }).parse(req.body);
  const result = await authService.forgotPassword(email);
  res.json({ success: true, ...result });
}

export async function resetPassword(req: AuthRequest, res: Response) {
  const { token, password } = z.object({ token: z.string(), password: z.string().min(8) }).parse(req.body);
  const result = await authService.resetPassword(token, password);
  res.json({ success: true, ...result });
}
