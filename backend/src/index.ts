import "dotenv/config";
import "express-async-errors";
import express from "express";
import cors from "cors";
import path from "path";
import rateLimit from "express-rate-limit";
import { authRouter } from "./routes/auth.js";
import { userRouter } from "./routes/users.js";
import { courseRouter } from "./routes/courses.js";
import { categoryRouter } from "./routes/categories.js";
import { sectionRouter } from "./routes/sections.js";
import { lectureRouter } from "./routes/lectures.js";
import { quizRouter } from "./routes/quizzes.js";
import { enrollmentRouter } from "./routes/enrollments.js";
import { reviewRouter } from "./routes/reviews.js";
import { wishlistRouter } from "./routes/wishlist.js";
import { adminRouter } from "./routes/admin.js";
import { uploadRouter } from "./routes/upload.js";
import { notesRouter } from "./routes/notes.js";
import { latexRouter } from "./routes/latex.js";
import { latexProjectsRouter } from "./routes/latexProjects.js";
import { analyticsRouter } from "./routes/analytics.js";
import { paymentRouter } from "./routes/payments.js";
import { certificateRouter } from "./routes/certificates.js";
import { avatarRouter } from "./routes/avatar.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { notFound } from "./middlewares/notFound.js";
import { createYjsServer } from "./ws/yjsServer.js";

const requiredEnv = ["DATABASE_URL", "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "OPENAI_API_KEY"];
requiredEnv.forEach((env) => {
  if (!process.env[env]) {
    console.warn(`[WARNING] Missing environment variable: ${env}. Some features may not work.`);
  }
});

const app = express();
const PORT = process.env.PORT || 5000;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 100 : 5000,
  message: { success: false, error: "Too many requests" },
});

app.use(limiter);
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));

// Special handling for Stripe Webhook (needs raw body)
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/users", avatarRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/quizzes", quizRouter);
app.use("/api/enrollments", enrollmentRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/wishlist", wishlistRouter);
app.use("/api/admin", adminRouter);
app.use("/api/courses/:courseId/sections", sectionRouter);
app.use("/api/sections/:sectionId/lectures", lectureRouter);
app.use("/api/lectures", lectureRouter);
app.use("/api/courses", courseRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/latex", latexRouter);
app.use("/api/latex-projects", latexProjectsRouter);
app.use("/api/lectures/:lectureId/notes", notesRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/certificates", certificateRouter);

app.use("/uploads", express.static(path.join(process.cwd(), process.env.UPLOAD_DIR || "uploads")));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use(notFound);
app.use(errorHandler);

try {
  const server = app.listen(PORT, () => {
    console.log(`[SUCCESS] Server running on http://localhost:${PORT}`);
    console.log("SERVER STARTED SUCCESSFULLY ON PORT 5000");
  });

  createYjsServer(server);
} catch (error) {
  console.error("[FATAL ERROR] Failed to start server:", error);
  process.exit(1);
}
