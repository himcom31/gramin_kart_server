const { pool } = require('../config/db');

const createCustomerTables = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS customers (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            fullName    VARCHAR(255)  NOT NULL,
            email       VARCHAR(255)  UNIQUE,
            phone       VARCHAR(20)   NOT NULL UNIQUE,
            password    VARCHAR(255),
            avatar      VARCHAR(500),
            totalOrders INT           DEFAULT 0,
            totalSpent  DECIMAL(10,2) DEFAULT 0,
            isActive    BOOLEAN       DEFAULT true,
            createdAt   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
            updatedAt   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);

    // address is a repeating group → separate table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS customer_addresses (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            customer_id INT          NOT NULL,
            street      VARCHAR(255),
            city        VARCHAR(100),
            pincode     VARCHAR(20),
            isDefault   BOOLEAN      DEFAULT false,
            createdAt   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
            updatedAt   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
        )
    `);
};

createCustomerTables();

/* ── Internal helpers ────────────────────────────────────────────────────── */

const attachAddresses = async (customer) => {
    if (!customer) return null;
    const [rows] = await pool.query(
        `SELECT * FROM customer_addresses WHERE customer_id = ? ORDER BY isDefault DESC`,
        [customer.id]
    );
    customer.address = rows;
    return customer;
};

/* ── Model methods ───────────────────────────────────────────────────────── */

const Customer = {

    create: async ({ fullName, email, phone, password, avatar, totalOrders, totalSpent, isActive, address }) => {
        const [result] = await pool.query(
            `INSERT INTO customers (fullName, email, phone, password, avatar, totalOrders, totalSpent, isActive)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                fullName,
                email ? email.toLowerCase() : null,
                phone,
                password  ?? null,
                avatar    ?? null,
                totalOrders ?? 0,
                totalSpent  ?? 0,
                isActive  ?? true
            ]
        );

        const customerId = result.insertId;

        // Insert address rows if provided
        if (address?.length > 0) {
            const addrRows = address.map(a => [customerId, a.street, a.city, a.pincode, a.isDefault ?? false]);
            await pool.query(
                `INSERT INTO customer_addresses (customer_id, street, city, pincode, isDefault) VALUES ?`,
                [addrRows]
            );
        }

        const [rows] = await pool.query(`SELECT * FROM customers WHERE id = ?`, [customerId]);
        return attachAddresses(rows[0]);
    },

    find: async (filters = {}) => {
        const keys = Object.keys(filters);
        let query  = `SELECT * FROM customers`;
        const vals = [];

        if (keys.length > 0) {
            const where = keys.map(k => `${k} = ?`).join(' AND ');
            query += ` WHERE ${where}`;
            vals.push(...keys.map(k => filters[k]));
        }

        query += ` ORDER BY createdAt DESC`;
        const [rows] = await pool.query(query, vals);
        return Promise.all(rows.map(attachAddresses));
    },

    findOne: async (filters = {}) => {
        // Supports { $or: [{ email }, { phone }] } pattern
        if (filters.$or) {
            const conditions = filters.$or.map(f => {
                const [key] = Object.keys(f);
                return { key, value: f[key] };
            });
            const where  = conditions.map(c => `${c.key} = ?`).join(' OR ');
            const values = conditions.map(c => c.value);
            const [rows] = await pool.query(
                `SELECT * FROM customers WHERE ${where} LIMIT 1`, values
            );
            return rows[0] ? attachAddresses(rows[0]) : null;
        }

        const keys   = Object.keys(filters);
        const where  = keys.map(k => `${k} = ?`).join(' AND ');
        const values = keys.map(k => filters[k]);
        const [rows] = await pool.query(
            `SELECT * FROM customers WHERE ${where} LIMIT 1`, values
        );
        return rows[0] ? attachAddresses(rows[0]) : null;
    },

    findById: async (id) => {
        const [rows] = await pool.query(`SELECT * FROM customers WHERE id = ? LIMIT 1`, [id]);
        return rows[0] ? attachAddresses(rows[0]) : null;
    },

    findByIdAndUpdate: async (id, data) => {
        const { address, ...flat } = data;

        if (Object.keys(flat).length > 0) {
            const fields    = Object.keys(flat);
            const setClause = fields.map(f => `${f} = ?`).join(', ');
            const values    = fields.map(f => flat[f]);
            await pool.query(`UPDATE customers SET ${setClause} WHERE id = ?`, [...values, id]);
        }

        // Replace addresses when provided
        if (address !== undefined) {
            await pool.query(`DELETE FROM customer_addresses WHERE customer_id = ?`, [id]);
            if (address.length > 0) {
                const addrRows = address.map(a => [id, a.street, a.city, a.pincode, a.isDefault ?? false]);
                await pool.query(
                    `INSERT INTO customer_addresses (customer_id, street, city, pincode, isDefault) VALUES ?`,
                    [addrRows]
                );
            }
        }

        const [rows] = await pool.query(`SELECT * FROM customers WHERE id = ?`, [id]);
        return attachAddresses(rows[0]);
    },

    findByIdAndDelete: async (id) => {
        const existing = await Customer.findById(id);
        if (!existing) return null;
        // ON DELETE CASCADE removes customer_addresses automatically
        await pool.query(`DELETE FROM customers WHERE id = ?`, [id]);
        return existing;
    },

    countDocuments: async (filters = {}) => {
        const keys = Object.keys(filters);
        if (keys.length === 0) {
            const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM customers`);
            return rows[0].total;
        }
        const where  = keys.map(k => `${k} = ?`).join(' AND ');
        const values = keys.map(k => filters[k]);
        const [rows] = await pool.query(
            `SELECT COUNT(*) AS total FROM customers WHERE ${where}`, values
        );
        return rows[0].total;
    }
};

module.exports = Customer;