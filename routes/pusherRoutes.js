const express = require('express');
const router = express.Router();
const {
    getPusherSetting,
    savePusherSetting,
    togglePusherStatus
} = require('../controllers/pusherController');
const { protect } = require('../middleware/authMiddleware');

// ✅ FIX: Added GET route — frontend needs this to load existing config on mount
router.get('/get', protect,  getPusherSetting);

// Save / update Pusher keys
router.post('/save', protect,  savePusherSetting);

// Toggle Pusher ON/OFF
router.put('/toggle', protect, togglePusherStatus);

module.exports = router;