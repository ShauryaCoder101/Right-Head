require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
  const candidates = await p.candidate.findMany({
    where: { parsedData: { not: null } },
    select: { id: true, name: true, email: true, parsedData: true },
  });
  console.log('Parsed candidates:', candidates.length);
  candidates.forEach(c => {
    console.log('-', c.name, c.email, 'skills:', c.parsedData?.skills?.length || 0);
  });
  await p.$disconnect();
}
check().catch(e => { console.error(e.message); p.$disconnect(); });
