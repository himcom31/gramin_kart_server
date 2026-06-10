const Admin  = require('../models/Admin');
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');

exports.login = async (req, res) => {
    const { email, password, role } = req.body;

    try {
        // Find by email AND role — prevents delivery boy logging into admin panel
        const user = await Admin.findOne({ email, role });

        if (!user) {
            return res.status(404).json({
                message: `User not found as ${role}. Please check your credentials.`
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid password" });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role, name: user.name },  // user.id not user._id
            process.env.JWT_SECRET,
            { expiresIn: '3d' }
        );

        res.status(200).json({
            success: true,
            token,
            user: {
                id:    user.id,    // integer, not ObjectId
                name:  user.name,
                email: user.email,
                role:  user.role,
            }
        });

    } catch (err) {
        console.error("Login Error:", err.message);
        res.status(500).json({ message: "Server Error", error: err.message });
    }
};