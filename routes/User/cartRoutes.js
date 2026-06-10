const express         = require('express');
const router          = express.Router();
const Cart            = require('../../models/User/Cart');
const { protectUser } = require('../../middleware/authMiddleware');

// GET /api/cart
router.get('/', protectUser, async (req, res) => {
    try {
        const cart = await Cart.findByUser(req.user.id);
        res.json(cart || { items: [] });
    } catch (err) {
        console.error('GET /api/cart error:', err);
        res.status(500).json({ message: err.message });
    }
});

// POST /api/cart/add
router.post('/add', protectUser, async (req, res) => {
    try {
        const { productId, quantity = 1 } = req.body;

        if (!productId) {
            return res.status(400).json({ message: 'productId is required.' });
        }

        const cart = await Cart.addOrIncrement(req.user.id, productId, quantity);
        res.json(cart);
    } catch (err) {
        console.error('POST /api/cart/add error:', err);
        res.status(500).json({ message: err.message });
    }
});

// PUT /api/cart/update/:productId
router.put('/update/:productId', protectUser, async (req, res) => {
    try {
        const { quantity } = req.body;

        if (quantity === undefined || quantity === null) {
            return res.status(400).json({ message: 'quantity is required.' });
        }

        const cart = await Cart.updateQuantity(
            req.user.id,
            req.params.productId,
            Number(quantity)
        );
        res.json(cart);
    } catch (err) {
        console.error('PUT /api/cart/update error:', err);
        res.status(500).json({ message: err.message });
    }
});

// DELETE /api/cart/remove/:productId
router.delete('/remove/:productId', protectUser, async (req, res) => {
    try {
        const cart = await Cart.removeItem(req.user.id, req.params.productId);
        res.json(cart);
    } catch (err) {
        console.error('DELETE /api/cart/remove error:', err);
        res.status(500).json({ message: err.message });
    }
});

// DELETE /api/cart/clear
router.delete('/clear', protectUser, async (req, res) => {
    try {
        await Cart.clearByUser(req.user.id);
        res.json({ message: 'Cart cleared' });
    } catch (err) {
        console.error('DELETE /api/cart/clear error:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;