const ActivityLog = require("../models/activity");

// Get all activity logs
const getActivityLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 250;
    const skip = (page - 1) * limit;
    const activityLogs = await ActivityLog.find()
      .sort([["createdAt", "descending"]])
      .skip(skip)
      .limit(limit);

    // console.log(activityLogs);
    res.status(200).json({ data: activityLogs });
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  getActivityLogs,
};
