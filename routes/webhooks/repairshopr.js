const express = require("express");
const router = express.Router();
const {
  handleCustomerCreation,
  handleTicketStatusChanged,
  handleInvoicePaid,
} = require("../../controllers/webhooks/syncro");

router.post("/customerCreated/sync", handleCustomerCreation);
router.post("/ticketStatusChanged/sync", handleTicketStatusChanged);
router.post("/invoicePaid/sync", handleInvoicePaid);

module.exports = router;
