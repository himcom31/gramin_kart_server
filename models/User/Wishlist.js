const { pool } = require('../../config/db');

/* ── Reuse the same JOIN + shaping logic as the Product model ── */

const BASE_SELECT = `
    SELECT
        p.*,
        c.name        AS category_name,
        c.thumbnail   AS category_thumbnail,
        b.name        AS brand_name,
        a.name        AS createdBy_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands     b ON p.brand_id    = b.id
    LEFT JOIN admins     a ON p.createdBy   = a.id
`;

const shape = (row) => {
    if (!row) return null;
    row.category  = { id: row.category_id, name: row.category_name, thumbnail: row.category_thumbnail };
    row.brand     = { id: row.brand_id,    name: row.brand_name };
    row.createdBy = { id: row.createdBy,   name: row.createdBy_name };
    ['category_name', 'category_thumbnail', 'brand_name', 'createdBy_name'].forEach(k => delete row[k]);
    return row;
};

const attachChildren = async (product) => {
    const [images]     = await pool.query(`SELECT imageUrl FROM product_images     WHERE product_id = ?`, [product.id]);
    const [keywords]   = await pool.query(`SELECT keyword  FROM product_keywords   WHERE product_id = ?`, [product.id]);
    const [attributes] = await pool.query(`SELECT \`key\`, \`value\` FROM product_attributes WHERE product_id = ?`, [product.id]);

    product.additionalImages = images.map(r => r.imageUrl);
    product.metaKeywords     = keywords.map(r => r.keyword);
    product.attributes       = attributes;
    return product;
};

/* ── Normalise numeric fields and add convenience aliases ── */
const normalise = (p) => {
    p.buyingPrice   = p.buyingPrice   != null ? Number(p.buyingPrice)   : null;
    p.sellingPrice  = p.sellingPrice  != null ? Number(p.sellingPrice)  : null;
    p.discountPrice = p.discountPrice != null ? Number(p.discountPrice) : null;
    // convenience aliases expected by WishlistCard / ProductCard
    p.image         = p.thumbnail;
    p.price         = p.sellingPrice;
    p.oldPrice      = p.buyingPrice;
    p.stock         = p.stockQuantity;
    return p;
};

/* ── Core query: wishlist rows → full product objects ── */
const getWishlistWithProducts = async (userId) => {
    // 1. Get product IDs in the user's wishlist
    const [wishlistRows] = await pool.query(`
        SELECT product_id
        FROM user_wishlist
        WHERE user_id = ?
        ORDER BY createdAt ASC
    `, [userId]);

    if (wishlistRows.length === 0) {
        return { user_id: userId, products: [] };
    }

    const productIds = wishlistRows.map(r => r.product_id);

    // 2. Fetch full product data with JOINs (same as Product.findById)
    const [rows] = await pool.query(
        `${BASE_SELECT} WHERE p.id IN (?)`,
        [productIds]
    );

    // 3. Attach child rows + normalise each product
    const products = await Promise.all(
        rows.map(async (row) => {
            const shaped    = shape(row);
            const withKids  = await attachChildren(shaped);
            return normalise(withKids);
        })
    );

    // 4. Preserve the original wishlist order
    const ordered = productIds
        .map(id => products.find(p => p.id === id))
        .filter(Boolean);

    return { user_id: userId, products: ordered };
};

/* ── Model ── */
const Wishlist = {
    findByUser:    (userId)              => getWishlistWithProducts(userId),
    addProduct:    async (userId, productId) => {
        await pool.query(
            `INSERT IGNORE INTO user_wishlist (user_id, product_id) VALUES (?, ?)`,
            [userId, productId]
        );
        return getWishlistWithProducts(userId);
    },
    removeProduct: async (userId, productId) => {
        await pool.query(
            `DELETE FROM user_wishlist WHERE user_id = ? AND product_id = ?`,
            [userId, productId]
        );
        return getWishlistWithProducts(userId);
    },
};

module.exports = Wishlist;