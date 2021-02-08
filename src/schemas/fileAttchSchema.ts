import mongoose from "mongoose";
import { Schema } from "mongoose";

var FileSchema = new Schema(
  {
    _id: mongoose.Types.ObjectId, // unique id for the photo; will come in useful if we need to use GRidFS for bigger files
    caption: String,
    width: Number,
    height: Number,
    createdTime: Number,
    expiredTime: Number,
    userEmail: String, // may not be required
    region: String, // could be used as a shard key
    containerId: String, // could put the idTab here -- may come in useful if we need to use GridFS for bigger files
    attchmntName: String,
    contentType: String,
    size: Number,
    attchmnt: {
      type: Buffer,
      required: true,
    },
  },
  { autoIndex: true }
);
export default FileSchema;
