const { pool } = require('../config/db');

const createNotificationTables = async () => {

    await pool.query(`
        CREATE TABLE IF NOT EXISTS notifications (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            title        VARCHAR(500)  NOT NULL,
            body         TEXT          NOT NULL,
            image        VARCHAR(500)  DEFAULT NULL,
            sentTo       ENUM('All', 'Specific') DEFAULT 'All',
            status       ENUM('Sent', 'Failed', 'Partial') DEFAULT 'Sent',
            successCount INT           DEFAULT NULL,
            failureCount INT           DEFAULT NULL,
            pruned       INT           DEFAULT NULL,
            createdBy    INT           DEFAULT NULL,
            createdAt    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
            updatedAt    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_createdAt (createdAt DESC),
            FOREIGN KEY (createdBy) REFERENCES admins(id) ON DELETE SET NULL
        )
    `);

    // Replaces userIds: [ObjectId] embedded array — only populated for 'Specific' sends
    await pool.query(`
        CREATE TABLE IF NOT EXISTS notification_users (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            notification_id INT NOT NULL,
            user_id         INT NOT NULL,
            UNIQUE KEY unique_notif_user (notification_id, user_id),
            FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE
        )
    `);
};

createNotificationTables();

/* ── Internal helpers ────────────────────────────────────────────────────── */

const fetchUserIds = async (notificationId) => {
    const [rows] = await pool.query(
        `SELECT user_id FROM notification_users WHERE notification_id = ?`,
        [notificationId]
    );
    return rows.map(r => r.user_id);
};

const hydrateOne = async (row) => {
    if (!row) return null;

    // Re-nest createdBy
    row.createdBy = row.createdBy_id ? {
        id:    row.createdBy_id,
        name:  row.admin_name  ?? null,
        email: row.admin_email ?? null,
    } : null;
    delete row.createdBy_id;
    delete row.admin_name;
    delete row.admin_email;

    row.userIds = await fetchUserIds(row.id);
    return row;
};

const hydrateMany = (rows) => Promise.all(rows.map(hydrateOne));

const BASE_SELECT = `
    SELECT
        n.*,
        n.createdBy AS createdBy_id,
        a.name      AS admin_name,
        a.email     AS admin_email
    FROM notifications n
    LEFT JOIN admins a ON n.createdBy = a.id
`;

/* ── Model methods ───────────────────────────────────────────────────────── */

const Notification = {

    create: async (data) => {
        const {
            title, body, image, sentTo, status,
            successCount, failureCount, pruned,
            createdBy, userIds,
        } = data;

        const [result] = await pool.query(`
            INSERT INTO notifications
                (title, body, image, sentTo, status, successCount, failureCount, pruned, createdBy)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            title,
            body,
            image        ?? null,
            sentTo       ?? 'All',
            status       ?? 'Sent',
            successCount ?? null,
            failureCount ?? null,
            pruned       ?? null,
            createdBy    ?? null,
        ]);

        const notifId = result.insertId;

        // Insert userIds for Specific sends
        if (Array.isArray(userIds) && userIds.length > 0) {
            const rows = userIds.map(uid => [notifId, uid]);
            await pool.query(
                `INSERT IGNORE INTO notification_users (notification_id, user_id) VALUES ?`,
                [rows]
            );
        }

        const [rows] = await pool.query(`${BASE_SELECT} WHERE n.id = ?`, [notifId]);
        return hydrateOne(rows[0]);
    },

    // Paginated history — mirrors .find().sort().skip().limit()
    find: async ({ page = 1, limit = 10 } = {}) => {
        const offset = (page - 1) * limit;
        const [rows] = await pool.query(
            `${BASE_SELECT} ORDER BY n.createdAt DESC LIMIT ? OFFSET ?`,
            [limit, offset]
        );
        return hydrateMany(rows);
    },

    countDocuments: async () => {
        const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM notifications`);
        return Number(total);
    },
};

module.exports = Notification;