const express = require("express");
const router = express.Router();
const {
  handleCustomerCreation,
  handleAppointmentBooked,
} = require("../../controllers/webhooks/highlevel");

router.post("/customerCreated/sync", handleCustomerCreation);
router.post("/appointmentBooked/sync", handleAppointmentBooked);

module.exports = router;
