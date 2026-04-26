import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("password123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@lms.dev" },
    update: {},
    create: {
      email: "admin@lms.dev",
      passwordHash: hash,
      firstName: "Admin",
      lastName: "User",
      role: "admin",
    },
  });
  const instructor = await prisma.user.upsert({
    where: { email: "instructor@lms.dev" },
    update: {},
    create: {
      email: "instructor@lms.dev",
      passwordHash: hash,
      firstName: "Instructor",
      lastName: "Demo",
      role: "instructor",
    },
  });
  const student = await prisma.user.upsert({
    where: { email: "student@lms.dev" },
    update: {},
    create: {
      email: "student@lms.dev",
      passwordHash: hash,
      firstName: "Student",
      lastName: "Demo",
      role: "student",
    },
  });

  const categories = [
    // Tech & Programming
    "Programming Fundamentals", "Web Development", "Frontend Development", "Backend Development", 
    "Full Stack Development", "Mobile App Development", "DevOps", "Cloud Computing", "Cybersecurity", "Blockchain",
    // AI
    "Artificial Intelligence", "Machine Learning", "Deep Learning", "Neural Networks", "Computer Vision", 
    "Natural Language Processing", "Reinforcement Learning",
    // Generative AI
    "Generative AI", "Prompt Engineering", "Large Language Models", "AI Agents", "AI Automation", "AI Content Creation",
    // Data & Analytics
    "Data Science", "Data Analysis", "Big Data", "Data Engineering", "SQL", "Statistics", "Data Visualization",
    // Math for AI
    "Linear Algebra", "Probability & Statistics", "Calculus for Machine Learning",
    // Design & Creative
    "UI/UX Design", "Graphic Design", "Animation", "Video Editing", "Photography",
    // Business
    "Entrepreneurship", "Marketing", "Finance", "Management"
  ];

  let cat1;
  for (const name of categories) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const cat = await prisma.category.upsert({
      where: { slug },
      update: {},
      create: { name, slug, description: name },
    });
    if (slug === 'web-development') cat1 = cat;
  }

  // Seed some mock courses
  const mockCourses = [
    {
      title: "Complete Web Development Bootcamp",
      subtitle: "Learn HTML, CSS, JavaScript, React, and Node.js from scratch.",
      description: "This comprehensive course takes you from zero to hero in web development. You will build real-world projects and master modern tools used by industry professionals.",
      price: 19.99,
      difficulty: "beginner",
      language: "en",
      status: "published",
      instructorId: instructor.id,
      categoryId: cat1?.id,
      thumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=60"
    },
    {
      title: "Advanced Machine Learning with Python",
      subtitle: "Master deep learning, neural networks, and predictive modeling.",
      description: "Dive deep into the world of AI and Machine Learning. This course covers advanced algorithms and their implementation using Python and popular libraries like TensorFlow and PyTorch.",
      price: 49.99,
      difficulty: "advanced",
      language: "en",
      status: "published",
      instructorId: instructor.id,
      thumbnail: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&auto=format&fit=crop&q=60"
    },
    {
      title: "UI/UX Design Masterclass",
      subtitle: "Create stunning user interfaces and great user experiences.",
      description: "Learn the principles of design, color theory, typography, and how to use tools like Figma to create professional UI/UX designs for web and mobile apps.",
      price: 29.99,
      difficulty: "intermediate",
      language: "en",
      status: "published",
      instructorId: instructor.id,
      thumbnail: "https://images.unsplash.com/photo-1586717791821-3f44a563dc4c?w=800&auto=format&fit=crop&q=60"
    }
  ];

  for (const courseData of mockCourses) {
    await prisma.course.upsert({
      where: { id: `mock-${courseData.title.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `mock-${courseData.title.toLowerCase().replace(/\s+/g, '-')}`,
        ...courseData
      }
    });
  }

  console.log("Seed done:", { admin: admin.email, instructor: instructor.email, student: student.email });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
