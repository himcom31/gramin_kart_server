const express = require('express');
const router = express.Router();
const {
    getMailSetting,
    saveMailSetting,
    sendTestMail
} = require('../controllers/dependenceController/mailController');
const { protect } = require('../middleware/authMiddleware');

// ✅ FIX: Added GET route — frontend needs this to pre-fill the form on load
router.get('/get', protect,getMailSetting);

// Save / update mail configuration
router.post('/save', protect,  saveMailSetting);

// Send a test email
router.post('/test', protect,  sendTestMail);

module.exports = router;