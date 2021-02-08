import { Schema } from "mongoose";
import addressSchema from "./addrSchema";
import documentSchema from "./docSchema";
import nameOrScriptSchema from "./nameOrScriptSchema";
import biometricSchema from "./biometricSchema";

let identitySchema = new Schema(
  {
    addresses: { address: [addressSchema] },
    biometricData: { biometricInfo: biometricSchema },
    category: String,
    comment: String,
    designations: { designation: [String] },
    dobs: {
      dob: [
        {
          date: String,
          dateFrom: String,
          dateTo: String,
          dobSubset: String,
          dobType: String,
          note: String,
          dobSubsetDte: String,
          dobSubsetType: String,
        },
      ],
    },
    documents: documentSchema,

    entryFeatures: {
      feature: [
        {
          featureType: String,
          status: String,
          value: String,
          note: String,
        },
      ],
      note: String,
    },

    gender: String,
    livingStatus: String,
    names: {
      name: [nameOrScriptSchema],
      nameOrgSpt: [nameOrScriptSchema],
    },

    nationalities: {
      nationality: [
        {
          nation: String,
          nationalNote: String,
        },
      ],
    },

    pobs: {
      pob: [{ address: [addressSchema] }],
    },

    titles: { title: [String] },
    typAttr: String,
    type: String,
  },
  { versionKey: false }
);
export default identitySchema;
