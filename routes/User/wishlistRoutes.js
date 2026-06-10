const express         = require('express');
const router          = express.Router();
const Wishlist        = require('../../models/User/Wishlist');
const { protectUser } = require('../../middleware/authMiddleware');

// GET /api/wishlist
router.get('/', protectUser, async (req, res) => {
    try {
        const wishlist = await Wishlist.findByUser(req.user.id);
        res.json(wishlist || { products: [] });
    } catch (err) {
        console.error('GET /api/wishlist error:', err);
        res.status(500).json({ message: err.message });
    }
});

// POST /api/wishlist/add
router.post('/add', protectUser, async (req, res) => {
    try {
        const { productId } = req.body;

        if (!productId) {
            return res.status(400).json({ message: 'productId is required.' });
        }

        const wishlist = await Wishlist.addProduct(req.user.id, productId);
        res.json(wishlist);
    } catch (err) {
        console.error('POST /api/wishlist/add error:', err);
        res.status(500).json({ message: err.message });
    }
});

// DELETE /api/wishlist/remove/:productId
router.delete('/remove/:productId', protectUser, async (req, res) => {
    try {
        const wishlist = await Wishlist.removeProduct(req.user.id, req.params.productId);
        res.json(wishlist);
    } catch (err) {
        console.error('DELETE /api/wishlist/remove error:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;