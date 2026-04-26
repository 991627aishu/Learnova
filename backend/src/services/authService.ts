import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/prisma.js";
import { AppError } from "../middlewares/errorHandler.js";
import { Role } from "../middlewares/auth.js";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || "7d";

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: Role;
}

export async function register(data: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new AppError(400, "Email already registered");
  const passwordHash = await bcrypt.hash(data.password, 12);
  const role = data.role || "student";
  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role,
    },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, avatar: true },
  });
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES } as jwt.SignOptions
  );
  return { user, token };
}

export async function login(email: string, password: string) {
  try {
    console.log(`[AUTH] Login attempt - connecting to DB...`);
    await prisma.$connect();
    console.log(`[AUTH] DB connected, searching for user: ${email}`);
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`[AUTH] User not found: ${email}`);
      throw new AppError(404, "User not found");
    }
    
    if (user.suspended) throw new AppError(403, "Account suspended");
    
    const valid = await bcrypt.compare(password, user.passwordHash);
    console.log(`[AUTH] Password comparison for ${email}: ${valid ? 'MATCH' : 'MISMATCH'}`);
    
    if (!valid) throw new AppError(401, "Incorrect password");
    
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES } as jwt.SignOptions
    );
    
    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
      },
      token,
    };
  } catch (error: any) {
    console.error(`[AUTH] LOGIN ERROR for ${email}:`, error);
    if (error instanceof AppError) throw error;
    throw new AppError(500, "Login failed. Please try again later.");
  }
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      avatar: true,
      createdAt: true,
    },
  });
  if (!user) throw new AppError(404, "User not found");
  return user;
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Return success even if user not found for security (prevent email enumeration)
    return { message: "If an account with that email exists, a reset link has been sent." };
  }

  // In a real app, generate a random token and send via email.
  // For this demo, we'll use a short-lived JWT.
  const token = jwt.sign(
    { userId: user.id, type: "password-reset" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  // MOCK EMAIL LOG
  console.log(`[AUTH] Password reset link for ${email}: ${process.env.CLIENT_URL}/reset-password?token=${token}`);
  
  return { message: "If an account with that email exists, a reset link has been sent." };
}

export async function resetPassword(token: string, newPassword: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string, type: string };
    if (decoded.type !== "password-reset") throw new Error("Invalid token type");

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: decoded.userId },
      data: { passwordHash }
    });

    return { message: "Password reset successful. You can now log in with your new password." };
  } catch (error) {
    throw new AppError(400, "Invalid or expired reset token.");
  }
}
