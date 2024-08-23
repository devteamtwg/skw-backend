const ActivityLog = require("../models/activity");

// Get all activity logs
const getActivityLogs = async (req, res) => {
  try {
    const activityLogs = await ActivityLog.find();
    // console.log(activityLogs);
    res.status(200).json({ data: activityLogs });
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  getActivityLogs,
};
