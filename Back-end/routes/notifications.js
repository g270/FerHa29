const express = require('express');
const authenticate = require('../middleware/authentication');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

router.get('/', authenticate, notificationController.listNotifications);
router.put('/read-all', authenticate, notificationController.markAllNotificationsAsRead);
router.put('/:id/read', authenticate, notificationController.markNotificationAsRead);

module.exports = router;