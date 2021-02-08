import { Schema } from "mongoose";

let SubmissionSchema = new Schema(
  {
    identityMSconfidential: Boolean,
    statement: String,
    statementConfidential: String,
    submittedBy: [String],
    submittedOn: String,
  },
  { versionKey: false, _id: false }
);
export default SubmissionSchema;
