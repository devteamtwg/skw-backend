const express = require("express");
const router = express.Router();
const activityLogsController = require("../controllers/Activity");

router.get("/getActivityLogs", activityLogsController.getActivityLogs);

module.exports = router;
