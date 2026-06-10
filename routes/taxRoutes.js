const express = require('express');
const router = express.Router();
const {
    addTax,
    getTaxes,
    updateTax,
    toggleTaxStatus,
    deleteTax,
    getActiveTax
} = require('../controllers/taxController');
const { protect } = require('../middleware/authMiddleware');

router.post('/add',               protect, addTax);
router.get('/all',                getTaxes);
router.put('/update/:id',         protect, updateTax);
router.patch('/toggle/:id',       protect, toggleTaxStatus);
router.delete('/delete/:id',      protect, deleteTax);
// taxRoutes.js — add one line
router.get('/active', getTaxes);   // already exists — reuse, or add:
router.get('/active-rate', getActiveTax);   // ← new

module.exports = router;