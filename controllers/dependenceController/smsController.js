const SmsSetting = require('../../models/dependence/SMSSetting');

const ALLOWED_PROVIDERS = ['Twilio', 'Nexmo', 'Telesign', 'MessageBird','Fast2SMS'];

exports.getAllSmsSettings = async (req, res) => {
    try {
        // $in supported in model's find() — keeps controller unchanged
        const settings = await SmsSetting.find({ providerName: { $in: ALLOWED_PROVIDERS } });
        res.status(200).json({ success: true, settings });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.saveSmsSetting = async (req, res) => {
    try {
        const { providerName, ...fields } = req.body;

        if (!ALLOWED_PROVIDERS.includes(providerName)) {
            return res.status(400).json({
                success: false,
                message: `Provider must be one of: ${ALLOWED_PROVIDERS.join(', ')}`
            });
        }

        // Strip status — only changed via /activate
        delete fields.status;

        const setting = await SmsSetting.findOneAndUpdate(
            { providerName },
            fields
        );

        res.status(200).json({
            success: true,
            message: `${providerName} settings saved successfully.`,
            data:    setting
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.setActiveProvider = async (req, res) => {
    try {
        const { providerName } = req.params;

        if (!ALLOWED_PROVIDERS.includes(providerName)) {
            return res.status(400).json({
                success: false,
                message: `Provider must be one of: ${ALLOWED_PROVIDERS.join(', ')}`
            });
        }

        // Deactivate all, then activate selected — both use single queries
        await SmsSetting.updateMany({ status: false });

        const active = await SmsSetting.findOneAndUpdate(
            { providerName },
            { status: true }
        );

        res.status(200).json({
            success: true,
            message: `${providerName} is now the active SMS provider.`,
            data:    active
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.deactivateAll = async (req, res) => {
    try {
        await SmsSetting.updateMany({ status: false });
        res.status(200).json({ success: true, message: 'All SMS providers deactivated.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};