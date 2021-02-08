import mongoose = require("mongoose");
import idSchema from "../schemas/idSchema";

const IdModel = mongoose.model("IdModel", idSchema);
export default IdModel;
