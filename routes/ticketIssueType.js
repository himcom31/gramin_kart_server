// routes/ticketIssueType.route.js
const express = require('express');

const {
  getAllIssueTypes,
  createIssueType,
  updateIssueType,
  toggleIssueTypeStatus,
  deleteIssueType,
}= require('../controllers/ticketIssueTypeController.js')
const { protect } =require('../middleware/authMiddleware.js')

const router = express.Router();

router.get(   "/",           getAllIssueTypes);
router.post(  "/",           protect, createIssueType);
router.put(   "/:id",        protect, updateIssueType);
router.patch( "/:id/toggle", protect, toggleIssueTypeStatus);
router.delete("/:id",        protect, deleteIssueType);

module.exports = router;