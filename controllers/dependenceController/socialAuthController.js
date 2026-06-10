const SocialAuth = require('../../models/dependence/SocialAuth');

exports.getAllSocialSettings = async (req, res) => {
    try {
        const settings = await SocialAuth.find();
        res.status(200).json({ success: true, settings });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.saveSocialSetting = async (req, res) => {
    try {
        const { provider, clientId, clientSecret, redirectUrl } = req.body;

        if (!provider) {
            return res.status(400).json({ success: false, message: 'Provider is required' });
        }

        const setting = await SocialAuth.findOneAndUpdate(
            { provider },
            { clientId, clientSecret, redirectUrl }
        );

        res.status(200).json({
            success: true,
            message: `${provider} settings saved successfully.`,
            data:    setting,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.toggleSocialStatus = async (req, res) => {
    try {
        const { provider } = req.params;

        // toggleStatus handles NOT status atomically — no manual fetch + save needed
        const updated = await SocialAuth.toggleStatus(provider);
        if (!updated) {
            return res.status(404).json({ success: false, message: `${provider} settings not found` });
        }

        res.status(200).json({
            success: true,
            message: `${provider} is now ${updated.status ? 'Active' : 'Inactive'}.`,
            status:  updated.status,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};