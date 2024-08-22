const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    user_id: String,
    eventType: {
      type: String,
      required: true,
      enum: ["Success", "Failure"],
    },
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
