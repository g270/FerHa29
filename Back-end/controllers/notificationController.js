const { Notification } = require('../models');

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

exports.listNotifications = async (req, res, next) => {
  try {
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isNaN(requestedLimit)
      ? DEFAULT_LIMIT
      : Math.min(Math.max(requestedLimit, 1), MAX_LIMIT);

    const [items, unreadCount] = await Promise.all([
      Notification.findAll({
        where: { userId: req.userId },
        order: [['createdAt', 'DESC']],
        limit
      }),
      Notification.count({
        where: {
          userId: req.userId,
          isRead: false
        }
      })
    ]);

    res.json({ items, unreadCount });
  } catch (error) {
    next(error);
  }
};

exports.markNotificationAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notificación no encontrada' });
    }

    if (!notification.isRead) {
      await notification.update({ isRead: true });
    }

    res.json(notification);
  } catch (error) {
    next(error);
  }
};

exports.markAllNotificationsAsRead = async (req, res, next) => {
  try {
    await Notification.update(
      { isRead: true },
      {
        where: {
          userId: req.userId,
          isRead: false
        }
      }
    );

    res.json({ message: 'Notificaciones marcadas como leídas' });
  } catch (error) {
    next(error);
  }
};