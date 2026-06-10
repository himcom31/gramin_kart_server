const { pool } = require('../../config/db');

const createCartTable = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS cart_items (
                id         INT AUTO_INCREMENT PRIMARY KEY,
                user_id    INT NOT NULL,
                product_id INT NOT NULL,
                quantity   INT NOT NULL DEFAULT 1,
                createdAt  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_cart_item (user_id, product_id),
                FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
            )
        `);
        console.log('cart_items table ready.');
    } catch (err) {
        console.error('Cart table creation failed:', err.message);
    }
};

createCartTable();

const getCartWithProducts = async (userId) => {
    const [items] = await pool.query(`
        SELECT
            ci.id, ci.user_id, ci.product_id, ci.quantity,
            p.name, p.thumbnail,
            p.buyingPrice, p.sellingPrice, p.discountPrice,
            p.stockQuantity, p.unit
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.user_id = ?
        ORDER BY ci.createdAt ASC
    `, [userId]);

    return {
        user_id: userId,
        items: items.map(row => ({
            id:       row.id,
            quantity: row.quantity,
            product: {
                id:            row.product_id,
                name:          row.name,
                thumbnail:     row.thumbnail,
                image:         row.thumbnail,
                buyingPrice:   row.buyingPrice   != null ? Number(row.buyingPrice)   : null,
                sellingPrice:  row.sellingPrice  != null ? Number(row.sellingPrice)  : null,
                discountPrice: row.discountPrice != null ? Number(row.discountPrice) : null,
                price:         row.sellingPrice  != null ? Number(row.sellingPrice)  : null,
                stockQuantity: row.stockQuantity,
                unit:          row.unit,
            },
        })),
    };
};

const Cart = {

    findByUser: async (userId) => {
        return await getCartWithProducts(userId);
    },

    addOrIncrement: async (userId, productId, quantity = 1) => {
        await pool.query(`
            INSERT INTO cart_items (user_id, product_id, quantity)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
        `, [userId, productId, quantity]);

        return await getCartWithProducts(userId);
    },

    updateQuantity: async (userId, productId, quantity) => {
        if (quantity <= 0) {
            await pool.query(
                `DELETE FROM cart_items WHERE user_id = ? AND product_id = ?`,
                [userId, productId]
            );
        } else {
            await pool.query(
                `UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?`,
                [quantity, userId, productId]
            );
        }
        return await getCartWithProducts(userId);
    },

    removeItem: async (userId, productId) => {
        await pool.query(
            `DELETE FROM cart_items WHERE user_id = ? AND product_id = ?`,
            [userId, productId]
        );
        return await getCartWithProducts(userId);
    },

    findByUserRaw: async (userId) => {
        return await getCartWithProducts(userId);
    },

    clearByUser: async (userId) => {
        await pool.query(
            `DELETE FROM cart_items WHERE user_id = ?`, [userId]
        );
    },
};

module.exports = Cart;