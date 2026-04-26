import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = "nskomala777@gmail.com";
  const password = "Komi@777";
  const hashedPassword = await bcrypt.hash(password, 12); // authService uses 12
  
  const user = await prisma.user.upsert({
    where: { email },
    update: { 
      passwordHash: hashedPassword, 
      role: "student",
      suspended: false
    },
    create: {
      email,
      passwordHash: hashedPassword,
      firstName: "Komala",
      lastName: "N S",
      role: "student"
    }
  });
  
  console.log("User successfully created/updated in database:");
  console.log(`Email: ${user.email}`);
  console.log(`Role: ${user.role}`);
  console.log(`Password Hash is set successfully.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
