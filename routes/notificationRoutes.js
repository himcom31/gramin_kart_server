/**
 * notificationRoutes.js
 *
 * Route map:
 * ──────────────────────────────────────────────────────────────────
 *  POST  /api/notifications/send-all    → broadcast via topic
 *  POST  /api/notifications/send-users  → targeted multicast
 *  GET   /api/notifications/all         → paginated history
 *  GET   /api/notifications/users       → users + token status
 * ──────────────────────────────────────────────────────────────────
 */

const express = require('express');
const router  = express.Router();

// Cloudinary multer middleware — only for routes that accept an image
const upload = require('../config/cloudinary');

const {
  sendToAll,
  sendToUsers,
  getAllNotifications,
  getUsersWithTokenStatus,
} = require('../controllers/notificationController');

const { protect} = require('../middleware/authMiddleware');

// Broadcast to all (topic send — no token loop needed)
router.post('/send-all',   protect,  upload.single('image'), sendToAll);

// Send to selected users (multicast — requires userIds in body)
router.post('/send-users', protect, upload.single('image'), sendToUsers);

// Notification history (paginated)
router.get('/all', protect, getAllNotifications);

// Fetch users with FCM token registration status
// ?platform=all|web|android|ios   &page=1   &limit=50
router.get('/users', protect,  getUsersWithTokenStatus);

module.exports = router;