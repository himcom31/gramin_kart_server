const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/businessController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// Get settings (Public or Admin)
router.get('/', getSettings);

// Update settings (Admin Only)
router.post('/update', protect, isAdmin, updateSettings);

module.exports = router;