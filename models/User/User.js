const { pool } = require('../../config/db');
const bcrypt   = require('bcryptjs');

const createUserTables = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            fullName    VARCHAR(255) NOT NULL,
            country     VARCHAR(100) NOT NULL,
            phone       VARCHAR(20)  NOT NULL UNIQUE,
            email       VARCHAR(255) NOT NULL UNIQUE,
            password    VARCHAR(255) NOT NULL,
            avatar      VARCHAR(500) DEFAULT NULL,
            gender      ENUM('Male','Female','Other','Prefer not to say','') DEFAULT '',
            dateOfBirth DATE         DEFAULT NULL,
            isActive    BOOLEAN      DEFAULT true,
            createdAt   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
            updatedAt   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS user_addresses (
            id        INT AUTO_INCREMENT PRIMARY KEY,
            user_id   INT          NOT NULL,
            name      VARCHAR(255) NOT NULL,
            phone     VARCHAR(20)  NOT NULL,
            altPhone  VARCHAR(20)  DEFAULT '',
            pincode   VARCHAR(20)  NOT NULL,
            state     VARCHAR(100) NOT NULL,
            city      VARCHAR(100) NOT NULL,
            house     VARCHAR(255) NOT NULL,
            road      VARCHAR(255) NOT NULL,
            landmark  VARCHAR(255) DEFAULT '',
            type      ENUM('Home','Work','Other') DEFAULT 'Home',
            isDefault BOOLEAN      DEFAULT false,
            createdAt TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS user_wishlist (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            user_id    INT NOT NULL,
            product_id INT NOT NULL,
            createdAt  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_wishlist (user_id, product_id),
            FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        )
    `);
};

createUserTables();

const User = {

    // ── Create user with hashed password ─────────────────────────────────
    create: async ({ fullName, country, phone, email, password }) => {
        const salt           = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const [result] = await pool.query(
            `INSERT INTO users (fullName, country, phone, email, password)
             VALUES (?, ?, ?, ?, ?)`,
            [fullName, country, phone.trim(), email.toLowerCase().trim(), hashedPassword]
        );
        const [rows] = await pool.query(`SELECT * FROM users WHERE id = ?`, [result.insertId]);
        return rows[0];
    },

    // ── Find one user by filters, optionally include password ─────────────
    findOne: async (filters = {}, includePassword = false) => {
        const keys   = Object.keys(filters);
        const where  = keys.map(k => `${k} = ?`).join(' AND ');
        const values = keys.map(k => filters[k]);

        const passwordField = includePassword ? ', password' : '';
        const [rows] = await pool.query(
            `SELECT id, fullName, country, phone, email, avatar, gender,
                    dateOfBirth, isActive, createdAt, updatedAt ${passwordField}
             FROM users WHERE ${where} LIMIT 1`,
            values
        );
        return rows[0] ?? null;
    },

    findById: async (id, includePassword = false) => {
        const passwordField = includePassword ? ', password' : '';
        const [rows] = await pool.query(
            `SELECT id, fullName, country, phone, email, avatar, gender,
                    dateOfBirth, isActive, createdAt, updatedAt ${passwordField}
             FROM users WHERE id = ? LIMIT 1`,
            [id]
        );
        if (!rows[0]) return null;

        // Attach addresses to user object
        const user = rows[0];
        user.address = await User.getAddresses(id);
        return user;
    },

    findByIdAndUpdate: async (id, data) => {
        const allowed = ['fullName','country','phone','avatar','gender','dateOfBirth','isActive','password'];
        const fields  = Object.keys(data).filter(f => allowed.includes(f));
        if (fields.length === 0) return await User.findById(id);

        const setClause = fields.map(f => `${f} = ?`).join(', ');
        const values    = fields.map(f => data[f]);

        await pool.query(`UPDATE users SET ${setClause} WHERE id = ?`, [...values, id]);
        return await User.findById(id);
    },

    // ── Check phone uniqueness excluding a specific user ──────────────────
    phoneExistsForOtherUser: async (phone, excludeId) => {
        const [rows] = await pool.query(
            `SELECT id FROM users WHERE phone = ? AND id != ? LIMIT 1`,
            [phone, excludeId]
        );
        return rows.length > 0;
    },

    // ── Instance-style password methods ───────────────────────────────────
    matchPassword: async (enteredPassword, hashedPassword) => {
        return bcrypt.compare(enteredPassword, hashedPassword);
    },

    hashPassword: async (password) => {
        const salt = await bcrypt.genSalt(10);
        return bcrypt.hash(password, salt);
    },

    // ── Address methods ───────────────────────────────────────────────────

    getAddresses: async (userId) => {
        const [rows] = await pool.query(
            `SELECT * FROM user_addresses WHERE user_id = ? ORDER BY isDefault DESC, id ASC`,
            [userId]
        );
        return rows;
    },

    addAddress: async (userId, data) => {
        const [[{ count }]] = await pool.query(
            `SELECT COUNT(*) AS count FROM user_addresses WHERE user_id = ?`, [userId]
        );

        const shouldBeDefault = data.isDefault || Number(count) === 0;

        if (shouldBeDefault) {
            await pool.query(
                `UPDATE user_addresses SET isDefault = false WHERE user_id = ?`, [userId]
            );
        }

        const [result] = await pool.query(`
            INSERT INTO user_addresses
                (user_id, name, phone, altPhone, pincode, state, city, house, road, landmark, type, isDefault)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            userId, data.name, data.phone, data.altPhone ?? '',
            data.pincode, data.state, data.city,
            data.house, data.road, data.landmark ?? '',
            data.type ?? 'Home', shouldBeDefault,
        ]);

        return await User.getAddresses(userId);
    },

    updateAddress: async (userId, addressId, data) => {
        // Verify ownership
        const [[addr]] = await pool.query(
            `SELECT * FROM user_addresses WHERE id = ? AND user_id = ? LIMIT 1`,
            [addressId, userId]
        );
        if (!addr) return null;

        if (data.isDefault && !addr.isDefault) {
            await pool.query(
                `UPDATE user_addresses SET isDefault = false WHERE user_id = ?`, [userId]
            );
        }

        await pool.query(`
            UPDATE user_addresses SET
                name = ?, phone = ?, altPhone = ?, pincode = ?, state = ?,
                city = ?, house = ?, road = ?, landmark = ?, type = ?,
                isDefault = ?
            WHERE id = ? AND user_id = ?
        `, [
            data.name, data.phone, data.altPhone ?? '',
            data.pincode, data.state, data.city,
            data.house, data.road, data.landmark ?? '',
            data.type ?? 'Home',
            data.isDefault && !addr.isDefault ? true : addr.isDefault,
            addressId, userId,
        ]);

        return await User.getAddresses(userId);
    },

    deleteAddress: async (userId, addressId) => {
        const [[addr]] = await pool.query(
            `SELECT * FROM user_addresses WHERE id = ? AND user_id = ? LIMIT 1`,
            [addressId, userId]
        );
        if (!addr) return null;

        await pool.query(`DELETE FROM user_addresses WHERE id = ?`, [addressId]);

        // Auto-promote next address to default if deleted one was default
        if (addr.isDefault) {
            await pool.query(`
                UPDATE user_addresses SET isDefault = true
                WHERE user_id = ? ORDER BY id ASC LIMIT 1
            `, [userId]);
        }

        return await User.getAddresses(userId);
    },

    setDefaultAddress: async (userId, addressId) => {
        const [[addr]] = await pool.query(
            `SELECT id FROM user_addresses WHERE id = ? AND user_id = ? LIMIT 1`,
            [addressId, userId]
        );
        if (!addr) return null;

        await pool.query(
            `UPDATE user_addresses SET isDefault = false WHERE user_id = ?`, [userId]
        );
        await pool.query(
            `UPDATE user_addresses SET isDefault = true WHERE id = ?`, [addressId]
        );

        return await User.getAddresses(userId);
    },

    // ── Pagination (used by notificationController) ───────────────────────
    findWithPagination: async (filters = {}, { page = 1, limit = 50 } = {}) => {
        const offset = (page - 1) * limit;
        const vals   = [];
        const where  = [];

        if (filters.idIn && filters.idIn.length > 0) {
            const placeholders = filters.idIn.map(() => '?').join(', ');
            where.push(`id IN (${placeholders})`);
            vals.push(...filters.idIn);
        }

        const whereSQL = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total FROM users ${whereSQL}`, vals
        );

        const [users] = await pool.query(
            `SELECT id, fullName, email, phone, avatar, isActive
             FROM users ${whereSQL} ORDER BY id ASC LIMIT ? OFFSET ?`,
            [...vals, Number(limit), offset]
        );

        return { users, total: Number(total) };
    },
};

module.exports = User;