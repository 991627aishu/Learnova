import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/prisma.js";
import { AppError } from "./errorHandler.js";

export type Role = "student" | "instructor" | "admin";

const JWT_SECRET = process.env.JWT_SECRET || "secret";

export interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
}

export interface AuthRequest extends Request {
  user?: { 
    id: string; 
    email: string; 
    role: Role;
    firstName: string;
    lastName: string;
  };
}

export async function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  console.log("TOKEN RECEIVED:", token);

  if (!token) {
    return next(new AppError(401, "Authentication required"));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, firstName: true, lastName: true, suspended: true },
    });
    if (!user || user.suspended) {
      return next(new AppError(401, "Invalid or suspended account"));
    }
    req.user = { 
      id: user.id, 
      email: user.email, 
      role: user.role as Role,
      firstName: user.firstName,
      lastName: user.lastName
    };
    next();
  } catch {
    next(new AppError(401, "Invalid token"));
  }
}

export async function optionalAuthenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, firstName: true, lastName: true, suspended: true },
    });
    if (user && !user.suspended) {
      req.user = { 
        id: user.id, 
        email: user.email, 
        role: user.role as Role,
        firstName: user.firstName,
        lastName: user.lastName
      };
    }
  } catch {}
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError(401, "Authentication required"));
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, "Insufficient permissions"));
    }
    next();
  };
}
