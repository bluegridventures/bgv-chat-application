import { prisma } from "./prisma.config";

const connectDatabase = async () => {
  try {
    await prisma.$connect();
    console.log("Database connection established via Prisma");
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
};

export default connectDatabase;
