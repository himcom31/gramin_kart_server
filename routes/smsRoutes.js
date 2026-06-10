const express = require('express');
const router = express.Router();
const {
    getAllSmsSettings,
    saveSmsSetting,
    setActiveProvider,
    deactivateAll,
} = require('../controllers/dependenceController/smsController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

router.get('/all',                        protect, isAdmin, getAllSmsSettings);
router.post('/save',                      protect, isAdmin, saveSmsSetting);
router.put('/activate/:providerName',     protect, isAdmin, setActiveProvider);
router.put('/deactivate-all',             protect, isAdmin, deactivateAll);

module.exports = router;