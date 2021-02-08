import { Schema } from "mongoose";

let nameOrScriptSchema = new Schema(
  {
    nameType: String,
    order: Number,
    script: String,
    value: String,
  },
  { versionKey: false, _id: false }
);
export default nameOrScriptSchema;
