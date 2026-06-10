const { pool } = require('../../config/db');

const createCategoryTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS categories (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            thumbnail VARCHAR(500) NOT NULL,
            description TEXT,
            isActive BOOLEAN DEFAULT true,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
};

createCategoryTable();

const Category = {
    create: async ({ name, thumbnail, description, isActive }) => {
        const [result] = await pool.query(
            `INSERT INTO categories (name, thumbnail, description, isActive) VALUES (?, ?, ?, ?)`,
            [name, thumbnail, description ?? null, isActive ?? true]
        );
        const [rows] = await pool.query(`SELECT * FROM categories WHERE id = ?`, [result.insertId]);
        return rows[0];
    },

    find: async () => {
        const [rows] = await pool.query(`SELECT * FROM categories ORDER BY createdAt DESC`);
        return rows;
    },

    findByIdAndUpdate: async (id, updateData) => {
        // Dynamically build SET clause from only provided fields
        const fields = Object.keys(updateData);
        if (fields.length === 0) return null;

        const setClause = fields.map(f => `${f} = ?`).join(', ');
        const values = fields.map(f => updateData[f]);

        await pool.query(
            `UPDATE categories SET ${setClause} WHERE id = ?`,
            [...values, id]
        );

        const [rows] = await pool.query(`SELECT * FROM categories WHERE id = ?`, [id]);
        return rows[0] ?? null;
    },

    findByIdAndDelete: async (id) => {
        const [rows] = await pool.query(`SELECT * FROM categories WHERE id = ?`, [id]);
        if (rows.length === 0) return null;

        await pool.query(`DELETE FROM categories WHERE id = ?`, [id]);
        return rows[0]; // return deleted row so controller can use its name
    }
};

module.exports = Category;