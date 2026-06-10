const express = require('express');
const router = express.Router();
const upload = require('../config/cloudinary');
const {
  createDriver,
  toggleStatus,
  getAllDrivers,
  getDriverById,
  updateDriver,
  loginDriver,
  getDriverOrders,
  getDriverOrderById,
  markDelivered,
  confirmPickup,           // ← ADD
  updateDriverOrderStatus, // ← ADD
} = require('../controllers/driverController');
const { protect, isAdmin } = require('../middleware/authMiddleware');
const { protectDriver } = require('../middleware/driverAuthMiddleware');

router.post('/login', loginDriver);
router.get('/my-orders',         protectDriver, getDriverOrders);
router.get('/my-orders/:id',     protectDriver, getDriverOrderById);
router.patch('/my-orders/:id/deliver', protectDriver, upload.single('proofImage'), markDelivered);
router.patch('/my-orders/:id/pickup', protectDriver, upload.single('pickupProof'), confirmPickup);
router.patch('/my-orders/:id/status', protectDriver, updateDriverOrderStatus);

// Add Driver with Profile Image
router.post('/add', protect, upload.single('profileImage'), createDriver);

// Get All Drivers
router.get('/all', protect, getAllDrivers);

// Get Single Driver by ID
router.get('/:id', protect, getDriverById);

// Update Driver by ID
router.put('/:id', protect, upload.single('profileImage'), updateDriver);

// Toggle Online/Offline Status
router.patch('/status/:id', protect, toggleStatus);

router.get('/my-orders',         protectDriver, getDriverOrders);
router.get('/my-orders/:id',     protectDriver, getDriverOrderById);
router.patch('/my-orders/:id/deliver', protectDriver, upload.single('proofImage'), markDelivered);

module.exports = router;