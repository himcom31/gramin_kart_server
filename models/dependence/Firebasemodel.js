const { pool } = require('../../config/db');

const createTables = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS firebase_config (
            id                          INT AUTO_INCREMENT PRIMARY KEY,
            type                        VARCHAR(100),
            project_id                  VARCHAR(255) NOT NULL,
            private_key_id              VARCHAR(255) NOT NULL,
            private_key                 TEXT NOT NULL,
            client_email                VARCHAR(255) NOT NULL,
            client_id                   VARCHAR(255),
            auth_uri                    VARCHAR(500),
            token_uri                   VARCHAR(500),
            auth_provider_x509_cert_url VARCHAR(500),
            client_x509_cert_url        VARCHAR(500),
            universe_domain             VARCHAR(255),
            isConfigured                BOOLEAN DEFAULT false,
            createdAt                   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt                   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS fcm_tokens (
            id        INT AUTO_INCREMENT PRIMARY KEY,
            userId    INT NOT NULL,
            token     VARCHAR(500) NOT NULL UNIQUE,
            platform  ENUM('web', 'android', 'ios') DEFAULT 'web',
            isActive  BOOLEAN DEFAULT true,
            lastUsed  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_user_active (userId, isActive)
        )
    `);
};

createTables();

const FirebaseConfig = {
    // Returns the single config row (only one row ever exists)
    findOne: async (fields = '*') => {
        const select = Array.isArray(fields) ? fields.join(', ') : fields;
        const [rows] = await pool.query(`SELECT ${select} FROM firebase_config LIMIT 1`);
        return rows[0] ?? null;
    },

    // Upsert — replaces the single config row
    findOneAndUpdate: async (data) => {
        const [existing] = await pool.query(`SELECT id FROM firebase_config LIMIT 1`);

        if (existing.length > 0) {
            const fields = Object.keys(data);
            const setClause = fields.map(f => `${f} = ?`).join(', ');
            const values = fields.map(f => data[f]);

            await pool.query(
                `UPDATE firebase_config SET ${setClause} WHERE id = ?`,
                [...values, existing[0].id]
            );
            const [rows] = await pool.query(`SELECT * FROM firebase_config WHERE id = ?`, [existing[0].id]);
            return rows[0];
        } else {
            const fields = Object.keys(data);
            const placeholders = fields.map(() => '?').join(', ');
            const values = fields.map(f => data[f]);

            const [result] = await pool.query(
                `INSERT INTO firebase_config (${fields.join(', ')}) VALUES (${placeholders})`,
                values
            );
            const [rows] = await pool.query(`SELECT * FROM firebase_config WHERE id = ?`, [result.insertId]);
            return rows[0];
        }
    },

    // Update isConfigured by id
    updateConfigured: async (id, value) => {
        await pool.query(`UPDATE firebase_config SET isConfigured = ? WHERE id = ?`, [value, id]);
    }
};

const FcmToken = {
    findOneAndUpdate: async ({ token }, data) => {
        const [existing] = await pool.query(`SELECT id FROM fcm_tokens WHERE token = ?`, [token]);

        if (existing.length > 0) {
            const fields = Object.keys(data);
            const setClause = fields.map(f => `${f} = ?`).join(', ');
            const values = fields.map(f => data[f]);

            await pool.query(
                `UPDATE fcm_tokens SET ${setClause} WHERE token = ?`,
                [...values, token]
            );
        } else {
            const fields = Object.keys(data);
            const placeholders = fields.map(() => '?').join(', ');
            const values = fields.map(f => data[f]);

            await pool.query(
                `INSERT INTO fcm_tokens (${fields.join(', ')}) VALUES (${placeholders})`,
                values
            );
        }
    },

    // Find all active tokens for a user
    find: async ({ userId, isActive } = {}) => {
        let query = `SELECT * FROM fcm_tokens WHERE 1=1`;
        const params = [];

        if (userId !== undefined)   { query += ` AND userId = ?`;   params.push(userId); }
        if (isActive !== undefined) { query += ` AND isActive = ?`; params.push(isActive); }

        const [rows] = await pool.query(query, params);
        return rows;
    },

    // Mark dead tokens as inactive (called after multicast)
    updateMany: async (tokenList, updateData) => {
        if (tokenList.length === 0) return;
        const placeholders = tokenList.map(() => '?').join(', ');
        const fields = Object.keys(updateData);
        const setClause = fields.map(f => `${f} = ?`).join(', ');
        const values = fields.map(f => updateData[f]);

        await pool.query(
            `UPDATE fcm_tokens SET ${setClause} WHERE token IN (${placeholders})`,
            [...values, ...tokenList]
        );
    }
};

module.exports = { FirebaseConfig, FcmToken };