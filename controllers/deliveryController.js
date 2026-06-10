const DeliveryCharge = require('../models/DeliveryCharge');

// @desc Add New Delivery Charge
exports.addDeliveryCharge = async (req, res) => {
    try {
        const { minOrderQty, maxOrderQty, charge } = req.body;

        if (Number(minOrderQty) >= Number(maxOrderQty)) {
            return res.status(400).json({
                success: false,
                message: 'Maximum order quantity must be greater than minimum order quantity'
            });
        }

        const newCharge = await DeliveryCharge.create({
            minOrderQty: Number(minOrderQty),
            maxOrderQty: Number(maxOrderQty),
            charge:      Number(charge)
        });

        res.status(201).json({
            success: true,
            message: 'Delivery charge added successfully',
            data: newCharge
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc Get All Delivery Charges
exports.getAllCharges = async (req, res) => {
    try {
        const charges = await DeliveryCharge.find();
        res.status(200).json({ success: true, charges });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc Update Delivery Charge
exports.updateDeliveryCharge = async (req, res) => {
    try {
        const { minOrderQty, maxOrderQty, charge } = req.body;

        const existing = await DeliveryCharge.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Delivery charge not found' });
        }

        const newMin = minOrderQty !== undefined ? Number(minOrderQty) : existing.minOrderQty;
        const newMax = maxOrderQty !== undefined ? Number(maxOrderQty) : existing.maxOrderQty;

        if (newMin >= newMax) {
            return res.status(400).json({
                success: false,
                message: 'Maximum order quantity must be greater than minimum order quantity'
            });
        }

        const updateData = {};
        if (minOrderQty !== undefined) updateData.minOrderQty = Number(minOrderQty);
        if (maxOrderQty !== undefined) updateData.maxOrderQty = Number(maxOrderQty);
        if (charge      !== undefined) updateData.charge      = Number(charge);

        const updated = await DeliveryCharge.findByIdAndUpdate(req.params.id, updateData);

        res.status(200).json({
            success: true,
            message: 'Delivery charge updated successfully',
            data: updated
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc Delete Delivery Charge
exports.deleteDeliveryCharge = async (req, res) => {
    try {
        const deleted = await DeliveryCharge.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Delivery charge not found' });
        }
        res.status(200).json({ success: true, message: 'Delivery charge deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc Get Charge For a Specific Quantity
exports.getChargeForQty = async (req, res) => {
    try {
        const qty    = Number(req.query.qty) || 1;
        const result = await DeliveryCharge.findForQty(qty);

        res.json({ success: true, charge: result?.charge ?? 0 });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};