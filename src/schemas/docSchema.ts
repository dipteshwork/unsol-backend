import { Schema } from "mongoose";

let documentSchema = new Schema(
  {
    document: [
      {
        docNumber: String,
        docType1: String,
        docType2: String,
        documentType: String,
        expDate: String,
        issuedCity: String,
        issuedCountry: String,
        issuedDate: String,
        issuingCountry: String,
        note: String,
      },
    ],
  },
  { versionKey: false, _id: false }
);
export default documentSchema;
