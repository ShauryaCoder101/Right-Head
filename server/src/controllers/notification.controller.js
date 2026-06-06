const { getNotifications, markRead, markAllRead } = require('../services/notification/notification.service');

/**
 * GET /api/v1/notifications
 */
async function list(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const result = await getNotifications(req.user.id, page);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/notifications/:id/read
 */
async function markAsRead(req, res, next) {
  try {
    await markRead(req.params.id, req.user.id);
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/notifications/read-all
 */
async function markAllAsRead(req, res, next) {
  try {
    await markAllRead(req.user.id);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, markAsRead, markAllAsRead };
