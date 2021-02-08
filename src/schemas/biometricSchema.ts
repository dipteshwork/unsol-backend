import { Schema } from "mongoose";
import mongoose from "mongoose";

let BiometricSchema = new Schema(
  {
    biometric: [
      {
        _id: mongoose.Types.ObjectId,
        biometricType: String,
        value: String,
        biometricAttch: [
          {
            filename: String,
            filesize: Number,
            fileId: mongoose.Types.ObjectId,
            fileTyp: String,
          },
        ],
        note: String,
        tabId: mongoose.Types.ObjectId,
        allBiometricIdForTab: mongoose.Types.ObjectId,
      },
    ],
  },
  { versionKey: false }
); // use the generated _id to be able to quickly delete all the biometric attachments from a given tab.
export default BiometricSchema;
