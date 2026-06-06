/**
 * @module config/redis
 * @description ioredis connection singleton. Exports a shared Redis instance
 * for use across the application (caching, sessions, etc.).
 * BullMQ uses its own connection config from queue.js.
 */

const Redis = require('ioredis');
const { config } = require('./env');

/** @type {Redis} */
let redis;

if (!global.__redis) {
  global.__redis = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: true,
    retryStrategy(times) {
      if (times > 10) {
        console.error('❌ Redis: max retries reached, giving up');
        return null; // Stop retrying
      }
      const delay = Math.min(times * 200, 5000);
      console.warn(`⚠️  Redis: reconnecting in ${delay}ms (attempt ${times})`);
      return delay;
    },
    reconnectOnError(err) {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ECONNREFUSED'];
      return targetErrors.some((e) => err.message.includes(e));
    },
  });

  global.__redis.on('connect', () => {
    console.log('✅ Redis connected');
  });

  global.__redis.on('error', (err) => {
    console.error('❌ Redis error:', err.message);
  });

  global.__redis.on('close', () => {
    console.warn('⚠️  Redis connection closed');
  });
}

redis = global.__redis;

module.exports = { redis };
