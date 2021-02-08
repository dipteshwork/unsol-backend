import mongoose = require("mongoose");
import docSchema from "../schemas/docSchema";

const docModel = mongoose.model("docSch", docSchema);
export default docModel;
