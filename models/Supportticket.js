const { pool } = require('../config/db');

const createSupportTicketTables = async () => {

    await pool.query(`
        CREATE TABLE IF NOT EXISTS support_tickets (
            id               INT AUTO_INCREMENT PRIMARY KEY,
            ticketNumber     VARCHAR(20)   UNIQUE,
            user_id          INT           NOT NULL,
            orderNumber      VARCHAR(100)  DEFAULT NULL,
            issueType_id     INT           DEFAULT NULL,
            issueTypeName    VARCHAR(255)  DEFAULT NULL,
            subject          VARCHAR(500)  NOT NULL,
            email            VARCHAR(255)  DEFAULT NULL,
            phone            VARCHAR(20)   DEFAULT NULL,
            attachment       VARCHAR(500)  DEFAULT NULL,
            status           ENUM('Pending','Confirm','Completed') DEFAULT 'Pending',
            scheduledAt      DATETIME      DEFAULT NULL,
            customerCanReply BOOLEAN       DEFAULT false,
            createdAt        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
            updatedAt        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Replaces embedded messageSchema array
    await pool.query(`
        CREATE TABLE IF NOT EXISTS support_ticket_messages (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            ticket_id  INT          NOT NULL,
            sender     ENUM('user','admin') NOT NULL,
            message    TEXT         NOT NULL,
            senderName VARCHAR(255) DEFAULT NULL,
            avatar     VARCHAR(500) DEFAULT NULL,
            createdAt  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
            updatedAt  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
        )
    `);
};

createSupportTicketTables();

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const generateTicketNumber = () =>
    Math.floor(1000000 + Math.random() * 9000000).toString();

const fetchMessages = async (ticketId) => {
    const [rows] = await pool.query(
        `SELECT * FROM support_ticket_messages WHERE ticket_id = ? ORDER BY createdAt ASC`,
        [ticketId]
    );
    return rows;
};

const hydrateOne = async (row) => {
    if (!row) return null;

    // Re-nest user if joined
    if (row.user_fullName !== undefined) {
        row.user = row.user_id ? {
            id:       row.user_id,
            fullName: row.user_fullName ?? null,
            name:     row.user_fullName ?? null,
            email:    row.user_email    ?? null,
            phone:    row.user_phone    ?? null,
            avatar:   row.user_avatar   ?? null,
        } : null;
        delete row.user_fullName;
        delete row.user_email;
        delete row.user_phone;
        delete row.user_avatar;
    }

    row.messages = await fetchMessages(row.id);
    return row;
};

const hydrateMany = (rows) => Promise.all(rows.map(hydrateOne));

const BASE_SELECT = `
    SELECT
        t.*,
        u.fullName AS user_fullName,
        u.email    AS user_email,
        u.phone    AS user_phone,
        u.avatar   AS user_avatar
    FROM support_tickets t
    LEFT JOIN users u ON t.user_id = u.id
`;

/* ── Model ───────────────────────────────────────────────────────────────── */

const SupportTicket = {

    create: async ({ user, orderNumber, issueType, issueTypeName, subject, email, phone, attachment, messages }) => {
        const ticketNumber = generateTicketNumber();

        const [result] = await pool.query(`
            INSERT INTO support_tickets
                (ticketNumber, user_id, orderNumber, issueType_id, issueTypeName,
                 subject, email, phone, attachment)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            ticketNumber,
            user,
            orderNumber  ?? null,
            issueType    ?? null,
            issueTypeName ?? null,
            subject,
            email        ?? null,
            phone        ?? null,
            attachment   ?? null,
        ]);

        const ticketId = result.insertId;

        // Insert initial messages if any
        if (Array.isArray(messages) && messages.length > 0) {
            const msgRows = messages.map(m => [ticketId, m.sender, m.message, m.senderName ?? null, m.avatar ?? null]);
            await pool.query(
                `INSERT INTO support_ticket_messages (ticket_id, sender, message, senderName, avatar) VALUES ?`,
                [msgRows]
            );
        }

        const [rows] = await pool.query(`${BASE_SELECT} WHERE t.id = ?`, [ticketId]);
        return hydrateOne(rows[0]);
    },

    find: async (filters = {}) => {
        const keys = Object.keys(filters);
        let query  = BASE_SELECT;
        const vals = [];

        if (keys.length > 0) {
            const where = keys.map(k => `t.${k} = ?`).join(' AND ');
            query += ` WHERE ${where}`;
            vals.push(...keys.map(k => filters[k]));
        }

        query += ` ORDER BY t.createdAt DESC`;
        const [rows] = await pool.query(query, vals);
        return hydrateMany(rows);
    },

    findById: async (id) => {
        const [rows] = await pool.query(`${BASE_SELECT} WHERE t.id = ? LIMIT 1`, [id]);
        return hydrateOne(rows[0] ?? null);
    },

    findOne: async (filters = {}) => {
        const keys   = Object.keys(filters);
        const where  = keys.map(k => `t.${k} = ?`).join(' AND ');
        const values = keys.map(k => filters[k]);
        const [rows] = await pool.query(`${BASE_SELECT} WHERE ${where} LIMIT 1`, values);
        return hydrateOne(rows[0] ?? null);
    },

    findByIdAndUpdate: async (id, data) => {
        const fields = Object.keys(data);
        if (fields.length === 0) return await SupportTicket.findById(id);
        const setClause = fields.map(f => `${f} = ?`).join(', ');
        const values    = fields.map(f => data[f]);

        await pool.query(
            `UPDATE support_tickets SET ${setClause} WHERE id = ?`,
            [...values, id]
        );
        return await SupportTicket.findById(id);
    },

    // Append a message to a ticket
    pushMessage: async (ticketId, { sender, message, senderName, avatar }) => {
        await pool.query(
            `INSERT INTO support_ticket_messages (ticket_id, sender, message, senderName, avatar) VALUES (?, ?, ?, ?, ?)`,
            [ticketId, sender, message, senderName ?? null, avatar ?? null]
        );
    },

    toggleMessaging: async (id) => {
        await pool.query(
            `UPDATE support_tickets SET customerCanReply = NOT customerCanReply WHERE id = ?`, [id]
        );
        const [rows] = await pool.query(`SELECT customerCanReply FROM support_tickets WHERE id = ?`, [id]);
        return rows[0]?.customerCanReply ?? false;
    },

    countDocuments: async (filters = {}) => {
        const keys = Object.keys(filters);
        let query  = `SELECT COUNT(*) AS total FROM support_tickets t`;
        const vals = [];

        if (keys.length > 0) {
            const where = keys.map(k => `t.${k} = ?`).join(' AND ');
            query += ` WHERE ${where}`;
            vals.push(...keys.map(k => filters[k]));
        }

        const [[{ total }]] = await pool.query(query, vals);
        return Number(total);
    },
};

module.exports = SupportTicket;