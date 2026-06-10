const BusinessSetting = require('../models/BusinessSetting');

// @desc Get Business Settings
exports.getSettings = async (req, res) => {
    try {
        let settings = await BusinessSetting.findOne();
        if (!settings) {
            settings = await BusinessSetting.create({});
        }
        res.status(200).json({ success: true, settings });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc Save and Update Business Settings
exports.updateSettings = async (req, res) => {
    try {
        const settings = await BusinessSetting.findOneAndUpdate(req.body);
        res.status(200).json({
            success: true,
            message: "Settings updated successfully!",
            settings
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};