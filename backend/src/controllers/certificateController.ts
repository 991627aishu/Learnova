import { Response } from "express";
import { prisma } from "../utils/prisma.js";
import { AuthRequest } from "../middlewares/auth.js";
import { AppError } from "../middlewares/errorHandler.js";
import { compileLatexLocally } from "../services/latexCompileService.js";
import { v4 as uuidv4 } from "uuid";

import { generateCertificateContent } from "../services/aiService.js";
import { generateCertificateHtml, generatePdf } from "../services/certificateService.js";

export async function generateCertificate(req: AuthRequest, res: Response) {
  if (!req.user) throw new AppError(401, "Unauthorized");
  const { courseId } = req.params;

  // 1. Check for existing cached certificate FIRST
  const existingCert = await prisma.certificate.findUnique({
    where: { userId_courseId: { userId: req.user.id, courseId } },
    include: {
      user: true,
      course: {
        include: { instructor: { select: { firstName: true, lastName: true } } }
      }
    }
  });

  let aiContent;
  let studentName = "";
  let courseName = "";
  let instructorName = "";
  let completionDate = "";
  const platformHeadName = "Mr. Shoeb Ahmad";

  if (existingCert && existingCert.certificateTitle && existingCert.certificateBody) {
    // Certificate already exists! Bypass enrollment check completely.
    console.log(`[CERT] Using cached certificate content for ${existingCert.user.firstName}`);
    aiContent = {
      certificateTitle: existingCert.certificateTitle,
      certificateBody: existingCert.certificateBody
    };
    studentName = `${existingCert.user.firstName} ${existingCert.user.lastName}`;
    courseName = existingCert.course.title;
    instructorName = `${existingCert.course.instructor.firstName} ${existingCert.course.instructor.lastName}`;
    completionDate = new Date(existingCert.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } else {
    // 2. If no certificate exists, verify enrollment and completion
    let enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: req.user.id, courseId } },
      include: { 
        course: {
          include: { instructor: { select: { firstName: true, lastName: true } } }
        }, 
        user: true,
        progress: true 
      }
    });

    if (!enrollment) throw new AppError(404, "Enrollment not found");

    // CRITICAL FIX: If progress is 100% but isCompleted is false, fix it on the fly
    const currentPercent = enrollment.progress?.percent || 0;
    if (currentPercent === 100 && !enrollment.isCompleted) {
      console.log(`[CERT_FIX] Fixing completion state for user ${req.user.id} on course ${courseId}`);
      enrollment = await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: { isCompleted: true, completedAt: new Date() },
        include: { 
          course: { include: { instructor: { select: { firstName: true, lastName: true } } } }, 
          user: true, 
          progress: true 
        }
      });
    }

    if (!enrollment.isCompleted) {
      console.warn(`[CERT_DENIED] User ${req.user.id} attempted cert download for ${courseId}. Progress: ${currentPercent}%`);
      throw new AppError(400, `Course not completed yet (${currentPercent}% progress required)`);
    }

    studentName = `${enrollment.user.firstName} ${enrollment.user.lastName}`;
    courseName = enrollment.course.title;
    instructorName = `${enrollment.course.instructor.firstName} ${enrollment.course.instructor.lastName}`;
    completionDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // 3. Generate AI Content since it doesn't exist yet
    console.log(`[CERT] Generating AI content for ${studentName} - ${courseName}`);
    aiContent = await generateCertificateContent(studentName, courseName, completionDate);
    
    // 4. Save to DB
    await prisma.certificate.upsert({
      where: { userId_courseId: { userId: req.user.id, courseId } },
      update: { 
        issuedAt: new Date(),
        certificateTitle: aiContent.certificateTitle,
        certificateBody: aiContent.certificateBody
      },
      create: {
        certificateId: `CERT-${uuidv4().split('-')[0].toUpperCase()}-${Date.now().toString().slice(-4)}`,
        userId: req.user.id,
        courseId: courseId,
        certificateTitle: aiContent.certificateTitle,
        certificateBody: aiContent.certificateBody,
        issuedAt: new Date(),
      }
    });
  }

  // 5. Generate HTML and PDF
  console.log(`[CERT] Converting HTML to PDF...`);
  const htmlContent = generateCertificateHtml({
    studentName,
    courseName,
    instructorName,
    platformHeadName,
    completionDate,
    certificateTitle: aiContent.certificateTitle,
    certificateBody: aiContent.certificateBody
  });

  try {
    const pdfBuffer = await generatePdf(htmlContent);

    // 6. Return PDF as downloadable file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Certificate_${courseName.replace(/\s+/g, '_')}.pdf"`);
    res.send(pdfBuffer);
  } catch (pdfErr: any) {
    console.error(`[CERT] PDF Generation Failed:`, pdfErr);
    throw new AppError(500, `PDF generation failed: ${pdfErr.message}. Ensure Chromium/Puppeteer is installed correctly.`);
  }
}

export async function getMyCertificates(req: AuthRequest, res: Response) {
  if (!req.user) throw new AppError(401, "Unauthorized");
  const certificates = await prisma.certificate.findMany({
    where: { userId: req.user.id },
    include: { course: { select: { id: true, title: true, thumbnail: true } } },
    orderBy: { issuedAt: "desc" }
  });
  res.json({ success: true, certificates });
}
