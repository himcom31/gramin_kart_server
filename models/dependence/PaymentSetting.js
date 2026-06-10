const { pool } = require('../../config/db');

const createPaymentSettingTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS payment_settings (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            gatewayName  ENUM('Stripe', 'Razorpay') NOT NULL UNIQUE,
            status       BOOLEAN DEFAULT false,
            mode         ENUM('Test', 'Live') DEFAULT 'Test',
            secretKey    VARCHAR(500) NOT NULL,
            publishedKey VARCHAR(500) NOT NULL,
            title        VARCHAR(255) DEFAULT 'Online Payment',
            logo         VARCHAR(500),
            createdAt    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
};

createPaymentSettingTable();

const PaymentSetting = {

    // Find one row by filter object  e.g. { gatewayName: 'Razorpay' }
    findOne: async (filters = {}) => {
        const keys = Object.keys(filters);
        if (keys.length === 0) {
            const [rows] = await pool.query(`SELECT * FROM payment_settings LIMIT 1`);
            return rows[0] ?? null;
        }
        const where  = keys.map(k => `${k} = ?`).join(' AND ');
        const values = keys.map(k => filters[k]);
        const [rows] = await pool.query(`SELECT * FROM payment_settings WHERE ${where} LIMIT 1`, values);
        return rows[0] ?? null;
    },

    // Find multiple rows, optional filters, optional field exclusions
    find: async (filters = {}, excludeFields = []) => {
        const allColumns = ['id','gatewayName','status','mode','secretKey',
                            'publishedKey','title','logo','createdAt','updatedAt'];
        const selected   = allColumns.filter(c => !excludeFields.includes(c)).join(', ');

        const keys = Object.keys(filters);
        if (keys.length === 0) {
            const [rows] = await pool.query(`SELECT ${selected} FROM payment_settings`);
            return rows;
        }
        const where  = keys.map(k => `${k} = ?`).join(' AND ');
        const values = keys.map(k => filters[k]);
        const [rows] = await pool.query(
            `SELECT ${selected} FROM payment_settings WHERE ${where}`, values
        );
        return rows;
    },

    // Insert a new row
    create: async (data) => {
        const fields       = Object.keys(data);
        const placeholders = fields.map(() => '?').join(', ');
        const values       = fields.map(f => data[f]);
        const [result] = await pool.query(
            `INSERT INTO payment_settings (${fields.join(', ')}) VALUES (${placeholders})`,
            values
        );
        const [rows] = await pool.query(`SELECT * FROM payment_settings WHERE id = ?`, [result.insertId]);
        return rows[0];
    },

    // Upsert by gatewayName
    findOneAndUpdate: async (filters, data) => {
        const existing = await PaymentSetting.findOne(filters);

        if (existing) {
            const fields     = Object.keys(data);
            const setClause  = fields.map(f => `${f} = ?`).join(', ');
            const values     = fields.map(f => data[f]);
            const filterKeys = Object.keys(filters);
            const where      = filterKeys.map(k => `${k} = ?`).join(' AND ');
            const filterVals = filterKeys.map(k => filters[k]);

            await pool.query(
                `UPDATE payment_settings SET ${setClause} WHERE ${where}`,
                [...values, ...filterVals]
            );
            return await PaymentSetting.findOne(filters);
        } else {
            return await PaymentSetting.create({ ...filters, ...data });
        }
    },

    // Toggle status by gatewayName, returns updated row
    toggleStatus: async (gatewayName) => {
        await pool.query(
            `UPDATE payment_settings SET status = NOT status WHERE gatewayName = ?`,
            [gatewayName]
        );
        const [rows] = await pool.query(
            `SELECT * FROM payment_settings WHERE gatewayName = ?`, [gatewayName]
        );
        return rows[0] ?? null;
    }
};

module.exports = PaymentSetting;