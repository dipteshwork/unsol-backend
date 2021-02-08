import { Schema } from "mongoose";

let addressSchema = new Schema(
  {
    city: { type: String },
    country: { type: String },
    location: {
      lat: Number,
      lng: Number,
      region: String,
    },
    note: String,
    stateProvince: { type: String },
    street: { type: String },
    zipCode: String,
  },
  { versionKey: false, _id: false }
);
export default addressSchema;
