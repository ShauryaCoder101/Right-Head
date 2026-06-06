require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    await prisma.$connect();
    console.log('✅ DB connected!');
    const result = await prisma.$queryRawUnsafe('SELECT 1 as test');
    console.log('✅ Query OK:', result);
  } catch (e) {
    console.error('❌ DB error:', e.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

test();
