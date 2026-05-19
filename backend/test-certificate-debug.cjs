const { PrismaClient } = require('./src/generated/client');

const prisma = new PrismaClient();

async function testCertificateInstructor() {
  try {
    console.log("🔥 Testing certificate instructor data...");
    
    // Get a sample enrollment with course and instructor
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        completedAt: { not: null }
      },
      include: {
        user: true,
        course: {
          include: {
            instructor: true
          }
        }
      }
    });

    if (!enrollment) {
      console.log("❌ No completed enrollment found");
      return;
    }

    console.log("✅ Found enrollment:", {
      courseId: enrollment.course.id,
      courseTitle: enrollment.course.title,
      instructorId: enrollment.course.instructorId,
      instructor: enrollment.course.instructor,
      studentName: `${enrollment.user.firstName} ${enrollment.user.lastName}`
    });

    // Test direct instructor lookup
    if (enrollment.course.instructorId) {
      const directInstructor = await prisma.user.findUnique({
        where: { id: enrollment.course.instructorId },
        select: { firstName: true, lastName: true }
      });
      console.log("🔥 Direct instructor lookup:", directInstructor);
    }

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testCertificateInstructor();
