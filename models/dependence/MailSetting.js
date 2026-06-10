const { pool } = require('../../config/db');

const createMailSettingTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS mail_settings (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            mailMailer      VARCHAR(50)  DEFAULT 'smtp',
            mailHost        VARCHAR(255) NOT NULL,
            mailPort        INT          NOT NULL,
            mailUserName    VARCHAR(255) NOT NULL,
            mailPassword    VARCHAR(255) NOT NULL,
            mailEncryption  ENUM('tls', 'ssl') DEFAULT 'tls',
            mailFromAddress VARCHAR(255) NOT NULL,
            status          BOOLEAN DEFAULT false,
            createdAt       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
};

createMailSettingTable();

const MailSetting = {
    // Returns the single config row
    findOne: async (filters = {}) => {
        let query = `SELECT * FROM mail_settings`;
        const params = [];

        if (filters.status !== undefined) {
            query += ` WHERE status = ?`;
            params.push(filters.status);
        }

        query += ` LIMIT 1`;
        const [rows] = await pool.query(query, params);
        return rows[0] ?? null;
    },

    // Upsert — only one row ever exists
    findOneAndUpdate: async (data) => {
        const [existing] = await pool.query(`SELECT id FROM mail_settings LIMIT 1`);

        if (existing.length > 0) {
            const fields = Object.keys(data);
            const setClause = fields.map(f => `${f} = ?`).join(', ');
            const values = fields.map(f => data[f]);

            await pool.query(
                `UPDATE mail_settings SET ${setClause} WHERE id = ?`,
                [...values, existing[0].id]
            );
            const [rows] = await pool.query(`SELECT * FROM mail_settings WHERE id = ?`, [existing[0].id]);
            return rows[0];
        } else {
            const fields = Object.keys(data);
            const placeholders = fields.map(() => '?').join(', ');
            const values = fields.map(f => data[f]);

            const [result] = await pool.query(
                `INSERT INTO mail_settings (${fields.join(', ')}) VALUES (${placeholders})`,
                values
            );
            const [rows] = await pool.query(`SELECT * FROM mail_settings WHERE id = ?`, [result.insertId]);
            return rows[0];
        }
    }
};

module.exports = MailSetting;