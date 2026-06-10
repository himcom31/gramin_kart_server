const { pool } = require('../../config/db');

const createSMSSettingTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS sms_settings (
            id                 INT AUTO_INCREMENT PRIMARY KEY,
            providerName       ENUM('Twilio', 'Nexmo', 'Telesign', 'MessageBird','Fast2SMS') NOT NULL UNIQUE,
            status             BOOLEAN DEFAULT false,

            -- Twilio
            twilioSid          VARCHAR(255) DEFAULT '',
            twilioToken        VARCHAR(255) DEFAULT '',
            twilioFrom         VARCHAR(50)  DEFAULT '',

            -- Nexmo (Vonage)
            nexmoKey           VARCHAR(255) DEFAULT '',
            nexmoSecret        VARCHAR(255) DEFAULT '',
            nexmoFrom          VARCHAR(50)  DEFAULT '',

            -- Telesign
            telesignCustomerId VARCHAR(255) DEFAULT '',
            telesignApiKey     VARCHAR(255) DEFAULT '',

            -- MessageBird
            messageBirdApiKey  VARCHAR(255) DEFAULT '',
            messageBirdFrom    VARCHAR(50)  DEFAULT '',

            fast2smsApiKey     VARCHAR(255) DEFAULT '',

            createdAt          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
};

createSMSSettingTable();

const SmsSetting = {

    find: async (filters = {}) => {
        const keys = Object.keys(filters);
        if (keys.length === 0) {
            const [rows] = await pool.query(`SELECT * FROM sms_settings`);
            return rows;
        }
        // Handle $in operator: { providerName: { $in: [...] } }
        const conditions = [];
        const values     = [];
        for (const key of keys) {
            const val = filters[key];
            if (val && typeof val === 'object' && val.$in) {
                const placeholders = val.$in.map(() => '?').join(', ');
                conditions.push(`${key} IN (${placeholders})`);
                values.push(...val.$in);
            } else {
                conditions.push(`${key} = ?`);
                values.push(val);
            }
        }
        const [rows] = await pool.query(
            `SELECT * FROM sms_settings WHERE ${conditions.join(' AND ')}`, values
        );
        return rows;
    },

    findOne: async (filters = {}) => {
        const keys   = Object.keys(filters);
        const where  = keys.map(k => `${k} = ?`).join(' AND ');
        const values = keys.map(k => filters[k]);
        const [rows] = await pool.query(
            `SELECT * FROM sms_settings WHERE ${where} LIMIT 1`, values
        );
        return rows[0] ?? null;
    },

    // Upsert by providerName — ignores 'status' field (controller strips it before calling)
    findOneAndUpdate: async (filters, data) => {
        const existing = await SmsSetting.findOne(filters);

        if (existing) {
            const fields    = Object.keys(data);
            const setClause = fields.map(f => `${f} = ?`).join(', ');
            const values    = fields.map(f => data[f]);
            const filterKeys = Object.keys(filters);
            const where      = filterKeys.map(k => `${k} = ?`).join(' AND ');
            const filterVals = filterKeys.map(k => filters[k]);

            await pool.query(
                `UPDATE sms_settings SET ${setClause} WHERE ${where}`,
                [...values, ...filterVals]
            );
        } else {
            // Insert with defaults for all provider fields
            const merged = { ...filters, ...data };
            const fields       = Object.keys(merged);
            const placeholders = fields.map(() => '?').join(', ');
            const values       = fields.map(f => merged[f]);

            await pool.query(
                `INSERT INTO sms_settings (${fields.join(', ')}) VALUES (${placeholders})`,
                values
            );
        }

        return await SmsSetting.findOne(filters);
    },

    // Deactivate all providers in a single query
    updateMany: async (updateData) => {
        const fields    = Object.keys(updateData);
        const setClause = fields.map(f => `${f} = ?`).join(', ');
        const values    = fields.map(f => updateData[f]);
        await pool.query(`UPDATE sms_settings SET ${setClause}`, values);
    },
};

module.exports = SmsSetting;