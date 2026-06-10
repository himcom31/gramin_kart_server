const Tax = require('../models/Tax');

// @desc Add New Tax
exports.addTax = async (req, res) => {
    try {
        const { taxName, percentage } = req.body;

        const taxExists = await Tax.findOne({ taxName });
        if (taxExists) {
            return res.status(400).json({ success: false, message: "This tax already exists" });
        }

        const tax = await Tax.create({ taxName, percentage });
        res.status(201).json({ success: true, message: "Tax added successfully", tax });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: "This tax already exists" });
        }
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc Get All Taxes
exports.getTaxes = async (req, res) => {
    try {
        const taxes = await Tax.find();   // sorted DESC in model
        res.status(200).json({ success: true, taxes });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc Update Tax
exports.updateTax = async (req, res) => {
    try {
        const tax = await Tax.findById(req.params.id);
        if (!tax) {
            return res.status(404).json({ success: false, message: "Tax not found" });
        }

        const { taxName, percentage } = req.body;

        // Prevent duplicate name on a different row
        if (taxName && taxName !== tax.taxName) {
            const [rows] = await require('../config/db').pool.query(
                `SELECT id FROM taxes WHERE taxName = ? AND id != ? LIMIT 1`,
                [taxName, req.params.id]
            );
            if (rows.length > 0) {
                return res.status(400).json({ success: false, message: "A tax with this name already exists" });
            }
        }

        const updateData = {};
        if (taxName    !== undefined) updateData.taxName    = taxName;
        if (percentage !== undefined) updateData.percentage = percentage;

        const updated = await Tax.update(req.params.id, updateData);
        res.status(200).json({ success: true, message: "Tax updated successfully", tax: updated });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc Toggle Tax Active / Inactive
exports.toggleTaxStatus = async (req, res) => {
    try {
        const tax = await Tax.findById(req.params.id);
        if (!tax) {
            return res.status(404).json({ success: false, message: "Tax not found" });
        }

        const updated = await Tax.toggleStatus(req.params.id);
        res.status(200).json({
            success: true,
            message: `Tax is now ${updated.isActive ? 'active' : 'inactive'}`,
            isActive: updated.isActive
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc Delete Tax
exports.deleteTax = async (req, res) => {
    try {
        const deleted = await Tax.delete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: "Tax not found" });
        }
        res.status(200).json({ success: true, message: "Tax deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc Get Active Taxes + total percentage
exports.getActiveTax = async (req, res) => {
    try {
        const taxes           = await Tax.find({ isActive: true });
        const totalPercentage = taxes.reduce((sum, t) => sum + Number(t.percentage), 0);
        res.json({ success: true, totalPercentage, taxes });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};