const express = require('express');
const router = express.Router();
const {
    addDeliveryCharge,
    getAllCharges,
    updateDeliveryCharge,
    deleteDeliveryCharge,
    getChargeForQty
} = require('../controllers/deliveryController');
const { protect} = require('../middleware/authMiddleware');

router.post('/add',           protect,  addDeliveryCharge);
router.get('/all',            getAllCharges);                         // public for checkout
router.put('/update/:id',     protect, updateDeliveryCharge);
router.delete('/delete/:id',  protect, deleteDeliveryCharge);
// deliveryRoutes.js — add one line
router.get('/charge-for-qty', getChargeForQty);   // ← new

module.exports = router;