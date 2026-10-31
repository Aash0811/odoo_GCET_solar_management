const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'DUMMY'`);
    console.log('Successfully executed ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS \'DUMMY\'');
  } catch (err) {
    console.error('Error altering enum:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();

