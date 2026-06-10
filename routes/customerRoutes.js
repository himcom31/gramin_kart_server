const express = require('express');
const router = express.Router();
const { addCustomer, getAllCustomers ,updateCustomer,deleteCustomer} = require('../controllers/customerController');
const { protect, isAdmin } = require('../middleware/authMiddleware');
const upload = require('../config/cloudinary');


// Admin only routes
router.post('/add', protect, isAdmin, upload.single('avatar'), addCustomer);
router.get('/all', protect, isAdmin, getAllCustomers);
router.put('/update/:id', protect, isAdmin, updateCustomer);
router.delete('/delete/:id', protect, isAdmin, deleteCustomer);

module.exports = router;