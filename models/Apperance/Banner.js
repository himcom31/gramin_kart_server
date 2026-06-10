const { pool } = require('../../config/db');

// Create table if it doesn't exist
const createBannerTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS banners (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            bannerImage VARCHAR(500) NOT NULL,
            isOwnShop BOOLEAN DEFAULT false,
            status ENUM('Active', 'Inactive') DEFAULT 'Active',
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
};

createBannerTable();

const Banner = {
    create: async ({ title, bannerImage, isOwnShop }) => {
        const [result] = await pool.query(
            `INSERT INTO banners (title, bannerImage, isOwnShop) VALUES (?, ?, ?)`,
            [title, bannerImage, isOwnShop ?? false]
        );
        const [rows] = await pool.query(`SELECT * FROM banners WHERE id = ?`, [result.insertId]);
        return rows[0];
    },

    find: async () => {
        const [rows] = await pool.query(`SELECT * FROM banners ORDER BY createdAt DESC`);
        return rows;
    },

    findByIdAndDelete: async (id) => {
        const [result] = await pool.query(`DELETE FROM banners WHERE id = ?`, [id]);
        return result;
    }
};

module.exports = Banner;