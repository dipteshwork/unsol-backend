import mongoose = require("mongoose");
import SubmissionSchema from "../schemas/submissionSchema";

const SubmissionModel = mongoose.model("SubmissionModel", SubmissionSchema);
export default SubmissionModel;
