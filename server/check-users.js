require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

p.user.findMany({ select: { email: true, name: true, role: true, createdAt: true } })
  .then(users => {
    console.log(JSON.stringify(users, null, 2));
    p.$disconnect();
  });
