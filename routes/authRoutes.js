const express  = require('express');
const router   = express.Router();
const { login } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const Admin    = require('../models/Admin');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/register-admin
router.post('/register-admin', async (req, res) => {
    try {
        const salt           = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);

        const admin = await Admin.create({
            ...req.body,
            password: hashedPassword,
            role: 'admin',
        });

        const token = jwt.sign(
            { id: admin.id, role: admin.role },   // MySQL: id not _id
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.status(201).json({
            token,
            user: {
                id:     admin.id,                 // MySQL: id not _id
                name:   admin.name,
                email:  admin.email,
                role:   admin.role,
                mobile: admin.mobile,
            },
        });
    } catch (error) {
        console.error('Register Error:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Email or mobile already registered' });
        }
        res.status(500).json({ message: 'Registration failed', error: error.message });
    }
});

module.exports = router;