const express = require("express");
const router = express.Router();
const {
  handleCustomerCreation,
  handleTicketStatusChanged,
  handleInvoicePaid,
  handleTicketCreated,
} = require("../../controllers/webhooks/syncro");

router.post("/customerCreated/sync", handleCustomerCreation);
router.post("/ticketCreated/sync", handleTicketCreated);
router.post("/ticketStatusChanged/sync", handleTicketStatusChanged);
router.post("/invoicePaid/sync", handleInvoicePaid);

module.exports = router;
