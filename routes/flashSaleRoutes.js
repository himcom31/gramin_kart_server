const express = require('express');
const router = express.Router();
const upload = require('../config/cloudinary');
const {
    addFlashSale,
    getFlashSales,
    getFlashSaleById,
    updateFlashSale,
    toggleFlashSaleStatus,
    deleteFlashSale,
    addProductToFlashSale,
    updateProductInFlashSale,
    removeProductFromFlashSale,
} = require('../controllers/flashSaleController');
const { protect } = require('../middleware/authMiddleware');

// Flash Sale CRUD
router.post('/add', protect, upload.single('thumbnail'), addFlashSale);
router.get('/all', getFlashSales);
router.get('/:id', getFlashSaleById);
router.put('/update/:id', protect, upload.single('thumbnail'), updateFlashSale);
router.patch('/toggle/:id', protect, toggleFlashSaleStatus);
router.delete('/delete/:id', protect, deleteFlashSale);

// Product Management within a Flash Sale
router.post('/:id/add-product', protect, addProductToFlashSale);
router.put('/:id/update-product/:productId', protect, updateProductInFlashSale);
router.delete('/:id/remove-product/:productId', protect, removeProductFromFlashSale);

module.exports = router;