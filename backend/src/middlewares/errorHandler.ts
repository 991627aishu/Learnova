import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, error: err.message });
  }

  // Handle specific Prisma/Connection errors for better UX
  const message = err.message || "";
  if (message.includes("ECONNREFUSED") || message.includes("Can't reach database")) {
    return res.status(503).json({ 
      success: false, 
      error: "Backend not running or Database unreachable. Please wait a moment and try again." 
    });
  }

  if (message.includes("PrismaClientInitializationError") || message.includes("EPERM")) {
    return res.status(500).json({ 
      success: false, 
      error: "Database initialization failed (File Permission Issue). The system is attempting to auto-recover." 
    });
  }

  console.error(err);
  return res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
  });
}
