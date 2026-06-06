const { prisma } = require('../../config/database');

/**
 * Create an in-app notification
 * @param {object} data
 * @param {string} data.userId - Recipient user ID
 * @param {string} data.type - Notification type (BATCH_COMPLETE, SCORING_DONE, ENRICHMENT_DONE, DATA_DELETION, SYSTEM)
 * @param {string} data.title - Notification title
 * @param {string} data.message - Notification body
 * @param {string} [data.link] - Optional link to navigate to
 * @returns {Promise<object>} Created notification
 */
async function createNotification({ userId, type, title, message, link }) {
  return prisma.notification.create({
    data: { userId, type, title, message, link, read: false },
  });
}

/**
 * Get paginated notifications for a user
 * @param {string} userId
 * @param {number} [page=1]
 * @param {number} [limit=20]
 * @returns {Promise<{notifications: object[], total: number, unreadCount: number}>}
 */
async function getNotifications(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, read: false } }),
  ]);

  return { notifications, total, unreadCount };
}

/**
 * Mark a notification as read
 * @param {string} id - Notification ID
 * @param {string} userId - User ID (for ownership check)
 */
async function markRead(id, userId) {
  return prisma.notification.updateMany({
    where: { id, userId },
    data: { read: true },
  });
}

/**
 * Mark all notifications as read for a user
 * @param {string} userId
 */
async function markAllRead(userId) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}

module.exports = { createNotification, getNotifications, markRead, markAllRead };
