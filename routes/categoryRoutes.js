const express = require('express');
const router = express.Router();
const upload = require('../config/cloudinary'); 
const { addCategory, getCategories ,updateCategory,deleteCategory} = require('../controllers/categoryController/categoryController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// Route: POST /api/category/add
// Sequence badla hai taaki body parse ho sake
router.post('/add', upload.single('thumbnail'), protect, addCategory);

// Route: GET /api/category/all
router.get('/all', getCategories);


router.put('/:id', protect,  upload.single('thumbnail'), updateCategory);
 
// DELETE /api/category/:id — admin only
router.delete('/:id', protect,  deleteCategory);

module.exports = router;