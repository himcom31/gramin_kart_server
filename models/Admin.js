const { pool } = require('../config/db');

const createAdminTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS admins (
            id        INT AUTO_INCREMENT PRIMARY KEY,
            name      VARCHAR(255),
            email     VARCHAR(255) NOT NULL UNIQUE,
            password  VARCHAR(255) NOT NULL,
            role      VARCHAR(50)  DEFAULT 'admin',
            createdAt TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
};

createAdminTable();

const Admin = {

    findOne: async (filters = {}) => {
        const keys   = Object.keys(filters);
        const where  = keys.map(k => `${k} = ?`).join(' AND ');
        const values = keys.map(k => filters[k]);
        const [rows] = await pool.query(
            `SELECT * FROM admins WHERE ${where} LIMIT 1`, values
        );
        return rows[0] ?? null;
    },

    findById: async (id) => {
        const [rows] = await pool.query(
            `SELECT * FROM admins WHERE id = ? LIMIT 1`, [id]
        );
        return rows[0] ?? null;
    },

    create: async ({ name, email, password, role = 'admin' }) => {
        const [result] = await pool.query(
            `INSERT INTO admins (name, email, password, role) VALUES (?, ?, ?, ?)`,
            [name ?? null, email, password, role]
        );
        const [rows] = await pool.query(`SELECT * FROM admins WHERE id = ?`, [result.insertId]);
        return rows[0];
    }
};

module.exports = Admin;