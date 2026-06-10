const express = require('express');
const router = express.Router();
const upload = require('../config/cloudinary');
const {
    getAllGatewaySettings,
    addPaymentSettings,
    updatePaymentSettings,
    toggleGatewayStatus,
    getActiveGateways,
    processPayment,
    verifyPayment,
} = require('../controllers/dependenceController/paymentSettingController');
const { protect } = require('../middleware/authMiddleware');

// Admin — manage gateways
router.get('/all',                protect, getAllGatewaySettings);
router.post('/add',               protect, upload.single('logo'), addPaymentSettings);
router.post('/update',            protect, upload.single('logo'), updatePaymentSettings);
router.patch('/toggle/:gatewayName', protect,toggleGatewayStatus);

// Public — active gateways for checkout
router.get('/active', getActiveGateways);

// User — payment flow
router.post('/process', protect, processPayment);
router.post('/verify',  protect, verifyPayment);

module.exports = router;