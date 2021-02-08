import mongoose = require("mongoose");
import RefNumCounterTypeSchema from "../schemas/refNumSchema";

const RefNumCounterModel = mongoose.model(
  "RefNumCounterModel",
  RefNumCounterTypeSchema,
  "regimes.refNumCounter" // third parameter to the right is the name of the collection that stores the reference numbers
);
export default RefNumCounterModel;
