const { pool } = require('../config/db');

const createTaxTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS taxes (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            taxName    VARCHAR(255)  NOT NULL UNIQUE,
            percentage DECIMAL(5,2)  NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
            isActive   BOOLEAN       DEFAULT true,
            createdAt  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
            updatedAt  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
};

createTaxTable();

const Tax = {

    create: async ({ taxName, percentage }) => {
        const [result] = await pool.query(
            `INSERT INTO taxes (taxName, percentage) VALUES (?, ?)`,
            [taxName, percentage]
        );
        const [rows] = await pool.query(`SELECT * FROM taxes WHERE id = ?`, [result.insertId]);
        return rows[0];
    },

    find: async (filters = {}) => {
        const keys = Object.keys(filters);
        let query  = `SELECT * FROM taxes`;
        const vals = [];

        if (keys.length > 0) {
            const where = keys.map(k => `${k} = ?`).join(' AND ');
            query += ` WHERE ${where}`;
            vals.push(...keys.map(k => filters[k]));
        }

        query += ` ORDER BY createdAt DESC`;
        const [rows] = await pool.query(query, vals);
        return rows;
    },

    findOne: async (filters = {}) => {
        const keys   = Object.keys(filters);
        const where  = keys.map(k => `${k} = ?`).join(' AND ');
        const values = keys.map(k => filters[k]);
        const [rows] = await pool.query(
            `SELECT * FROM taxes WHERE ${where} LIMIT 1`, values
        );
        return rows[0] ?? null;
    },

    findById: async (id) => {
        const [rows] = await pool.query(`SELECT * FROM taxes WHERE id = ? LIMIT 1`, [id]);
        return rows[0] ?? null;
    },

    update: async (id, data) => {
        const fields    = Object.keys(data);
        if (fields.length === 0) return await Tax.findById(id);
        const setClause = fields.map(f => `${f} = ?`).join(', ');
        const values    = fields.map(f => data[f]);

        await pool.query(
            `UPDATE taxes SET ${setClause} WHERE id = ?`,
            [...values, id]
        );
        const [rows] = await pool.query(`SELECT * FROM taxes WHERE id = ?`, [id]);
        return rows[0];
    },

    toggleStatus: async (id) => {
        await pool.query(`UPDATE taxes SET isActive = NOT isActive WHERE id = ?`, [id]);
        const [rows] = await pool.query(`SELECT * FROM taxes WHERE id = ?`, [id]);
        return rows[0];
    },

    delete: async (id) => {
        const existing = await Tax.findById(id);
        if (!existing) return null;
        await pool.query(`DELETE FROM taxes WHERE id = ?`, [id]);
        return existing;
    },
};

module.exports = Tax;