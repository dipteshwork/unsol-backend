import mongoose = require("mongoose");
import nameOrScriptSchema from "../schemas/nameOrScriptSchema";

const nameOrScriptModel = mongoose.model("nameOrScrptSch", nameOrScriptSchema);
export default nameOrScriptModel;
