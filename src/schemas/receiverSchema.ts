import { Schema } from "mongoose";

const ReceiverSchema = new Schema(
  {
    roles: { type: [String] },
    userEmail: String,
    userName: String,
    langs: { type: [String] },
    regimes: { type: [String] },
  },
  { versionKey: false }
);

export default ReceiverSchema;
