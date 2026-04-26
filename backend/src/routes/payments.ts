import { Router, Request, Response } from "express";
import { prisma } from "../utils/prisma.js";
import { AuthRequest } from "../middlewares/auth.js";
import { AppError } from "../middlewares/errorHandler.js";
import { authenticate } from "../middlewares/auth.js";
import Stripe from "stripe";
import { razorpay } from "../services/razorpayService.js";
import crypto from "crypto";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-01-27-acacia" as any,
});

export const paymentRouter = Router();

paymentRouter.post("/create-checkout-session", authenticate, async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError(401, "Unauthorized");
  const { courseId } = req.body;

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new AppError(404, "Course not found");
  if (course.price <= 0) throw new AppError(400, "Course is free");

  // Check if already paid
  const existingPayment = await prisma.payment.findFirst({
    where: { userId: req.user.id, courseId, status: "completed" }
  });
  if (existingPayment) return res.json({ success: true, message: "Already paid" });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: course.title,
            description: course.subtitle || undefined,
            images: course.thumbnail ? [course.thumbnail] : undefined,
          },
          unit_amount: Math.round(course.price * 100),
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${process.env.CLIENT_URL}/course/${courseId}?success=true`,
    cancel_url: `${process.env.CLIENT_URL}/course/${courseId}`,
    metadata: {
      userId: req.user.id,
      courseId: course.id,
    },
  });

  res.json({ success: true, url: session.url });
});

paymentRouter.post("/webhook", async (req: Request, res: Response) => {
  const signatureHeader = req.headers["stripe-signature"];
  const sig = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
  let event;

  if (!sig) {
    return res.status(400).send("Missing stripe-signature header");
  }

  try {
    const payload = (req as Request & { rawBody?: Buffer }).rawBody || req.body;
    event = stripe.webhooks.constructEvent(
      payload,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const courseId = session.metadata?.courseId;

    if (userId && courseId) {
      await prisma.$transaction(async (tx) => {
        // Create payment record
        await tx.payment.create({
          data: {
            userId,
            courseId,
            amount: session.amount_total ? session.amount_total / 100 : 0,
            currency: session.currency?.toUpperCase() || "USD",
            status: "completed",
            transactionId: session.id,
          },
        });

        // Create enrollment
        await tx.enrollment.create({
          data: {
            userId,
            courseId,
          },
        });
      });
    }
  }

  res.json({ received: true });
});

paymentRouter.get("/razorpay/key", authenticate, (req, res) => {
  res.json({ success: true, keyId: process.env.RAZORPAY_KEY_ID });
});

paymentRouter.post("/razorpay/create-order", authenticate, async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError(401, "Unauthorized");
  const { courseId } = req.body;

  try {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new AppError(404, "Course not found");
    if (course.price <= 0) throw new AppError(400, "Course is free");

    const options = {
      amount: Math.round(course.price * 100), // amount in the smallest currency unit
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        userId: req.user.id,
        courseId: course.id,
      },
    };

    const order = await razorpay.orders.create(options);
    res.json({ success: true, orderId: order.id, amount: order.amount, currency: order.currency });
  } catch (error: any) {
    console.error("Razorpay Create Order Error:", error);
    throw new AppError(500, error.message || "Failed to create Razorpay order");
  }
});

paymentRouter.post("/razorpay/verify", authenticate, async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError(401, "Unauthorized");
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courseId } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !courseId) {
    throw new AppError(400, "Missing required verification parameters");
  }

  try {
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      const course = await prisma.course.findUnique({ where: { id: courseId } });
      if (!course) throw new AppError(404, "Course not found");

      await prisma.$transaction(async (tx) => {
        // Check if enrollment already exists to avoid unique constraint violations
        const existingEnrollment = await tx.enrollment.findUnique({
          where: { userId_courseId: { userId: req.user!.id, courseId } }
        });

        if (!existingEnrollment) {
          // Create payment record
          await tx.payment.create({
            data: {
              userId: req.user!.id,
              courseId,
              amount: course.price,
              currency: "INR",
              status: "completed",
              transactionId: razorpay_payment_id,
            },
          });

          // Create enrollment
          await tx.enrollment.create({
            data: {
              userId: req.user!.id,
              courseId,
            },
          });
        }
      });

      res.json({ success: true, message: "Payment verified successfully" });
    } else {
      console.error("[RAZORPAY] Signature mismatch");
      throw new AppError(400, "Invalid signature sent!");
    }
  } catch (error: any) {
    console.error("Razorpay Verify Error:", error);
    if (error instanceof AppError) throw error;
    throw new AppError(500, error.message || "Failed to verify Razorpay payment");
  }
});

paymentRouter.get("/my-payments", authenticate, async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError(401, "Unauthorized");
  const payments = await prisma.payment.findMany({
    where: { userId: req.user.id },
    include: { course: { select: { title: true, thumbnail: true } } },
    orderBy: { createdAt: "desc" }
  });
  res.json({ success: true, payments });
});
