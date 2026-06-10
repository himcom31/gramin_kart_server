const { pool } = require('../config/db');

const createBusinessSettingTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS business_settings (
            id               INT AUTO_INCREMENT PRIMARY KEY,
            companyName      VARCHAR(255),
            companyEmail     VARCHAR(255),
            companyPhone     VARCHAR(50),
            businessModel    ENUM('Single Shop'),
            currencyPosition ENUM('Left', 'Right') DEFAULT 'Left',
            timeZone         VARCHAR(100)           DEFAULT 'UTC/GMT +06:00',
            cashOnDelivery   BOOLEAN                DEFAULT true,
            onlinePayment    BOOLEAN                DEFAULT true,
            logo             VARCHAR(500),
            createdAt        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
};

createBusinessSettingTable();

const BusinessSetting = {

    findOne: async () => {
        const [rows] = await pool.query(`SELECT * FROM business_settings LIMIT 1`);
        return rows[0] ?? null;
    },

    create: async (data = {}) => {
        const fields       = Object.keys(data);
        const placeholders = fields.length ? fields.map(() => '?').join(', ') : '';
        const values       = fields.map(f => data[f]);

        if (fields.length === 0) {
            // Insert a row with all defaults
            const [result] = await pool.query(`INSERT INTO business_settings () VALUES ()`);
            const [rows]   = await pool.query(`SELECT * FROM business_settings WHERE id = ?`, [result.insertId]);
            return rows[0];
        }

        const [result] = await pool.query(
            `INSERT INTO business_settings (${fields.join(', ')}) VALUES (${placeholders})`,
            values
        );
        const [rows] = await pool.query(`SELECT * FROM business_settings WHERE id = ?`, [result.insertId]);
        return rows[0];
    },

    // Upsert — only one row ever exists
    findOneAndUpdate: async (data = {}) => {
        const [existing] = await pool.query(`SELECT id FROM business_settings LIMIT 1`);

        if (existing.length > 0) {
            const fields    = Object.keys(data);
            if (fields.length === 0) {
                const [rows] = await pool.query(`SELECT * FROM business_settings WHERE id = ?`, [existing[0].id]);
                return rows[0];
            }
            const setClause = fields.map(f => `${f} = ?`).join(', ');
            const values    = fields.map(f => data[f]);

            await pool.query(
                `UPDATE business_settings SET ${setClause} WHERE id = ?`,
                [...values, existing[0].id]
            );
            const [rows] = await pool.query(`SELECT * FROM business_settings WHERE id = ?`, [existing[0].id]);
            return rows[0];
        } else {
            return await BusinessSetting.create(data);
        }
    }
};

module.exports = BusinessSetting;