const { pool } = require('../config/db');

const createDriverTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS drivers (
            id                   INT AUTO_INCREMENT PRIMARY KEY,
            fullName             VARCHAR(255)  NOT NULL,
            email                VARCHAR(255)  NOT NULL UNIQUE,
            phone                VARCHAR(20)   NOT NULL UNIQUE,
            password             VARCHAR(255),
            profileImage         VARCHAR(500),
            gender               ENUM('Male', 'Female', 'Other') DEFAULT 'Male',
            dateOfBirth          VARCHAR(20),
            drivingLicense       VARCHAR(100),
            vehicleType          ENUM('Bike', 'Scooter', 'Cycle', 'Mini Truck') NOT NULL,
            vehicleNumber        VARCHAR(50)   DEFAULT NULL,
            isOnline             BOOLEAN       DEFAULT false,
            currentLat           DECIMAL(10,7) DEFAULT NULL,
            currentLng           DECIMAL(10,7) DEFAULT NULL,
            totalOrdersDelivered INT           DEFAULT 0,
            totalEarnings        DECIMAL(10,2) DEFAULT 0,
            rating               DECIMAL(3,2)  DEFAULT 5,
            identityType         ENUM('Aadhar', 'Driving_License', 'PAN') NOT NULL,
            identityNumber       VARCHAR(100)  NOT NULL,
            isActive             BOOLEAN       DEFAULT true,
            createdAt            TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
            updatedAt            TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
};

createDriverTable();

/* ── Internal helper ─────────────────────────────────────────────────────── */
const shape = (row) => {
    if (!row) return null;
    row.currentLocation = {
        lat: row.currentLat ?? null,
        lng: row.currentLng ?? null,
    };
    delete row.currentLat;
    delete row.currentLng;
    return row;
};

/* ── Model methods ───────────────────────────────────────────────────────── */
const Driver = {

    create: async (data) => {
        const { currentLocation, ...flat } = data;
        if (currentLocation) {
            flat.currentLat = currentLocation.lat ?? null;
            flat.currentLng = currentLocation.lng ?? null;
        }

        const fields       = Object.keys(flat);
        const placeholders = fields.map(() => '?').join(', ');
        const values       = fields.map(f => flat[f]);

        const [result] = await pool.query(
            `INSERT INTO drivers (${fields.join(', ')}) VALUES (${placeholders})`,
            values
        );
        const [rows] = await pool.query(`SELECT * FROM drivers WHERE id = ?`, [result.insertId]);
        return shape(rows[0]);
    },

    find: async (filters = {}) => {
        const keys = Object.keys(filters);
        let query  = `SELECT * FROM drivers`;
        const vals = [];

        if (keys.length > 0) {
            const where = keys.map(k => `${k} = ?`).join(' AND ');
            query += ` WHERE ${where}`;
            vals.push(...keys.map(k => filters[k]));
        }

        query += ` ORDER BY createdAt DESC`;
        const [rows] = await pool.query(query, vals);
        return rows.map(shape);
    },

    findOne: async (filters = {}) => {
        // Supports { $or: [...] } pattern
        if (filters.$or) {
            const conditions = filters.$or.map(f => {
                const [key] = Object.keys(f);
                return { key, value: f[key] };
            });
            const where  = conditions.map(c => `${c.key} = ?`).join(' OR ');
            const values = conditions.map(c => c.value);
            const [rows] = await pool.query(
                `SELECT * FROM drivers WHERE ${where} LIMIT 1`, values
            );
            return shape(rows[0]) ?? null;
        }

        const keys   = Object.keys(filters);
        const where  = keys.map(k => `${k} = ?`).join(' AND ');
        const values = keys.map(k => filters[k]);
        const [rows] = await pool.query(
            `SELECT * FROM drivers WHERE ${where} LIMIT 1`, values
        );
        return shape(rows[0]) ?? null;
    },

    findById: async (id) => {
        const [rows] = await pool.query(`SELECT * FROM drivers WHERE id = ? LIMIT 1`, [id]);
        return shape(rows[0]) ?? null;
    },

    findByIdAndUpdate: async (id, data) => {
        const { currentLocation, $inc, ...flat } = data;

        if (currentLocation) {
            flat.currentLat = currentLocation.lat ?? null;
            flat.currentLng = currentLocation.lng ?? null;
        }

        // Handle $inc (e.g. totalOrdersDelivered: 1)
        if ($inc) {
            for (const [field, amount] of Object.entries($inc)) {
                await pool.query(
                    `UPDATE drivers SET ${field} = ${field} + ? WHERE id = ?`,
                    [amount, id]
                );
            }
        }

        if (Object.keys(flat).length > 0) {
            const setClause = Object.keys(flat).map(f => `${f} = ?`).join(', ');
            const values    = Object.keys(flat).map(f => flat[f]);
            await pool.query(
                `UPDATE drivers SET ${setClause} WHERE id = ?`,
                [...values, id]
            );
        }

        const [rows] = await pool.query(`SELECT * FROM drivers WHERE id = ?`, [id]);
        return shape(rows[0]) ?? null;
    },

    findByIdAndDelete: async (id) => {
        const existing = await Driver.findById(id);
        if (!existing) return null;
        await pool.query(`DELETE FROM drivers WHERE id = ?`, [id]);
        return existing;
    },

    toggleOnline: async (id) => {
        await pool.query(
            `UPDATE drivers SET isOnline = NOT isOnline WHERE id = ?`, [id]
        );
        const [rows] = await pool.query(`SELECT * FROM drivers WHERE id = ?`, [id]);
        return shape(rows[0]) ?? null;
    }
};

module.exports = Driver;