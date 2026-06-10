const jwt = require('jsonwebtoken');
const User = require('../../models/User/User');

// ── Helper: generate JWT ──────────────────────────────────────────────────
const generateToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// ── Helper: strip sensitive fields ───────────────────────────────────────
const sanitizeUser = (user) => ({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    gender: user.gender,
    dateOfBirth: user.dateOfBirth,
    country: user.country,
    avatar: user.avatar,
    isActive: user.isActive,
    createdAt: user.createdAt,
});

// ── Register ──────────────────────────────────────────────────────────────
const register = async (req, res) => {
    try {
        const { fullName, country, phone, email, password } = req.body;

        if (!fullName || !country || !phone || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required: fullName, country, phone, email, password.',
            });
        }

        const emailExists = await User.findOne({ email: email.toLowerCase() });
        if (emailExists) {
            return res.status(409).json({
                success: false,
                message: 'An account with this email already exists.',
            });
        }

        const phoneExists = await User.findOne({ phone: phone.replace(/\D/g, '') });

        if (phoneExists) {
            return res.status(409).json({
                success: false,
                message: 'An account with this phone number already exists.',
            });
        }

        const user = await User.create({ fullName, country, phone: phone.replace(/\D/g, ''), email, password });

        const token = generateToken(user.id);

        return res.status(201).json({
            success: true,
            message: 'Account created successfully.',
            token,
            user: sanitizeUser(user),
        });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'Email or phone already exists.' });
        }
        console.error('Register error:', error);
        return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
};

// ── Login ─────────────────────────────────────────────────────────────────
const login = async (req, res) => {
    try {
        const { identifier, password } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email/phone and password are required.',
            });
        }

        const isEmail = identifier.includes('@');
        const filter = isEmail
            ? { email: identifier.toLowerCase().trim() }
            : { phone: identifier.replace(/\D/g, '') };
        // includePassword: true — password excluded by default in findOne
        const user = await User.findOne(filter, true);

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Your account has been deactivated. Please contact support.',
            });
        }

        const isMatch = await User.matchPassword(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const token = generateToken(user.id);

        return res.status(200).json({
            success: true,
            message: 'Logged in successfully.',
            token,
            user: sanitizeUser(user),
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
};

// ── Get Me ────────────────────────────────────────────────────────────────
const getMe = async (req, res) => {
    try {
        return res.status(200).json({ success: true, user: sanitizeUser(req.user) });
    } catch (error) {
        console.error('GetMe error:', error);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ── Update Profile ────────────────────────────────────────────────────────
const updateProfile = async (req, res) => {
    try {
        const { fullName, country, phone, gender, dateOfBirth } = req.body;

        // Only update avatar if a new file was actually uploaded
        const avatarUrl = req.file ? req.file.path : undefined;

        if (phone) {
            const taken = await User.phoneExistsForOtherUser(phone, req.user.id);
            if (taken) {
                return res.status(409).json({
                    success: false,
                    message: 'This phone number is already in use.',
                });
            }
        }

        const updateData = { fullName, country, phone, gender, dateOfBirth };
        if (avatarUrl) updateData.avatar = avatarUrl; // only overwrite if new file came in

        const updatedUser = await User.findByIdAndUpdate(req.user.id, updateData);

        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully.',
            user: sanitizeUser(updatedUser),
        });

    } catch (error) {
        console.error('UpdateProfile error:', error);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};
// ── Change Password ───────────────────────────────────────────────────────
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Both current and new password are required',
            });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters',
            });
        }
        if (currentPassword === newPassword) {
            return res.status(400).json({
                success: false,
                message: 'New password must be different from current password',
            });
        }

        // includePassword: true to get hash for comparison
        const user = await User.findById(req.user.id, true);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const isMatch = await User.matchPassword(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect',
            });
        }

        const hashedPassword = await User.hashPassword(newPassword);
        await User.findByIdAndUpdate(user.id, { password: hashedPassword });

        return res.status(200).json({ success: true, message: 'Password updated successfully' });

    } catch (err) {
        console.error('[PUT /api/user/change-password]', err.message);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = { register, login, getMe, updateProfile, changePassword };