const { pool } = require('../config/db');

const createBlogTables = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS blogs (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            title       VARCHAR(255) NOT NULL,
            category_id INT          NOT NULL,
            thumbnail   VARCHAR(500) NOT NULL,
            description LONGTEXT     NOT NULL,
            author_id   INT,
            isActive    BOOLEAN      DEFAULT true,
            createdAt   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
            updatedAt   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
            FOREIGN KEY (author_id)   REFERENCES admins(id)     ON DELETE SET NULL
        )
    `);

    // tags — one row per tag, linked to blog
    await pool.query(`
        CREATE TABLE IF NOT EXISTS blog_tags (
            id        INT AUTO_INCREMENT PRIMARY KEY,
            blog_id   INT          NOT NULL,
            tag       VARCHAR(100) NOT NULL,
            FOREIGN KEY (blog_id) REFERENCES blogs(id) ON DELETE CASCADE
        )
    `);
};

createBlogTables();

/* ── Internal helpers ────────────────────────────────────────────────────── */

const insertTags = async (blogId, tags = []) => {
    if (tags.length === 0) return;
    const rows = tags.map(t => [blogId, t]);
    await pool.query(`INSERT INTO blog_tags (blog_id, tag) VALUES ?`, [rows]);
};

const deleteTags = async (blogId) => {
    await pool.query(`DELETE FROM blog_tags WHERE blog_id = ?`, [blogId]);
};

const attachTags = async (blog) => {
    const [rows] = await pool.query(
        `SELECT tag FROM blog_tags WHERE blog_id = ?`, [blog.id]
    );
    blog.tags = rows.map(r => r.tag);
    return blog;
};

// JOIN query — mirrors Mongoose .populate('category','name') .populate('author','name')
const BASE_SELECT = `
    SELECT
        b.*,
        c.name  AS category_name,
        a.name  AS author_name
    FROM blogs b
    LEFT JOIN categories c ON b.category_id = c.id
    LEFT JOIN admins     a ON b.author_id   = a.id
`;

const shape = (row) => {
    if (!row) return null;
    row.category = { id: row.category_id, name: row.category_name };
    row.author   = { id: row.author_id,   name: row.author_name   };
    delete row.category_name;
    delete row.author_name;
    return row;
};

/* ── Model methods ───────────────────────────────────────────────────────── */

const Blog = {

    create: async ({ title, category_id, tags, thumbnail, description, author_id, isActive }) => {
        const [result] = await pool.query(
            `INSERT INTO blogs (title, category_id, thumbnail, description, author_id, isActive)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [title, category_id, thumbnail, description, author_id ?? null, isActive ?? true]
        );
        await insertTags(result.insertId, tags);
        const [rows] = await pool.query(`${BASE_SELECT} WHERE b.id = ?`, [result.insertId]);
        return attachTags(shape(rows[0]));
    },

    find: async () => {
        const [rows] = await pool.query(`${BASE_SELECT} ORDER BY b.createdAt DESC`);
        return Promise.all(rows.map(r => attachTags(shape(r))));
    },

    findById: async (id) => {
        const [rows] = await pool.query(`${BASE_SELECT} WHERE b.id = ?`, [id]);
        if (!rows[0]) return null;
        return attachTags(shape(rows[0]));
    },

    findByIdAndUpdate: async (id, data) => {
        const { tags, ...flat } = data;

        if (Object.keys(flat).length > 0) {
            const fields    = Object.keys(flat);
            const setClause = fields.map(f => `${f} = ?`).join(', ');
            const values    = fields.map(f => flat[f]);
            await pool.query(`UPDATE blogs SET ${setClause} WHERE id = ?`, [...values, id]);
        }

        // Replace tags only when explicitly provided
        if (tags !== undefined) {
            await deleteTags(id);
            await insertTags(id, tags);
        }

        const [rows] = await pool.query(`${BASE_SELECT} WHERE b.id = ?`, [id]);
        if (!rows[0]) return null;
        return attachTags(shape(rows[0]));
    },

    toggleStatus: async (id) => {
        const existing = await Blog.findById(id);
        if (!existing) return null;
        await pool.query(`UPDATE blogs SET isActive = NOT isActive WHERE id = ?`, [id]);
        const [rows] = await pool.query(`${BASE_SELECT} WHERE b.id = ?`, [id]);
        return attachTags(shape(rows[0]));
    },

    findByIdAndDelete: async (id) => {
        const existing = await Blog.findById(id);
        if (!existing) return null;
        // ON DELETE CASCADE removes blog_tags automatically
        await pool.query(`DELETE FROM blogs WHERE id = ?`, [id]);
        return existing;
    }
};

module.exports = Blog;