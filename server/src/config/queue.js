/**
 * @module config/queue
 * @description BullMQ queue stubs. Queues only connect when Redis is available.
 * Without Redis, jobs are processed synchronously (inline) instead of queued.
 */

const { config } = require('./env');

/**
 * Parse REDIS_URL into BullMQ connection options.
 */
function parseRedisUrl(url) {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname || '127.0.0.1',
      port: parseInt(parsed.port, 10) || 6379,
      password: parsed.password || undefined,
      username: parsed.username || undefined,
    };
  } catch {
    return { host: '127.0.0.1', port: 6379 };
  }
}

const connection = {
  ...parseRedisUrl(config.REDIS_URL),
  maxRetriesPerRequest: null,
};

/**
 * Stub queue that logs warnings — used when Redis is not available.
 * The candidate/scoring controllers will process jobs inline instead.
 */
function createStubQueue(name) {
  return {
    name,
    add: async (jobName, data, opts) => {
      console.log(`📋 [${name}] Job "${jobName}" — will process inline (no Redis)`);
      return { id: 'inline-' + Date.now(), name: jobName, data };
    },
    addBulk: async (jobs) => {
      console.log(`📋 [${name}] Bulk add ${jobs.length} jobs — will process inline (no Redis)`);
      return jobs.map((j, i) => ({ id: 'inline-' + Date.now() + '-' + i, name: j.name, data: j.data }));
    },
    getJobCounts: async () => ({ waiting: 0, active: 0, completed: 0, failed: 0 }),
    close: async () => {},
  };
}

// Always use stubs — Redis queues are opt-in via the worker process
const parseQueue = createStubQueue('parse-resume');
const scoreQueue = createStubQueue('score-candidate');
const enrichQueue = createStubQueue('enrich-candidate');
const exportQueue = createStubQueue('export-results');

module.exports = {
  connection,
  parseQueue,
  scoreQueue,
  enrichQueue,
  exportQueue,
};
