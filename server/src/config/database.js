/**
 * @module config/database
 * @description Prisma client singleton with conditional logging.
 * Reuses a single PrismaClient across the application to prevent
 * connection pool exhaustion.
 */

const { PrismaClient } = require('@prisma/client');
const { config } = require('./env');

/** @type {PrismaClient} */
let prisma;

if (!global.__prisma) {
  global.__prisma = new PrismaClient({
    log:
      config.NODE_ENV === 'development'
        ? [
            { level: 'query', emit: 'event' },
            { level: 'error', emit: 'stdout' },
            { level: 'warn', emit: 'stdout' },
          ]
        : [{ level: 'error', emit: 'stdout' }],
  });

  // Log slow queries in development
  if (config.NODE_ENV === 'development') {
    global.__prisma.$on('query', (e) => {
      if (e.duration > 500) {
        console.warn(`⚠️  Slow query (${e.duration}ms):`, e.query);
      }
    });
  }
}

prisma = global.__prisma;

/**
 * Connect to the database.
 * @returns {Promise<void>}
 */
async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

/**
 * Disconnect from the database.
 * @returns {Promise<void>}
 */
async function disconnectDatabase() {
  await prisma.$disconnect();
  console.log('🔌 Database disconnected');
}

module.exports = { prisma, connectDatabase, disconnectDatabase };
