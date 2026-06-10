const { pool } = require('../config/db');

const createFlashSaleTables = async () => {

    await pool.query(`
        CREATE TABLE IF NOT EXISTS flash_sales (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            name        VARCHAR(255)  NOT NULL,
            minDiscount DECIMAL(5,2)  NOT NULL,
            startDate   DATE          NOT NULL,
            startTime   VARCHAR(20)   NOT NULL,
            endDate     DATE          NOT NULL,
            endTime     VARCHAR(20)   NOT NULL,
            description TEXT          NOT NULL,
            thumbnail   VARCHAR(500)  NOT NULL,
            isActive    BOOLEAN       DEFAULT true,
            createdAt   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
            updatedAt   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);

    // Join table — replaces products: [ObjectId] embedded array
    await pool.query(`
        CREATE TABLE IF NOT EXISTS flash_sale_products (
            id            INT AUTO_INCREMENT PRIMARY KEY,
            flash_sale_id INT NOT NULL,
            product_id    INT NOT NULL,
            UNIQUE KEY unique_sale_product (flash_sale_id, product_id),
            FOREIGN KEY (flash_sale_id) REFERENCES flash_sales(id) ON DELETE CASCADE
        )
    `);
};

createFlashSaleTables();

/* ── Internal helpers ────────────────────────────────────────────────────── */

const fetchProducts = async (flashSaleId) => {
    const [rows] = await pool.query(`
        SELECT p.*
        FROM flash_sale_products fsp
        JOIN products p ON fsp.product_id = p.id
        WHERE fsp.flash_sale_id = ?
    `, [flashSaleId]);
    return rows;
};

const hydrateOne = async (row) => {
    if (!row) return null;
    row.products = await fetchProducts(row.id);
    return row;
};

const hydrateMany = (rows) => Promise.all(rows.map(hydrateOne));

/* ── Model methods ───────────────────────────────────────────────────────── */

const FlashSale = {

    create: async ({ name, minDiscount, startDate, startTime, endDate, endTime, description, thumbnail }) => {
        const [result] = await pool.query(`
            INSERT INTO flash_sales
                (name, minDiscount, startDate, startTime, endDate, endTime, description, thumbnail)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [name, minDiscount, startDate, startTime, endDate, endTime, description, thumbnail]);

        const [rows] = await pool.query(`SELECT * FROM flash_sales WHERE id = ?`, [result.insertId]);
        return hydrateOne(rows[0]);
    },

    find: async () => {
        const [rows] = await pool.query(`SELECT * FROM flash_sales ORDER BY startDate ASC`);
        return hydrateMany(rows);
    },

    findById: async (id) => {
        const [rows] = await pool.query(`SELECT * FROM flash_sales WHERE id = ? LIMIT 1`, [id]);
        return hydrateOne(rows[0] ?? null);
    },

    findByIdAndUpdate: async (id, data) => {
        const fields = Object.keys(data);
        if (fields.length === 0) return await FlashSale.findById(id);

        const setClause = fields.map(f => `${f} = ?`).join(', ');
        const values    = fields.map(f => data[f]);

        await pool.query(
            `UPDATE flash_sales SET ${setClause} WHERE id = ?`,
            [...values, id]
        );
        return await FlashSale.findById(id);
    },

    toggleStatus: async (id) => {
        const existing = await FlashSale.findById(id);
        if (!existing) return null;
        await pool.query(`UPDATE flash_sales SET isActive = NOT isActive WHERE id = ?`, [id]);
        return await FlashSale.findById(id);
    },

    findByIdAndDelete: async (id) => {
        const existing = await FlashSale.findById(id);
        if (!existing) return null;
        // ON DELETE CASCADE removes flash_sale_products rows automatically
        await pool.query(`DELETE FROM flash_sales WHERE id = ?`, [id]);
        return existing;
    },

    // ── Product association methods ───────────────────────────────────────

    hasProduct: async (flashSaleId, productId) => {
        const [rows] = await pool.query(
            `SELECT id FROM flash_sale_products WHERE flash_sale_id = ? AND product_id = ? LIMIT 1`,
            [flashSaleId, productId]
        );
        return rows.length > 0;
    },

    addProduct: async (flashSaleId, productId) => {
        await pool.query(
            `INSERT INTO flash_sale_products (flash_sale_id, product_id) VALUES (?, ?)`,
            [flashSaleId, productId]
        );
        return await FlashSale.findById(flashSaleId);
    },

    removeProduct: async (flashSaleId, productId) => {
        await pool.query(
            `DELETE FROM flash_sale_products WHERE flash_sale_id = ? AND product_id = ?`,
            [flashSaleId, productId]
        );
        return await FlashSale.findById(flashSaleId);
    },
};

module.exports = FlashSale;