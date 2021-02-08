import mongoose = require("mongoose");
import biometricSchema from "../schemas/biometricSchema";

const BioModel = mongoose.model("BioModel", biometricSchema);
export default BioModel;
