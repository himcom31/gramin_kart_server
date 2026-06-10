const { pool } = require('../config/db');

const createCurrencyTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS currencies (
            id             INT AUTO_INCREMENT PRIMARY KEY,
            currencyName   VARCHAR(255)  NOT NULL UNIQUE,
            currencySymbol VARCHAR(10)   NOT NULL,
            currencyCode   VARCHAR(10)   NOT NULL,
            exchangeRate   DECIMAL(10,4) NOT NULL DEFAULT 1,
            isDefault      BOOLEAN       DEFAULT false,
            createdAt      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
            updatedAt      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
};

createCurrencyTable();

const Currency = {

    create: async ({ currencyName, currencySymbol, currencyCode, exchangeRate, isDefault }) => {
        const [result] = await pool.query(
            `INSERT INTO currencies (currencyName, currencySymbol, currencyCode, exchangeRate, isDefault)
             VALUES (?, ?, ?, ?, ?)`,
            [
                currencyName,
                currencySymbol,
                currencyCode.toUpperCase(),   // uppercase enforced here (no schema-level hook in MySQL)
                exchangeRate ?? 1,
                isDefault ?? false
            ]
        );
        const [rows] = await pool.query(`SELECT * FROM currencies WHERE id = ?`, [result.insertId]);
        return rows[0];
    },

    find: async () => {
        // isDefault DESC → default currency always first, mirrors .sort({ isDefault: -1 })
        const [rows] = await pool.query(
            `SELECT * FROM currencies ORDER BY isDefault DESC, createdAt DESC`
        );
        return rows;
    },

    // Set all rows isDefault = false before making a new one default
    clearDefault: async () => {
        await pool.query(`UPDATE currencies SET isDefault = false`);
    },
};

module.exports = Currency;