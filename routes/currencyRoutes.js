const express = require('express');
const router = express.Router();
const { addCurrency, getAllCurrencies } = require('../controllers/currencyController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

router.post('/add', protect, isAdmin, addCurrency);
router.get('/all', getAllCurrencies);

module.exports = router;