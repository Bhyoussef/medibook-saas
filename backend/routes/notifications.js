import express from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  cleanupExpiredNotifications,
  getNotificationStats
} from '../controllers/notificationController.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Notification routes
router.get('/user/:userId', getUserNotifications);
router.get('/unread-count', getUnreadCount);
router.get('/stats', getNotificationStats);
router.put('/:id/read', markAsRead);
router.put('/read-all', markAllAsRead);
router.delete('/:id', deleteNotification);
router.delete('/cleanup-expired', cleanupExpiredNotifications);

export default router;
