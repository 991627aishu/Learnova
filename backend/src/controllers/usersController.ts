import { Response } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma.js";
import { AuthRequest } from "../middlewares/auth.js";
import { AppError } from "../middlewares/errorHandler.js";
import bcrypt from "bcryptjs";

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  avatar: z.string().url().nullable().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8)
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character")
    .optional(),
});

export async function getProfile(req: AuthRequest, res: Response) {
  if (!req.user) throw new AppError(401, "Unauthorized");
  console.log("GET PROFILE - User ID:", req.user.id);
  
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      avatar: true,
      role: true,
      createdAt: true,
    },
  });
  
  if (!user) throw new AppError(404, "User not found");
  
  console.log("GET PROFILE - Database result:", {
    userId: user.id,
    avatar: user.avatar,
    avatarIsNull: user.avatar === null,
    avatarType: typeof user.avatar
  });
  
  res.json({ success: true, user });
}

export async function updateProfile(req: AuthRequest, res: Response) {
  try {
    if (!req.user) throw new AppError(401, "Unauthorized");
    const data = updateSchema.parse(req.body);
    
    console.log("Profile update request:", {
      userId: req.user.id,
      updates: {
        firstName: data.firstName,
        lastName: data.lastName,
        avatar: data.avatar,
        hasNewPassword: !!data.newPassword
      }
    });
    
    if (data.newPassword && !data.currentPassword) {
      throw new AppError(400, "Current password required to set new password");
    }
    
    const update: Record<string, unknown> = {};
    if (data.firstName !== undefined) update.firstName = data.firstName;
    if (data.lastName !== undefined) update.lastName = data.lastName;
    if (data.avatar !== undefined) update.avatar = data.avatar;
    if (data.newPassword && data.currentPassword) {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (!user || !(await bcrypt.compare(data.currentPassword, user.passwordHash))) {
        throw new AppError(400, "Current password is incorrect");
      }
      update.passwordHash = await bcrypt.hash(data.newPassword, 12);
    }
    
    console.log("Applying updates to database:", update);
    console.log("User ID for update:", req.user.id);
    
    // Check if avatar is being set to null
    if (update.avatar === null) {
      console.log("SETTING AVATAR TO NULL IN DATABASE");
    }
    
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: update,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
      },
    });
    
    console.log("DATABASE UPDATE RESULT:", {
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      avatarIsNull: user.avatar === null
    });
    
    // VERIFY the update was actually written to database
    const verifyUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { avatar: true }
    });
    
    console.log("DATABASE VERIFICATION AFTER UPDATE:", {
      userId: req.user.id,
      avatarFromDB: verifyUser?.avatar,
      avatarIsNull: verifyUser?.avatar === null,
      avatarType: typeof verifyUser?.avatar
    });
    
    res.json({ success: true, user });
  } catch (error: any) {
    console.error("Profile update error:", error);
    throw error;
  }
}
