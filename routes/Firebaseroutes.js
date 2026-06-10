const express = require('express');
const router  = express.Router();

const {
    upload,
    getFirebaseStatus,
    uploadFirebaseConfig,
    registerFcmToken,
    sendPushNotification,
    broadcastNotification,
} = require('../controllers/dependenceController/Firebasecontroller');

const { protect, isAdmin } = require('../middleware/authMiddleware');

router.get('/status',          protect, isAdmin, getFirebaseStatus);
router.post('/upload-config',  protect, isAdmin, upload.single('serviceAccount'), uploadFirebaseConfig);
router.post('/send',           protect, isAdmin, sendPushNotification);
router.post('/broadcast',      protect, isAdmin, broadcastNotification);
router.post('/register-token', protect, registerFcmToken);

module.exports = router;