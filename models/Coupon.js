const { pool } = require('../config/db');

const createCouponTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS coupons (
            id                INT AUTO_INCREMENT PRIMARY KEY,
            couponCode        VARCHAR(100)  NOT NULL UNIQUE,
            discountType      ENUM('Amount', 'Percentage') NOT NULL,
            discountValue     DECIMAL(10,2) NOT NULL,
            minOrderAmount    DECIMAL(10,2) NOT NULL,
            maxDiscountAmount DECIMAL(10,2) DEFAULT NULL,
            limitPerUser      INT           DEFAULT 1,
            applicableFor     ENUM('All', 'New_User', 'Category_Specific') DEFAULT 'All',
            category_id       INT           DEFAULT NULL,
            startDate         DATE          NOT NULL,
            startTime         VARCHAR(20)   NOT NULL,
            expiryDate        DATE          NOT NULL,
            expiryTime        VARCHAR(20)   NOT NULL,
            isActive          BOOLEAN       DEFAULT true,
            createdAt         TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
            updatedAt         TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
        )
    `);
};

createCouponTable();

const BASE_SELECT = `
    SELECT
        c.*,
        cat.name AS category_name
    FROM coupons c
    LEFT JOIN categories cat ON c.category_id = cat.id
`;

const shape = (row) => {
    if (!row) return null;
    row.category = row.category_id
        ? { id: row.category_id, name: row.category_name }
        : null;
    delete row.category_name;
    return row;
};

const Coupon = {

    create: async (data) => {
        const fields       = Object.keys(data);
        const placeholders = fields.map(() => '?').join(', ');
        const values       = fields.map(f => data[f]);

        const [result] = await pool.query(
            `INSERT INTO coupons (${fields.join(', ')}) VALUES (${placeholders})`,
            values
        );
        const [rows] = await pool.query(`${BASE_SELECT} WHERE c.id = ?`, [result.insertId]);
        return shape(rows[0]);
    },

    find: async () => {
        const [rows] = await pool.query(`${BASE_SELECT} ORDER BY c.createdAt DESC`);
        return rows.map(shape);
    },

    findOne: async (filters = {}) => {
        const keys   = Object.keys(filters);
        const where  = keys.map(k => `c.${k} = ?`).join(' AND ');
        const values = keys.map(k => filters[k]);
        const [rows] = await pool.query(
            `${BASE_SELECT} WHERE ${where} LIMIT 1`, values
        );
        return shape(rows[0]) ?? null;
    },

    findById: async (id) => {
        const [rows] = await pool.query(`${BASE_SELECT} WHERE c.id = ?`, [id]);
        return shape(rows[0]) ?? null;
    },

    findByIdAndUpdate: async (id, data) => {
        const fields    = Object.keys(data);
        if (fields.length === 0) return await Coupon.findById(id);
        const setClause = fields.map(f => `${f} = ?`).join(', ');
        const values    = fields.map(f => data[f]);

        await pool.query(
            `UPDATE coupons SET ${setClause} WHERE id = ?`,
            [...values, id]
        );
        const [rows] = await pool.query(`${BASE_SELECT} WHERE c.id = ?`, [id]);
        return shape(rows[0]) ?? null;
    },

    toggleStatus: async (id) => {
        const existing = await Coupon.findById(id);
        if (!existing) return null;
        await pool.query(`UPDATE coupons SET isActive = NOT isActive WHERE id = ?`, [id]);
        const [rows] = await pool.query(`${BASE_SELECT} WHERE c.id = ?`, [id]);
        return shape(rows[0]);
    },

    findByIdAndDelete: async (id) => {
        const existing = await Coupon.findById(id);
        if (!existing) return null;
        await pool.query(`DELETE FROM coupons WHERE id = ?`, [id]);
        return existing;
    }
};

module.exports = Coupon;