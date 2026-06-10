const jwt   = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User  = require('../models/User/User');

/* ── protect ─────────────────────────────────────────────────────────────────
   Used on routes that can be hit by either admin or user.
   Attaches req.user from the correct table based on token role.
────────────────────────────────────────────────────────────────────────────── */
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            if (decoded.role === 'admin') {
                req.user = await Admin.findById(decoded.id);
            } else {
                req.user = await User.findById(decoded.id);
            }

            if (req.user) delete req.user.password;

            if (!req.user) {
                return res.status(401).json({ message: 'User not found' });
            }

            next();
        } catch (error) {
            console.error('protect middleware error:', error.message);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

/* ── isAdmin ─────────────────────────────────────────────────────────────────
   Must be used after protect. Blocks non-admins.
────────────────────────────────────────────────────────────────────────────── */
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied: Admin only' });
    }
};

/* ── protectUser ─────────────────────────────────────────────────────────────
   Used on user-only routes. Verifies token, checks isActive.
────────────────────────────────────────────────────────────────────────────── */
const protectUser = async (req, res, next) => {
    try {
        let token;

        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer ')
        ) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized. No token provided.',
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User belonging to this token no longer exists.',
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Your account has been deactivated. Please contact support.',
            });
        }

        delete user.password;

        req.user = user;

        // Debug log — remove once confirmed working

        next();

    } catch (error) {
        console.error('protectUser error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ success: false, message: 'Invalid token.' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token has expired. Please login again.' });
        }
        return res.status(500).json({ success: false, message: 'Server error during authentication.' });
    }
};

/* ── protectDriver ───────────────────────────────────────────────────────────
   Used on driver-only routes. Reads role: 'driver' from JWT.
────────────────────────────────────────────────────────────────────────────── */
const protectDriver = async (req, res, next) => {
    try {
        let token;

        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer ')
        ) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ success: false, message: 'No token provided.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role !== 'driver') {
            return res.status(403).json({ success: false, message: 'Access denied: Drivers only.' });
        }

        const Driver = require('../models/Driver');
        const driver = await Driver.findById(decoded.id);

        if (!driver) {
            return res.status(401).json({ success: false, message: 'Driver not found.' });
        }

        if (!driver.isActive) {
            return res.status(403).json({ success: false, message: 'Your account has been deactivated.' });
        }

        delete driver.password;
        req.driver = driver;
        next();

    } catch (error) {
        console.error('protectDriver error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ success: false, message: 'Invalid token.' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token has expired.' });
        }
        return res.status(500).json({ success: false, message: 'Server error during authentication.' });
    }
};

// ✅ protectDriver is now exported (was missing before)
module.exports = { protect, isAdmin, protectUser, protectDriver };