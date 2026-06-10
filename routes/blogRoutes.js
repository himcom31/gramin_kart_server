const express = require('express');
const router = express.Router();
const upload = require('../config/cloudinary');
const {
    addBlog,
    getAllBlogs,
    getBlogById,
    updateBlog,
    toggleBlogStatus,
    deleteBlog
} = require('../controllers/blogController');
const { protect } = require('../middleware/authMiddleware');

router.post('/add', protect, upload.single('thumbnail'), addBlog);
router.get('/all', getAllBlogs);
router.get('/:id', getBlogById);
router.put('/update/:id', protect, upload.single('thumbnail'), updateBlog);
router.patch('/toggle-status/:id', protect, toggleBlogStatus);
router.delete('/delete/:id', protect, deleteBlog);

module.exports = router;