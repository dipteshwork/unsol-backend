import mongoose = require("mongoose");

const { Schema } = mongoose;

const NotiEmailSchema = new Schema(
  {
    emailType: String,
    emailTitle: String,
    emailDescription: String,
  },
  { versionKey: false }
);

export default NotiEmailSchema;
