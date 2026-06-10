const PusherSetting        = require('../models/dependence/PusherSetting');
const triggerRealtimeEvent = require('../utils/pusherTrigger');

// @desc Get current Pusher config
exports.getPusherSetting = async (req, res) => {
    try {
        const setting = await PusherSetting.findOne();
        if (!setting) {
            return res.status(200).json({ success: true, data: null });
        }
        res.status(200).json({ success: true, data: setting });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc Save / update Pusher config (upsert)
exports.savePusherSetting = async (req, res) => {
    try {
        const { appId, key, secret, cluster } = req.body;

        if (!appId || !key || !secret || !cluster) {
            return res.status(400).json({
                success: false,
                error: 'All fields (appId, key, secret, cluster) are required.'
            });
        }

        const setting = await PusherSetting.findOneAndUpdate({ appId, key, secret, cluster });
        res.status(200).json({ success: true, data: setting });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc Toggle Pusher active status
exports.togglePusherStatus = async (req, res) => {
    try {
        const setting = await PusherSetting.findOne();

        if (!setting) {
            return res.status(404).json({
                success: false,
                error: 'Pusher configuration not found. Please save settings first.'
            });
        }

        const updated = await PusherSetting.toggleStatus(setting.id, setting.status);
        res.status(200).json({ success: true, status: updated.status });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc Place order + trigger real-time event
exports.placeOrder = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        // Order save logic goes here...

        await triggerRealtimeEvent('admin-channel', 'new-order', {
            customerName: req.user.name,
            totalAmount:  req.body.amount,
            message:      'A new order has arrived, please check!'
        });

        res.status(201).json({ success: true, message: 'Order Placed' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};