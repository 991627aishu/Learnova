import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = "nskomala777@gmail.com";
  const user = await prisma.user.findUnique({
    where: { email },
  });
  
  if (user) {
    console.log("USER FOUND:");
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
    console.log(`Password Hash: ${user.password.substring(0, 15)}...`);
  } else {
    console.log(`USER NOT FOUND: ${email}`);
    
    // Print all users to see if there's a typo
    console.log("\nListing all users in database:");
    const allUsers = await prisma.user.findMany({ select: { id: true, email: true, role: true }});
    allUsers.forEach(u => console.log(`- ${u.email} (${u.role})`));
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
