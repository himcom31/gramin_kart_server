// routes/user.routes.js
const express = require('express');
const router  = express.Router();
const upload = require('../../config/cloudinary');

const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
} = require('../../controllers/User/UserController');

const { protectUser } = require('../../middleware/authMiddleware');


// ── Public Routes ────────────────────────────────────
// POST /api/user/register   → Create new account
// POST /api/user/login      → Login with email/phone + password
router.post('/register', register);
router.post('/login',    login);


// ── Protected Routes (JWT required) ─────────────────
// GET  /api/user/me                → Get logged-in user profile
// PUT  /api/user/update-profile    → Update name, country, phone, avatar
// PUT  /api/user/change-password   → Change password
router.get('/me',              protectUser, getMe);
router.put('/update-profile',  protectUser,upload.single('image'), updateProfile);
router.put('/change-password', protectUser, changePassword);




module.exports = router;