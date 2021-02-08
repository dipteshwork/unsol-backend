import { Schema } from "mongoose";

const RolesSchema = new Schema(
  {
    roles: [
      {
        roleName: String,
        roleDescription: { type: String, default: "N/A" },
        roleWeight: Number,
      },
    ],
  },
  { versionKey: false, _id: false }
);

export default RolesSchema;
