const express = require("express");
const router = express.Router();
const {
  handleRepairDeskWebhook,
} = require("../../controllers/webhooks/repairDesk");

router.post("/handleEvents", handleRepairDeskWebhook);

module.exports = router;
