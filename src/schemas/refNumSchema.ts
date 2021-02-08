import { Schema } from "mongoose";

const RefNumCounterTypeSchema = new Schema({
  _id: String,
  regimeName: String,
  seq: { type: Number, default: 1 },
});
export default RefNumCounterTypeSchema;
