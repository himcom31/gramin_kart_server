const { pool } = require('../../config/db');

const createBrandTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS brands (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            name        VARCHAR(255) NOT NULL UNIQUE,
            logo        VARCHAR(500) NOT NULL,
            description TEXT,
            isActive    BOOLEAN DEFAULT true,
            createdAt   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
};

createBrandTable();

const Brand = {

    create: async ({ name, logo, description, isActive }) => {
        const [result] = await pool.query(
            `INSERT INTO brands (name, logo, description, isActive) VALUES (?, ?, ?, ?)`,
            [name, logo, description ?? null, isActive ?? true]
        );
        const [rows] = await pool.query(`SELECT * FROM brands WHERE id = ?`, [result.insertId]);
        return rows[0];
    },

    find: async () => {
        const [rows] = await pool.query(`SELECT * FROM brands ORDER BY name ASC`);
        return rows;
    },

    findById: async (id) => {
        const [rows] = await pool.query(`SELECT * FROM brands WHERE id = ?`, [id]);
        return rows[0] ?? null;
    },

    findByIdAndUpdate: async (id, data) => {
        const fields    = Object.keys(data);
        const setClause = fields.map(f => `${f} = ?`).join(', ');
        const values    = fields.map(f => data[f]);

        await pool.query(
            `UPDATE brands SET ${setClause} WHERE id = ?`,
            [...values, id]
        );
        const [rows] = await pool.query(`SELECT * FROM brands WHERE id = ?`, [id]);
        return rows[0] ?? null;
    },

    findByIdAndDelete: async (id) => {
        const [rows] = await pool.query(`SELECT * FROM brands WHERE id = ?`, [id]);
        if (rows.length === 0) return null;
        await pool.query(`DELETE FROM brands WHERE id = ?`, [id]);
        return rows[0];
    }
};

module.exports = Brand;