const { pool } = require('../config/db');

const createDeliveryChargeTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS delivery_charges (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            minOrderQty DECIMAL(10,2) NOT NULL CHECK (minOrderQty >= 0),
            maxOrderQty DECIMAL(10,2) NOT NULL CHECK (maxOrderQty >= 0),
            charge      DECIMAL(10,2) NOT NULL CHECK (charge >= 0),
            isActive    BOOLEAN       DEFAULT true,
            createdAt   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
            updatedAt   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
};

createDeliveryChargeTable();

const DeliveryCharge = {

    create: async ({ minOrderQty, maxOrderQty, charge }) => {
        const [result] = await pool.query(
            `INSERT INTO delivery_charges (minOrderQty, maxOrderQty, charge) VALUES (?, ?, ?)`,
            [minOrderQty, maxOrderQty, charge]
        );
        const [rows] = await pool.query(
            `SELECT * FROM delivery_charges WHERE id = ?`, [result.insertId]
        );
        return rows[0];
    },

    find: async () => {
        const [rows] = await pool.query(
            `SELECT * FROM delivery_charges ORDER BY createdAt DESC`
        );
        return rows;
    },

    findById: async (id) => {
        const [rows] = await pool.query(
            `SELECT * FROM delivery_charges WHERE id = ? LIMIT 1`, [id]
        );
        return rows[0] ?? null;
    },

    findByIdAndUpdate: async (id, data) => {
        const fields    = Object.keys(data);
        if (fields.length === 0) return await DeliveryCharge.findById(id);
        const setClause = fields.map(f => `${f} = ?`).join(', ');
        const values    = fields.map(f => data[f]);

        await pool.query(
            `UPDATE delivery_charges SET ${setClause} WHERE id = ?`,
            [...values, id]
        );
        const [rows] = await pool.query(
            `SELECT * FROM delivery_charges WHERE id = ?`, [id]
        );
        return rows[0] ?? null;
    },

    findByIdAndDelete: async (id) => {
        const existing = await DeliveryCharge.findById(id);
        if (!existing) return null;
        await pool.query(`DELETE FROM delivery_charges WHERE id = ?`, [id]);
        return existing;
    },

    // Replaces: findOne({ isActive: true, minOrderQty: { $lte: qty }, maxOrderQty: { $gte: qty } })
    findForQty: async (qty) => {
        const [rows] = await pool.query(
            `SELECT * FROM delivery_charges
             WHERE isActive = true
               AND minOrderQty <= ?
               AND maxOrderQty >= ?
             LIMIT 1`,
            [qty, qty]
        );
        return rows[0] ?? null;
    }
};

module.exports = DeliveryCharge;