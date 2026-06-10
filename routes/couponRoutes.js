const express = require('express');
const router = express.Router();
const {
    addCoupon,
    getCoupons,
    updateCoupon,
    deleteCoupon,
    toggleCouponStatus,
    validateCoupon
} = require('../controllers/couponController');
const { protect } = require('../middleware/authMiddleware');

// Admin routes
router.post('/add', protect, addCoupon);
router.get('/all', protect, getCoupons);
router.put('/:id', protect, updateCoupon);
router.delete('/:id', protect, deleteCoupon);
router.patch('/:id/toggle', protect, toggleCouponStatus);

// User route (checkout)
router.post('/validate', protect, validateCoupon);

module.exports = router;