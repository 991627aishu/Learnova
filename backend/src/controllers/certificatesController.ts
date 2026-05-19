import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.js';
import { PremiumCertificateService } from '../services/premiumCertificateService.js';
import { prisma } from '../utils/prisma.js';

const certificateService = new PremiumCertificateService();

export const generateCertificate = async (req: AuthRequest, res: Response) => {
  try {
    console.log("🔥 CONTROLLER HIT - GENERATE CERTIFICATE");
    
    const { courseId } = req.body;
    const userId = req.user?.id;
    
    console.log("🔥 GENERATE CERTIFICATE REQUEST:", { courseId, userId });

    if (!courseId || !userId) {
      return res.status(400).json({ error: 'Course ID and user ID are required' });
    }

    // Find enrollment for this user and course with instructor info
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId: userId,
        courseId: courseId,
        completedAt: { not: null }
      },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true }
        },
        course: {
          include: {
            instructor: {
              select: { firstName: true, lastName: true }
            }
          }
        }
      }
    });

    if (!enrollment) {
      return res.status(404).json({ error: 'Completed enrollment not found' });
    }

    // Get the actual course instructor
    console.log("🔥 GENERATE CERTIFICATE - COURSE DATA:", enrollment.course);
    console.log("🔥 GENERATE CERTIFICATE - INSTRUCTOR DATA:", enrollment.course.instructor);
    console.log("🔥 GENERATE CERTIFICATE - INSTRUCTOR ID:", enrollment.course.instructorId);
    
    let instructorName = 'Course Instructor';
    
    // Try to get instructor from relationship first
    if (enrollment.course.instructor) {
      instructorName = `${enrollment.course.instructor.firstName} ${enrollment.course.instructor.lastName}`;
    } 
    // Fallback: query instructor directly if relationship is null
    else if (enrollment.course.instructorId) {
      console.log("🔥 INSTRUCTOR RELATIONSHIP NULL, QUERYING DIRECTLY FOR ID:", enrollment.course.instructorId);
      const instructor = await prisma.user.findUnique({
        where: { id: enrollment.course.instructorId },
        select: { firstName: true, lastName: true }
      });
      if (instructor) {
        instructorName = `${instructor.firstName} ${instructor.lastName}`;
        console.log("🔥 FOUND INSTRUCTOR VIA DIRECT QUERY:", instructorName);
      }
    }
    
    console.log("🔥 GENERATE CERTIFICATE - FINAL INSTRUCTOR NAME:", instructorName);

    // Generate certificate
    const pdfBuffer = await certificateService.generateCertificate({
      studentName: `${enrollment.user.firstName} ${enrollment.user.lastName}`,
      courseTitle: enrollment.course.title,
      instructorName: instructorName,
      completionDate: enrollment.completedAt! // We already checked it's not null
    });

    // Set headers for download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate-${enrollment.id}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);

  } catch (error) {
    console.error('🔥 CERTIFICATE GENERATE ERROR:', error);
    res.status(500).json({ error: 'Failed to generate certificate' });
  }
};

export const downloadCertificate = async (req: AuthRequest, res: Response) => {
  try {
    console.log("🔥 CONTROLLER HIT - DOWNLOAD CERTIFICATE");
    
    const { id } = req.params;
    const userId = req.user?.id;
    
    console.log("🔥 DOWNLOAD CERTIFICATE REQUEST:", { id, userId });

    // Get enrollment with related data including instructor
    const enrollment = await prisma.enrollment.findUnique({
      where: { id },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true }
        },
        course: {
          include: {
            instructor: {
              select: { firstName: true, lastName: true }
            }
          }
        }
      }
    });

    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    // Check if the enrollment belongs to the authenticated user
    if (enrollment.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!enrollment.completedAt) {
      return res.status(400).json({ error: 'Course not completed' });
    }

    // Get the actual course instructor
    console.log("🔥 DOWNLOAD CERTIFICATE - COURSE DATA:", enrollment.course);
    console.log("🔥 DOWNLOAD CERTIFICATE - INSTRUCTOR DATA:", enrollment.course.instructor);
    console.log("🔥 DOWNLOAD CERTIFICATE - INSTRUCTOR ID:", enrollment.course.instructorId);
    
    let instructorName = 'Course Instructor';
    
    // Try to get instructor from relationship first
    if (enrollment.course.instructor) {
      instructorName = `${enrollment.course.instructor.firstName} ${enrollment.course.instructor.lastName}`;
    } 
    // Fallback: query instructor directly if relationship is null
    else if (enrollment.course.instructorId) {
      console.log("🔥 DOWNLOAD CERTIFICATE - INSTRUCTOR RELATIONSHIP NULL, QUERYING DIRECTLY FOR ID:", enrollment.course.instructorId);
      const instructor = await prisma.user.findUnique({
        where: { id: enrollment.course.instructorId },
        select: { firstName: true, lastName: true }
      });
      if (instructor) {
        instructorName = `${instructor.firstName} ${instructor.lastName}`;
        console.log("🔥 DOWNLOAD CERTIFICATE - FOUND INSTRUCTOR VIA DIRECT QUERY:", instructorName);
      }
    }
    
    console.log("🔥 DOWNLOAD CERTIFICATE - FINAL INSTRUCTOR NAME:", instructorName);

    // Generate certificate
    const pdfBuffer = await certificateService.generateCertificate({
      studentName: `${enrollment.user.firstName} ${enrollment.user.lastName}`,
      courseTitle: enrollment.course.title,
      instructorName: instructorName,
      completionDate: enrollment.completedAt
    });

    // Set headers for download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate-${enrollment.id}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);

  } catch (error) {
    console.error('🔥 CERTIFICATE DOWNLOAD ERROR:', error);
    res.status(500).json({ error: 'Failed to generate certificate' });
  }
};

export const previewCertificate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    console.log("🔥 PREVIEW CERTIFICATE REQUEST:", id);

    // Get enrollment with related data
    const enrollment = await prisma.enrollment.findUnique({
      where: { id },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true }
        },
        course: {
          select: { title: true }
        }
      }
    });

    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    if (!enrollment.completedAt) {
      return res.status(400).json({ error: 'Course not completed' });
    }

    // Get instructor name
    const instructor = await prisma.user.findFirst({
      where: { role: 'INSTRUCTOR' },
      select: { firstName: true, lastName: true }
    });

    const instructorName = instructor ? `${instructor.firstName} ${instructor.lastName}` : 'Course Instructor';

    // Generate certificate
    const pdfBuffer = await certificateService.generateCertificate({
      studentName: `${enrollment.user.firstName} ${enrollment.user.lastName}`,
      courseTitle: enrollment.course.title,
      instructorName: instructorName,
      completionDate: enrollment.completedAt
    });

    // Set headers for preview
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="certificate-${enrollment.id}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);

  } catch (error) {
    console.error('🔥 CERTIFICATE PREVIEW ERROR:', error);
    res.status(500).json({ error: 'Failed to generate certificate' });
  }
};

export const getCertificateInfo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    console.log("🔥 GET CERTIFICATE INFO:", id);

    const enrollment = await prisma.enrollment.findUnique({
      where: { id },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true }
        },
        course: {
          select: { title: true, description: true }
        }
      }
    });

    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    if (!enrollment.completedAt) {
      return res.status(400).json({ error: 'Course not completed' });
    }

    res.json({
      id: enrollment.id,
      studentName: `${enrollment.user.firstName} ${enrollment.user.lastName}`,
      courseTitle: enrollment.course.title,
      courseDescription: enrollment.course.description,
      completedAt: enrollment.completedAt,
      certificateAvailable: true
    });

  } catch (error) {
    console.error('🔥 CERTIFICATE INFO ERROR:', error);
    res.status(500).json({ error: 'Failed to get certificate info' });
  }
};
