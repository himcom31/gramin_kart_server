const { pool } = require('../../config/db');

const createSocialAuthTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS social_auth (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            provider     VARCHAR(100) NOT NULL UNIQUE,
            clientId     VARCHAR(500) DEFAULT '',
            clientSecret VARCHAR(500) DEFAULT '',
            redirectUrl  VARCHAR(500) DEFAULT 'postmessage',
            status       BOOLEAN DEFAULT false,
            createdAt    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
};

createSocialAuthTable();

const SocialAuth = {

    find: async () => {
        const [rows] = await pool.query(`SELECT * FROM social_auth`);
        return rows;
    },

    findOne: async (filters = {}) => {
        const keys   = Object.keys(filters);
        const where  = keys.map(k => `${k} = ?`).join(' AND ');
        const values = keys.map(k => filters[k]);
        const [rows] = await pool.query(
            `SELECT * FROM social_auth WHERE ${where} LIMIT 1`, values
        );
        return rows[0] ?? null;
    },

    // Upsert by provider
    findOneAndUpdate: async (filters, data) => {
        const existing = await SocialAuth.findOne(filters);

        if (existing) {
            const fields     = Object.keys(data);
            const setClause  = fields.map(f => `${f} = ?`).join(', ');
            const values     = fields.map(f => data[f]);
            const filterKeys = Object.keys(filters);
            const where      = filterKeys.map(k => `${k} = ?`).join(' AND ');
            const filterVals = filterKeys.map(k => filters[k]);

            await pool.query(
                `UPDATE social_auth SET ${setClause} WHERE ${where}`,
                [...values, ...filterVals]
            );
        } else {
            const merged       = { ...filters, ...data };
            const fields       = Object.keys(merged);
            const placeholders = fields.map(() => '?').join(', ');
            const values       = fields.map(f => merged[f]);

            await pool.query(
                `INSERT INTO social_auth (${fields.join(', ')}) VALUES (${placeholders})`,
                values
            );
        }

        return await SocialAuth.findOne(filters);
    },

    // Atomic toggle — no extra fetch needed
    toggleStatus: async (provider) => {
        const existing = await SocialAuth.findOne({ provider });
        if (!existing) return null;

        await pool.query(
            `UPDATE social_auth SET status = NOT status WHERE provider = ?`,
            [provider]
        );
        const [rows] = await pool.query(
            `SELECT * FROM social_auth WHERE provider = ?`, [provider]
        );
        return rows[0];
    }
};

module.exports = SocialAuth;