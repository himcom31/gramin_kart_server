const { pool } = require('../config/db');

const createAdTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS ads (
            id        INT AUTO_INCREMENT PRIMARY KEY,
            title     VARCHAR(255) NOT NULL,
            image     VARCHAR(500) NOT NULL,
            link      VARCHAR(500),
            position  ENUM('Home_Top','Home_Middle','Sidebar','Bottom') DEFAULT 'Home_Top',
            isActive  BOOLEAN   DEFAULT true,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
};

createAdTable();

const Ad = {

    create: async ({ title, image, link, position, isActive }) => {
        const [result] = await pool.query(
            `INSERT INTO ads (title, image, link, position, isActive) VALUES (?, ?, ?, ?, ?)`,
            [title, image, link ?? null, position ?? 'Home_Top', isActive ?? true]
        );
        const [rows] = await pool.query(`SELECT * FROM ads WHERE id = ?`, [result.insertId]);
        return rows[0];
    },

    find: async (filters = {}) => {
        const keys = Object.keys(filters);
        if (keys.length === 0) {
            const [rows] = await pool.query(`SELECT * FROM ads ORDER BY createdAt DESC`);
            return rows;
        }
        const where  = keys.map(k => `${k} = ?`).join(' AND ');
        const values = keys.map(k => filters[k]);
        const [rows] = await pool.query(
            `SELECT * FROM ads WHERE ${where} ORDER BY createdAt DESC`, values
        );
        return rows;
    },

    findById: async (id) => {
        const [rows] = await pool.query(`SELECT * FROM ads WHERE id = ?`, [id]);
        return rows[0] ?? null;
    },

    findByIdAndUpdate: async (id, data) => {
        const fields    = Object.keys(data);
        if (fields.length === 0) return await Ad.findById(id);
        const setClause = fields.map(f => `${f} = ?`).join(', ');
        const values    = fields.map(f => data[f]);
        await pool.query(`UPDATE ads SET ${setClause} WHERE id = ?`, [...values, id]);
        const [rows] = await pool.query(`SELECT * FROM ads WHERE id = ?`, [id]);
        return rows[0] ?? null;
    },

    toggleStatus: async (id) => {
        const existing = await Ad.findById(id);
        if (!existing) return null;
        await pool.query(`UPDATE ads SET isActive = NOT isActive WHERE id = ?`, [id]);
        const [rows] = await pool.query(`SELECT * FROM ads WHERE id = ?`, [id]);
        return rows[0];
    },

    findByIdAndDelete: async (id) => {
        const [rows] = await pool.query(`SELECT * FROM ads WHERE id = ?`, [id]);
        if (!rows[0]) return null;
        await pool.query(`DELETE FROM ads WHERE id = ?`, [id]);
        return rows[0];
    }
};

module.exports = Ad;