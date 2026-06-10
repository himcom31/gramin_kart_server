const express = require('express');
const router = express.Router();
const passport = require('passport');
const {
    getAllSocialSettings,
    saveSocialSetting,
    toggleSocialStatus,
} = require('../controllers/dependenceController/socialAuthController');
const { protect } = require('../middleware/authMiddleware');

// ── Admin panel routes ────────────────────────────────────────────────────────
router.get('/all',                protect, getAllSocialSettings);
router.post('/save',              protect, saveSocialSetting);
router.patch('/toggle/:provider', protect, toggleSocialStatus);

// ── Google OAuth flow ─────────────────────────────────────────────────────────
router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login', session: false }),
    (req, res) => {
        // Generate JWT here and send to frontend
        res.json({
            success: true,
            user: req.user,
            message: 'Google login successful',
        });
    }
);

module.exports = router;