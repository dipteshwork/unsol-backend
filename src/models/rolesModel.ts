import mongoose = require("mongoose");
import RolesSchema from "../schemas/rolesSchema";

const RolesModel = mongoose.model("Roles", RolesSchema, "roles");
export default RolesModel;
