const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    user_id: String,
    event: String,
    businessName: String,
    eventType: {
      type: String,
      required: true,
      enum: ["Success", "Failure"],
    },
    platform: String,
    message: {
      type: String,
      required: true,
    },
    customData: Object,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ActivityLog", activitySchema);
