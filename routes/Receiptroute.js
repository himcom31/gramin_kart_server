// routes/receiptRoute.js

const express                  = require('express');
const router                   = express.Router();
const Order                    = require('../models/Order');
const { generateReceiptPDF }   = require('../Paymentreceipt/Generatereceiptpdf');
const { protect, protectUser } = require('../middleware/authMiddleware');

const LOGO_PATH = 'src/assets/logo.jpg';
const SHOP_NAME = 'Gramin Kart';

// GET /api/orders/:id/receipt
// Admins see any order; users only see their own
router.get('/:id/receipt', protect, async (req, res) => {
    try {
        // Ownership check based on role
        const order = req.user.role === 'admin'
            ? await Order.findById(req.params.id)
            : await Order.findOne({ id: req.params.id, user_id: req.user.id });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        console.log(`[Receipt] Generating receipt for order: ${order.orderNumber}`);

        const pdfBuffer = await generateReceiptPDF(order, LOGO_PATH);

        const filename = `Receipt-${order.orderNumber || order.id}.pdf`;  // id not _id

        res.setHeader('Content-Type',   'application/pdf');
        res.setHeader('Content-Length', pdfBuffer.length);
        res.setHeader('Content-Disposition',
            req.query.download === '1'
                ? `attachment; filename="${filename}"`
                : `inline; filename="${filename}"`
        );

        return res.end(pdfBuffer);
    } catch (err) {
        console.error('[Receipt] Generation error:', err);
        res.status(500).json({ message: 'Receipt generation failed', error: err.message });
    }
});


router.get('/:id/receipt', protectUser, async (req, res) => {
    try {
        // Ownership check based on role
        const order = req.user.role === 'admin'
            ? await Order.findById(req.params.id)
            : await Order.findOne({ id: req.params.id, user_id: req.user.id });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        console.log(`[Receipt] Generating receipt for order: ${order.orderNumber}`);

        const pdfBuffer = await generateReceiptPDF(order, LOGO_PATH);

        const filename = `Receipt-${order.orderNumber || order.id}.pdf`;  // id not _id

        res.setHeader('Content-Type',   'application/pdf');
        res.setHeader('Content-Length', pdfBuffer.length);
        res.setHeader('Content-Disposition',
            req.query.download === '1'
                ? `attachment; filename="${filename}"`
                : `inline; filename="${filename}"`
        );

        return res.end(pdfBuffer);
    } catch (err) {
        console.error('[Receipt] Generation error:', err);
        res.status(500).json({ message: 'Receipt generation failed', error: err.message });
    }
});

module.exports = router;