import mongoose = require("mongoose");

const { Schema } = mongoose;

const NotiHistory = new Schema(
  {
    subject: String,
    content: String,
    recipient: [],
    sent: Boolean,
  },
  { versionKey: false }
);

export default NotiHistory;
