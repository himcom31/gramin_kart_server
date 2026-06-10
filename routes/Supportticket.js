// routes/supportTicket.route.js
const express = require('express');

const {
  createTicket,
  getMyTickets,
  userSendMessage,
  adminGetAllTickets,
  adminGetTicket,
  adminUpdateStatus,
  getMyTicketCounts, // ← add this
  adminSetSchedule,
  adminToggleMessaging,
  adminSendMessage,
} = require('../controllers/SupportticketController.js');
const { protect, protectUser } = require('../middleware/authMiddleware.js')

const router = express.Router();

// ── User routes ──────────────────────────────────────────────────────────────
router.get("/my/counts", protectUser, getMyTicketCounts); // ← add BEFORE /my
router.post("/", protectUser, createTicket);
router.get("/my", protectUser, getMyTickets);
router.post("/:id/message", protectUser, userSendMessage);

// ── Admin routes ─────────────────────────────────────────────────────────────
router.get("/admin/all", protect, adminGetAllTickets);
router.get("/admin/:id", protect, adminGetTicket);
router.patch("/admin/:id/status", protect, adminUpdateStatus);
router.patch("/admin/:id/schedule", protect, adminSetSchedule);
router.patch("/admin/:id/toggle-msg", protect, adminToggleMessaging);
router.post("/admin/:id/reply", protect, adminSendMessage);

module.exports = router;