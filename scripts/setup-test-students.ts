const { PrismaClient, UserSex } = require("@prisma/client");
const { clerkClient } = require("@clerk/nextjs/server");
const fs = require("fs");
const path = require("path");

// Manually load .env
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf-8");
  envConfig.split(/\r?\n/).forEach((line: string) => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) return;
    const [key, ...valueParts] = trimmedLine.split("=");
    const value = valueParts.join("=");
    if (key && value) {
      process.env[key.trim()] = value.trim().replace(/^['"]|['"]$/g, "");
    }
  });
}

const prisma = new PrismaClient();
const clerk = clerkClient();

async function main() {
  console.log("Setting up test students (1-6)...");

  // Get grades
  const grades = await prisma.grade.findMany({
    orderBy: { level: "asc" },
  });

  const classes = await prisma.class.findMany();

  for (const grade of grades) {
    const username = `test_student_${grade.level}`;
    const password = `Password123!_${grade.level}`;
    const email = `test_stud_${grade.level}@example.com`;

    // Find class for this grade (1A, 2A, etc.)
    const classItem = classes.find((c: any) => c.name.startsWith(`${grade.level}`));

    if (!classItem) {
      console.log(`Class for grade ${grade.level} not found, skipping...`);
      continue;
    }

    try {
      console.log(`Processing student: ${username}`);

      // Check if student exists in Prisma
      let existingStudent = await prisma.student.findFirst({
        where: { username },
      });

      let clerkUserId: string;

      if (existingStudent) {
        console.log(`Student ${username} exists in Prisma.`);
        clerkUserId = existingStudent.id;
        await clerk.users.updateUser(clerkUserId, { password });
      } else {
        console.log(`Creating student ${username} in Clerk...`);
        try {
            const user = await clerk.users.createUser({
              username,
              password,
              firstName: "Test",
              lastName: `Student${grade.level}`,
              publicMetadata: { role: "student" },
            });
            clerkUserId = user.id;

            await prisma.student.create({
              data: {
                id: clerkUserId,
                username,
                name: "Test",
                surname: `Student${grade.level}`,
                email,
                phone: `999-010${grade.level}`,
                address: `Test Street ${grade.level}`,
                bloodType: "O+",
                sex: UserSex.MALE,
                gradeId: grade.id,
                classId: classItem.id,
                birthday: new Date(2015, 0, 1),
                parentId: "parentId1",
              },
            });
            console.log(`Successfully created ${username}`);
        } catch (clerkError: any) {
            console.error(`Clerk Error for ${username}:`, JSON.stringify(clerkError, null, 2));
            throw clerkError;
        }
      }
    } catch (error: any) {
      console.error(`Error processing ${username}:`, error.message);
    }
  }

  console.log("Setup completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
