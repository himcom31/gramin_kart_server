const { pool } = require('../../config/db');

const createPusherSettingTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS pusher_settings (
            id        INT AUTO_INCREMENT PRIMARY KEY,
            appId     VARCHAR(255) NOT NULL,
            \`key\`   VARCHAR(255) NOT NULL,
            secret    VARCHAR(255) NOT NULL,
            cluster   VARCHAR(50)  NOT NULL DEFAULT 'ap2',
            status    BOOLEAN      DEFAULT false,
            createdAt TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
};

createPusherSettingTable();

const PusherSetting = {

    findOne: async () => {
        const [rows] = await pool.query(`SELECT * FROM pusher_settings LIMIT 1`);
        return rows[0] ?? null;
    },

    // Upsert — only one row ever exists (single config document pattern)
    findOneAndUpdate: async ({ appId, key, secret, cluster }) => {
        const [existing] = await pool.query(`SELECT id FROM pusher_settings LIMIT 1`);

        if (existing.length > 0) {
            await pool.query(
                `UPDATE pusher_settings SET appId = ?, \`key\` = ?, secret = ?, cluster = ? WHERE id = ?`,
                [appId, key, secret, cluster, existing[0].id]
            );
            const [rows] = await pool.query(`SELECT * FROM pusher_settings WHERE id = ?`, [existing[0].id]);
            return rows[0];
        } else {
            const [result] = await pool.query(
                `INSERT INTO pusher_settings (appId, \`key\`, secret, cluster) VALUES (?, ?, ?, ?)`,
                [appId, key, secret, cluster]
            );
            const [rows] = await pool.query(`SELECT * FROM pusher_settings WHERE id = ?`, [result.insertId]);
            return rows[0];
        }
    },

    toggleStatus: async (id, currentStatus) => {
        await pool.query(
            `UPDATE pusher_settings SET status = NOT status WHERE id = ?`, [id]
        );
        const [rows] = await pool.query(`SELECT * FROM pusher_settings WHERE id = ?`, [id]);
        return rows[0];
    },
};

module.exports = PusherSetting;