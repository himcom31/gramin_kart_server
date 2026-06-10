const SupportTicket = require('../models/Supportticket.js');

// ── User: Create ticket ───────────────────────────────────────────────────────
exports.createTicket = async (req, res) => {
    try {
        const { orderNumber, issueType, issueTypeName, subject, email, phone, message } = req.body;
        const attachment = req.file?.path || req.body.attachment || null;

        const ticket = await SupportTicket.create({
            user:         req.user.id,   // MySQL: id not _id
            orderNumber,
            issueType,
            issueTypeName,
            subject,
            email,
            phone,
            attachment,
            messages: message
                ? [{ sender: 'user', message, senderName: req.user.name || req.user.fullName }]
                : [],
        });

        res.status(201).json({ success: true, ticket });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── User: Get my tickets ──────────────────────────────────────────────────────
exports.getMyTickets = async (req, res) => {
    try {
        const tickets = await SupportTicket.find({ user_id: req.user.id });
        res.json({ success: true, tickets });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── User: Send message ────────────────────────────────────────────────────────
exports.userSendMessage = async (req, res) => {
    try {
        const ticket = await SupportTicket.findOne({ id: req.params.id, user_id: req.user.id });
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

        if (!ticket.customerCanReply) {
            return res.status(403).json({ success: false, message: 'Messaging is disabled for this ticket' });
        }

        await SupportTicket.pushMessage(ticket.id, {
            sender:     'user',
            message:    req.body.message,
            senderName: req.user.name || req.user.fullName,
        });

        const updated = await SupportTicket.findById(ticket.id);
        res.json({ success: true, ticket: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── Admin: Get all tickets ────────────────────────────────────────────────────
exports.adminGetAllTickets = async (req, res) => {
    try {
        const { status } = req.query;
        const filters = (status && status !== 'All') ? { status } : {};
        const tickets = await SupportTicket.find(filters);
        res.json({ success: true, tickets });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── Admin: Get single ticket ──────────────────────────────────────────────────
exports.adminGetTicket = async (req, res) => {
    try {
        const ticket = await SupportTicket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
        res.json({ success: true, ticket });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── Admin: Update status ──────────────────────────────────────────────────────
exports.adminUpdateStatus = async (req, res) => {
    try {
        const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, { status: req.body.status });
        if (!ticket) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, ticket });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── Admin: Set schedule ───────────────────────────────────────────────────────
exports.adminSetSchedule = async (req, res) => {
    try {
        const ticket = await SupportTicket.findByIdAndUpdate(
            req.params.id,
            { scheduledAt: req.body.scheduledAt }
        );
        if (!ticket) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, ticket });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── Admin: Toggle customer messaging ─────────────────────────────────────────
exports.adminToggleMessaging = async (req, res) => {
    try {
        const ticket = await SupportTicket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ success: false, message: 'Not found' });

        const customerCanReply = await SupportTicket.toggleMessaging(req.params.id);
        res.json({ success: true, customerCanReply });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── Admin: Send reply ─────────────────────────────────────────────────────────
exports.adminSendMessage = async (req, res) => {
    try {
        const ticket = await SupportTicket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ success: false, message: 'Not found' });

        await SupportTicket.pushMessage(req.params.id, {
            sender:     'admin',
            message:    req.body.message,
            senderName: 'Admin',
        });

        const updated = await SupportTicket.findById(req.params.id);
        res.json({ success: true, ticket: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── User: Get my ticket counts ────────────────────────────────────────────────
exports.getMyTicketCounts = async (req, res) => {
    try {
        const userId = req.user.id;   // MySQL: id not _id

        const [total, open, inProgress, resolved, closed] = await Promise.all([
            SupportTicket.countDocuments({ user_id: userId }),
            SupportTicket.countDocuments({ user_id: userId, status: 'Pending' }),
            SupportTicket.countDocuments({ user_id: userId, status: 'Confirm' }),
            SupportTicket.countDocuments({ user_id: userId, status: 'Completed' }),
            SupportTicket.countDocuments({ user_id: userId, status: 'Completed' }),
        ]);

        res.json({ success: true, counts: { total, open, inProgress, resolved, closed } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};