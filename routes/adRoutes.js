const express = require('express');
const router = express.Router();
const upload = require('../config/cloudinary');
const {
    addAd,
    getAllAds,
    getActiveAds,
    getAdById,
    updateAd,
    toggleAdStatus,
    deleteAd
} = require('../controllers/adController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// Public
// GET /api/ads/active
router.get('/active', getActiveAds);

// Admin protected
// GET  /api/ads           — list all ads
// POST /api/ads/add       — create new ad
router.get('/',  getAllAds);
router.post('/add', protect,  upload.single('image'), addAd);

// GET    /api/ads/:id         — get single ad
// PUT    /api/ads/:id         — update ad (title, image, etc.)
// PATCH  /api/ads/:id/toggle  — toggle active status
// DELETE /api/ads/:id         — delete ad
router.get('/:id',  getAdById);
router.put('/:id',  upload.single('image'), updateAd);
router.patch('/:id/toggle', toggleAdStatus);
router.delete('/:id', deleteAd);

module.exports = router;