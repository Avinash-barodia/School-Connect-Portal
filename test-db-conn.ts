import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Attempting to connect to database...");
    const adminCount = await prisma.admin.count();
    console.log("Connection successful!");
    console.log("Admin count:", adminCount);
  } catch (error) {
    console.error("Connection failed!");
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
