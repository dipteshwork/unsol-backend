import mongoose = require("mongoose");
import lookupLstSchema from "../schemas/lookupSchema";

const lookupLstModel = mongoose.model(
  "lookupLstModel",
  lookupLstSchema,
  "lookupCollMultiLang"
);
export default lookupLstModel;
