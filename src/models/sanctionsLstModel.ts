import mongoose = require("mongoose");
import sanctionsLstSchema from "../schemas/sanctionsLstSchema";

const sanctionsLstModel = mongoose.model(
  "sanctionsLstSch",
  sanctionsLstSchema,
  "ScSanctions"
);
export default sanctionsLstModel;
