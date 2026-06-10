const { pool } = require('../config/db');

const createTicketIssueTypeTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS ticket_issue_types (
            id        INT AUTO_INCREMENT PRIMARY KEY,
            name      VARCHAR(255) NOT NULL UNIQUE,
            status    BOOLEAN      DEFAULT true,
            createdAt TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
};

createTicketIssueTypeTable();

const TicketIssueType = {

    find: async () => {
        const [rows] = await pool.query(
            `SELECT * FROM ticket_issue_types ORDER BY createdAt DESC`
        );
        return rows;
    },

    findOne: async (filters = {}) => {
        const keys   = Object.keys(filters);
        const where  = keys.map(k => `${k} = ?`).join(' AND ');
        const values = keys.map(k => filters[k]);
        const [rows] = await pool.query(
            `SELECT * FROM ticket_issue_types WHERE ${where} LIMIT 1`, values
        );
        return rows[0] ?? null;
    },

    findById: async (id) => {
        const [rows] = await pool.query(
            `SELECT * FROM ticket_issue_types WHERE id = ? LIMIT 1`, [id]
        );
        return rows[0] ?? null;
    },

    create: async ({ name }) => {
        const [result] = await pool.query(
            `INSERT INTO ticket_issue_types (name) VALUES (?)`, [name]
        );
        const [rows] = await pool.query(
            `SELECT * FROM ticket_issue_types WHERE id = ?`, [result.insertId]
        );
        return rows[0];
    },

    findByIdAndUpdate: async (id, data) => {
        const fields    = Object.keys(data);
        if (fields.length === 0) return await TicketIssueType.findById(id);
        const setClause = fields.map(f => `${f} = ?`).join(', ');
        const values    = fields.map(f => data[f]);

        await pool.query(
            `UPDATE ticket_issue_types SET ${setClause} WHERE id = ?`,
            [...values, id]
        );
        const [rows] = await pool.query(
            `SELECT * FROM ticket_issue_types WHERE id = ?`, [id]
        );
        return rows[0] ?? null;
    },

    toggleStatus: async (id) => {
        await pool.query(
            `UPDATE ticket_issue_types SET status = NOT status WHERE id = ?`, [id]
        );
        const [rows] = await pool.query(
            `SELECT * FROM ticket_issue_types WHERE id = ?`, [id]
        );
        return rows[0] ?? null;
    },

    findByIdAndDelete: async (id) => {
        const existing = await TicketIssueType.findById(id);
        if (!existing) return null;
        await pool.query(`DELETE FROM ticket_issue_types WHERE id = ?`, [id]);
        return existing;
    },
};

module.exports = TicketIssueType;