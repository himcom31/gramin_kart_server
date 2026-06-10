const { pool } = require('../config/db');

// ─── Create Tables ────────────────────────────────────────────────────────────
const createOrderTables = async () => {

    // Main orders table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS orders (
            id                INT AUTO_INCREMENT PRIMARY KEY,
            user_id           INT           NOT NULL,
            orderNumber       VARCHAR(100)  UNIQUE,
            subtotal          DECIMAL(10,2) NOT NULL,
            discount          DECIMAL(10,2) DEFAULT 0,
            shippingCharge    DECIMAL(10,2) DEFAULT 0,
            tax               DECIMAL(10,2) DEFAULT 0,
            total             DECIMAL(10,2) NOT NULL,
            couponCode        VARCHAR(100)  DEFAULT NULL,
            couponDiscount    DECIMAL(10,2) DEFAULT 0,

            -- Shipping address snapshot
            addr_name         VARCHAR(255)  NOT NULL DEFAULT '',
            addr_phone        VARCHAR(20)   NOT NULL DEFAULT '',
            addr_altPhone     VARCHAR(20)   DEFAULT '',
            addr_house        VARCHAR(255)  NOT NULL DEFAULT '',
            addr_road         VARCHAR(255)  NOT NULL DEFAULT '',
            addr_city         VARCHAR(100)  NOT NULL DEFAULT '',
            addr_state        VARCHAR(100)  NOT NULL DEFAULT '',
            addr_pincode      VARCHAR(20)   NOT NULL DEFAULT '',
            addr_landmark     VARCHAR(255)  DEFAULT '',
            addr_type         VARCHAR(50)   DEFAULT 'Home',

            deliveryProof     VARCHAR(500)  DEFAULT NULL,
            pickupProof       VARCHAR(500)  DEFAULT NULL,
            pickedUpAt        DATETIME      DEFAULT NULL,

            paymentMethod     ENUM('COD','Razorpay','Stripe','Card') DEFAULT 'COD',
            paymentStatus     ENUM('Pending','Paid','Failed','Refunded') DEFAULT 'Pending',
            razorpayOrderId   VARCHAR(255)  DEFAULT NULL,
            razorpayPaymentId VARCHAR(255)  DEFAULT NULL,

            status            ENUM('Pending','Processing','Shipped','On The Way','Delivered','Cancelled','Picked Up','In Transit','Returned') DEFAULT 'Pending',

            note              TEXT          DEFAULT '',
            deliveredAt       DATETIME      DEFAULT NULL,
            cancelledAt       DATETIME      DEFAULT NULL,

            assignedDriver_id INT           DEFAULT NULL,

            createdAt         TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
            updatedAt         TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

            FOREIGN KEY (user_id)           REFERENCES users(id)   ON DELETE CASCADE,
            FOREIGN KEY (assignedDriver_id) REFERENCES drivers(id) ON DELETE SET NULL
        )
    `);

    // Order items (replaces embedded orderItemSchema)
    await pool.query(`
        CREATE TABLE IF NOT EXISTS order_items (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            order_id   INT           NOT NULL,
            product_id INT           NOT NULL,
            name       VARCHAR(255)  NOT NULL,
            image      VARCHAR(500)  DEFAULT NULL,
            price      DECIMAL(10,2) NOT NULL,
            quantity   INT           NOT NULL,
            total      DECIMAL(10,2) NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        )
    `);

    // Status history (replaces embedded statusHistory array)
    await pool.query(`
        CREATE TABLE IF NOT EXISTS order_status_history (
            id        INT AUTO_INCREMENT PRIMARY KEY,
            order_id  INT          NOT NULL,
            status    VARCHAR(50)  NOT NULL,
            note      TEXT         DEFAULT '',
            changedAt DATETIME     DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        )
    `);
};

createOrderTables();

// ─── Shape helpers ────────────────────────────────────────────────────────────

// Re-nest flat addr_* columns → shippingAddress object
// Re-nest assignedDriver columns → assignedDriver object
const shape = (row, items = [], statusHistory = []) => {
    if (!row) return null;

    row.shippingAddress = {
        name:     row.addr_name,
        phone:    row.addr_phone,
        altPhone: row.addr_altPhone,
        house:    row.addr_house,
        road:     row.addr_road,
        city:     row.addr_city,
        state:    row.addr_state,
        pincode:  row.addr_pincode,
        landmark: row.addr_landmark,
        type:     row.addr_type,
    };

    // Clean up flat addr_ keys
    Object.keys(row).filter(k => k.startsWith('addr_')).forEach(k => delete row[k]);

    // Re-nest assignedDriver
    row.assignedDriver = row.assignedDriver_id ? {
        id:            row.assignedDriver_id,
        fullName:      row.driver_fullName      ?? null,
        phone:         row.driver_phone         ?? null,
        vehicleType:   row.driver_vehicleType   ?? null,
        vehicleNumber: row.driver_vehicleNumber ?? null,
        profileImage:  row.driver_profileImage  ?? null,
    } : null;

    delete row.assignedDriver_id;
    delete row.driver_fullName;
    delete row.driver_phone;
    delete row.driver_vehicleType;
    delete row.driver_vehicleNumber;
    delete row.driver_profileImage;

    // Re-nest user if joined
    if (row.user_id && row.user_fullName !== undefined) {
        row.user = {
            id:       row.user_id,
            fullName: row.user_fullName ?? null,
            email:    row.user_email    ?? null,
            phone:    row.user_phone    ?? null,
        };
        delete row.user_fullName;
        delete row.user_email;
        delete row.user_phone;
    }

    row.items         = items;
    row.statusHistory = statusHistory;
    return row;
};

// ─── Base SELECT ──────────────────────────────────────────────────────────────
const BASE_SELECT = `
    SELECT
        o.*,
        u.fullName  AS user_fullName,
        u.email     AS user_email,
        u.phone     AS user_phone,
        d.fullName  AS driver_fullName,
        d.phone     AS driver_phone,
        d.vehicleType   AS driver_vehicleType,
        d.vehicleNumber AS driver_vehicleNumber,
        d.profileImage  AS driver_profileImage
    FROM orders o
    LEFT JOIN users   u ON o.user_id           = u.id
    LEFT JOIN drivers d ON o.assignedDriver_id = d.id
`;

const fetchItems = async (orderId) => {
    const [rows] = await pool.query(
        `SELECT * FROM order_items WHERE order_id = ?`, [orderId]
    );
    return rows;
};

const fetchStatusHistory = async (orderId) => {
    const [rows] = await pool.query(
        `SELECT * FROM order_status_history WHERE order_id = ? ORDER BY changedAt ASC`,
        [orderId]
    );
    return rows;
};

const hydrateOne = async (row) => {
    if (!row) return null;
    const [items, history] = await Promise.all([
        fetchItems(row.id),
        fetchStatusHistory(row.id),
    ]);
    return shape(row, items, history);
};

const hydrateMany = (rows) => Promise.all(rows.map(hydrateOne));

// ─── Auto-generate orderNumber ────────────────────────────────────────────────
const generateOrderNumber = async () => {
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM orders`);
    return `ORD-${Date.now()}-${String(Number(total) + 1).padStart(4, '0')}`;
};

// ─── Model ────────────────────────────────────────────────────────────────────
const Order = {

    create: async (data) => {
        const {
            user, items, subtotal, discount, shippingCharge, tax, total,
            couponCode, couponDiscount, shippingAddress: a,
            paymentMethod, paymentStatus,
            razorpayOrderId, razorpayPaymentId,
            note, assignedDriver,
        } = data;

        const orderNumber = await generateOrderNumber();

        const [result] = await pool.query(`
            INSERT INTO orders (
                user_id, orderNumber, subtotal, discount, shippingCharge, tax, total,
                couponCode, couponDiscount,
                addr_name, addr_phone, addr_altPhone, addr_house, addr_road,
                addr_city, addr_state, addr_pincode, addr_landmark, addr_type,
                paymentMethod, paymentStatus,
                razorpayOrderId, razorpayPaymentId,
                note, assignedDriver_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            user, orderNumber, subtotal, discount ?? 0, shippingCharge ?? 0, tax ?? 0, total,
            couponCode ?? null, couponDiscount ?? 0,
            a.name, a.phone, a.altPhone ?? '', a.house, a.road,
            a.city, a.state, a.pincode, a.landmark ?? '', a.type ?? 'Home',
            paymentMethod ?? 'COD', paymentStatus ?? 'Pending',
            razorpayOrderId ?? null, razorpayPaymentId ?? null,
            note ?? '', assignedDriver ?? null,
        ]);

        const orderId = result.insertId;

        // Insert order items
        if (items?.length > 0) {
            const itemRows = items.map(i => [
                orderId, i.product, i.name, i.image ?? null,
                i.price, i.quantity, i.total
            ]);
            await pool.query(
                `INSERT INTO order_items (order_id, product_id, name, image, price, quantity, total) VALUES ?`,
                [itemRows]
            );
        }

        // Seed initial status history
        await pool.query(
            `INSERT INTO order_status_history (order_id, status) VALUES (?, ?)`,
            [orderId, 'Pending']
        );

        const [[row]] = await pool.query(`${BASE_SELECT} WHERE o.id = ?`, [orderId]);
        return hydrateOne(row);
    },

    // ── Generic find with filter object ──────────────────────────────────
    find: async (filters = {}, opts = {}) => {
        const { sortBy = 'o.createdAt', sortOrder = 'DESC', limit, offset } = opts;
        const keys = Object.keys(filters);
        let query  = BASE_SELECT;
        const vals = [];

        if (keys.length > 0) {
            const where = keys.map(k => `o.${k} = ?`).join(' AND ');
            query += ` WHERE ${where}`;
            vals.push(...keys.map(k => filters[k]));
        }

        query += ` ORDER BY ${sortBy} ${sortOrder}`;
        if (limit)  { query += ` LIMIT ?`;  vals.push(Number(limit)); }
        if (offset) { query += ` OFFSET ?`; vals.push(Number(offset)); }

        const [rows] = await pool.query(query, vals);
        return hydrateMany(rows);
    },

    findById: async (id) => {
        const [rows] = await pool.query(`${BASE_SELECT} WHERE o.id = ?`, [id]);
        return hydrateOne(rows[0] ?? null);
    },

    findOne: async (filters = {}) => {
        const keys   = Object.keys(filters);
        const where  = keys.map(k => `o.${k} = ?`).join(' AND ');
        const values = keys.map(k => filters[k]);
        const [rows] = await pool.query(`${BASE_SELECT} WHERE ${where} LIMIT 1`, values);
        return hydrateOne(rows[0] ?? null);
    },

    findByIdAndUpdate: async (id, data) => {
        const fields    = Object.keys(data);
        if (fields.length === 0) return await Order.findById(id);
        const setClause = fields.map(f => `${f} = ?`).join(', ');
        const values    = fields.map(f => data[f]);

        await pool.query(
            `UPDATE orders SET ${setClause} WHERE id = ?`,
            [...values, id]
        );
        return await Order.findById(id);
    },

    countDocuments: async (filters = {}) => {
        const keys = Object.keys(filters);
        let query  = `SELECT COUNT(*) AS total FROM orders o`;
        const vals = [];

        if (keys.length > 0) {
            const where = keys.map(k => `o.${k} = ?`).join(' AND ');
            query += ` WHERE ${where}`;
            vals.push(...keys.map(k => filters[k]));
        }

        const [[{ total }]] = await pool.query(query, vals);
        return Number(total);
    },

    // ── Admin: paginated search with filters ──────────────────────────────
    adminFind: async ({ filters = {}, search, sortBy, sortOrder, page, limit }) => {
        const vals  = [];
        const where = [];

        if (filters.status)        { where.push(`o.status = ?`);        vals.push(filters.status); }
        if (filters.paymentStatus) { where.push(`o.paymentStatus = ?`); vals.push(filters.paymentStatus); }
        if (filters.paymentMethod) { where.push(`o.paymentMethod = ?`); vals.push(filters.paymentMethod); }
        if (filters.dateFrom)      { where.push(`o.createdAt >= ?`);    vals.push(filters.dateFrom); }
        if (filters.dateTo)        { where.push(`o.createdAt <= ?`);    vals.push(filters.dateTo); }

        if (search) {
            where.push(`(o.orderNumber LIKE ? OR u.fullName LIKE ? OR u.email LIKE ?)`);
            const like = `%${search}%`;
            vals.push(like, like, like);
        }

        const whereSQL = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

        const allowedSort  = ['createdAt', 'total', 'orderNumber', 'status', 'paymentStatus'];
        const safeSortBy   = allowedSort.includes(sortBy) ? `o.${sortBy}` : 'o.createdAt';
        const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

        const offset = (Number(page) - 1) * Number(limit);

        // Count query (no pagination)
        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total FROM orders o LEFT JOIN users u ON o.user_id = u.id ${whereSQL}`,
            vals
        );

        // Data query
        const [rows] = await pool.query(
            `${BASE_SELECT} ${whereSQL} ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT ? OFFSET ?`,
            [...vals, Number(limit), offset]
        );

        const orders = await hydrateMany(rows);
        return { orders, total: Number(total) };
    },

    // ── Driver-scoped queries (used by driverController) ──────────────────
    findByDriver: async (driverId) => {
        const [rows] = await pool.query(
            `${BASE_SELECT} WHERE o.assignedDriver_id = ? ORDER BY o.createdAt DESC`,
            [driverId]
        );
        return hydrateMany(rows);
    },

    findByDriverAndId: async (driverId, orderId) => {
        const [rows] = await pool.query(
            `${BASE_SELECT} WHERE o.id = ? AND o.assignedDriver_id = ? LIMIT 1`,
            [orderId, driverId]
        );
        return hydrateOne(rows[0] ?? null);
    },

    // ── Append a status history entry ─────────────────────────────────────
    pushStatusHistory: async (orderId, status, note = '') => {
        await pool.query(
            `INSERT INTO order_status_history (order_id, status, note) VALUES (?, ?, ?)`,
            [orderId, status, note]
        );
    },
};

module.exports = Order;