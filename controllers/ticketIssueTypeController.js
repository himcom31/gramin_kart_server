const TicketIssueType = require('../models/ticketIssueType');

exports.getAllIssueTypes = async (req, res) => {
    try {
        const types = await TicketIssueType.find();
        res.json({ success: true, types });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.createIssueType = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name?.trim()) {
            return res.status(400).json({ success: false, message: "Name is required" });
        }

        const exists = await TicketIssueType.findOne({ name: name.trim() });
        if (exists) {
            return res.status(400).json({ success: false, message: "Issue type already exists" });
        }

        const type = await TicketIssueType.create({ name: name.trim() });
        res.status(201).json({ success: true, type });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: "Issue type already exists" });
        }
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateIssueType = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name?.trim()) {
            return res.status(400).json({ success: false, message: "Name is required" });
        }

        const type = await TicketIssueType.findByIdAndUpdate(
            req.params.id,
            { name: name.trim() }
        );
        if (!type) {
            return res.status(404).json({ success: false, message: "Not found" });
        }

        res.json({ success: true, type });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: "Issue type already exists" });
        }
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.toggleIssueTypeStatus = async (req, res) => {
    try {
        const existing = await TicketIssueType.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ success: false, message: "Not found" });
        }

        const type = await TicketIssueType.toggleStatus(req.params.id);
        res.json({ success: true, type });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteIssueType = async (req, res) => {
    try {
        const type = await TicketIssueType.findByIdAndDelete(req.params.id);
        if (!type) {
            return res.status(404).json({ success: false, message: "Not found" });
        }
        res.json({ success: true, message: "Deleted successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};