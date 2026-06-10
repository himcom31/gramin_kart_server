const express = require('express');
const router  = express.Router();

const {
    addProduct,
    getAllProducts,
    getProductById,
    updateProduct,
    deleteProduct,
} = require('../controllers/Product_management/productController');

const upload                       = require('../config/cloudinary');
const { protect }         = require('../middleware/authMiddleware');
const { addBrand, getBrands, updateBrand, deleteBrand } = require('../controllers/Product_management/brandController');

// ─── Product routes ───────────────────────────────────────────

// POST /api/products/add
router.post(
    '/add',
    protect,
    
    upload.fields([
        { name: 'thumbnail',         maxCount: 1 },
        { name: 'additionalImages',  maxCount: 5 },
    ]),
    addProduct
);

router.get('/allFree', getAllProducts);


// GET /api/products/all
router.get('/all', protect, getAllProducts);

// GET /api/products/:id
router.get('/:id', protect, getProductById);

// PUT /api/products/update/:id
router.put(
    '/update/:id',
    protect,
    
    upload.fields([
        { name: 'thumbnail',         maxCount: 1 },
        { name: 'additionalImages',  maxCount: 5 },
    ]),
    updateProduct
);

// DELETE /api/products/delete/:id
router.delete('/delete/:id', protect,  deleteProduct);

// ─── Brand routes ─────────────────────────────────────────────
router.post(  '/brand/add',      upload.single('logo'), protect, addBrand);
router.get(   '/brand/all',      getBrands);
router.put(   '/brand/update/:id', protect, upload.single('logo'), updateBrand);
router.delete('/brand/delete/:id', protect, deleteBrand);

module.exports = router;