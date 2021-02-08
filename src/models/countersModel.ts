import mongoose = require("mongoose");
import CountersSchema from "../schemas/countersSchema";

const CountersModel = mongoose.model("CountersModel", CountersSchema, "counters");
export default CountersModel;
