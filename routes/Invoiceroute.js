const express                = require('express');
const router                 = express.Router();
const Order                  = require('../models/Order');
const { generateInvoicePDF } = require('../Invoice/Generateinvoicepdf');
const { protect, protectUser } = require('../middleware/authMiddleware');

const LOGO_PATH = 'src/assets/logo.jpg';
const SHOP_NAME = 'Gramin Kart';

// Helper — shared PDF response logic
async function sendInvoice(order, res) {
    const pdfBuffer = await generateInvoicePDF(order, {
        logoPath: LOGO_PATH,
        shopName: SHOP_NAME,
    });

    const filename      = `Invoice-${order.orderNumber || order.id}.pdf`;
    const forceDownload = res.req.query.download === '1';

    res.setHeader('Content-Type',        'application/pdf');
    res.setHeader('Content-Length',      pdfBuffer.length);
    res.setHeader('Content-Disposition',
        forceDownload
            ? `attachment; filename="${filename}"`
            : `inline; filename="${filename}"`
    );

    return res.end(pdfBuffer);
}

// GET /api/orders/:id/invoice  →  Admin access
router.get('/:id/invoice', protect, async (req, res) => {
    try {
        const order = req.user.role === 'admin'
            ? await Order.findById(req.params.id)
            : await Order.findOne({ id: req.params.id, user_id: req.user.id });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }

        return await sendInvoice(order, res);
    } catch (err) {
        console.error('Invoice generation error:', err);
        return res.status(500).json({ success: false, message: 'Failed to generate invoice.' });
    }
});

// GET /api/orders/:id/invoice/user  →  User access (separate path to avoid route collision)
router.get('/:id/invoice', protectUser, async (req, res) => {
    try {
        const order = await Order.findOne({ id: req.params.id, user_id: req.user.id });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }

        return await sendInvoice(order, res);
    } catch (err) {
        console.error('Invoice generation error:', err);
        return res.status(500).json({ success: false, message: 'Failed to generate invoice.' });
    }
});

module.exports = router;