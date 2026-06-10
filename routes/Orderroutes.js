// routes/Order/orderRoutes.js
const express = require('express');
const router  = express.Router();
const {
  placeOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  adminGetAllOrders,
  adminUpdateOrderStatus,
  adminAssignRider,
} = require('../controllers/Ordercontroller');

const { protect, protectUser } = require('../middleware/authMiddleware');

// ── User routes ──────────────────────────────────────────────────────────────
router.post('/place',             protectUser, placeOrder);
router.get('/my',                 protectUser, getMyOrders);
router.get('/my/:id',             protectUser, getOrderById);
router.patch('/my/:id/cancel',    protectUser, cancelOrder);

// ── Admin routes ─────────────────────────────────────────────────────────────
router.get('/admin/all',          protect, adminGetAllOrders);
router.get('/admin/:id',             protect, getOrderById);

router.patch('/admin/:id/status', protect, adminUpdateOrderStatus);
router.patch('/admin/:id/assign-rider', protect, adminAssignRider);


module.exports = router;

// ── Register in server.js / app.js ──────────────────────────────────────────
// app.use('/api/orders', require('./routes/Order/orderRoutes'));