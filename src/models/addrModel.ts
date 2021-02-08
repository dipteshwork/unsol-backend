import mongoose = require("mongoose");
const addrSchema_1 = require("../schemas/addrSchema");

const BioModel = mongoose.model("addrSch", addrSchema_1["default"]);
export default BioModel;
