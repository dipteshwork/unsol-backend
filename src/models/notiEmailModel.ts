import mongoose = require("mongoose");
import NotiEmailSchema from "../schemas/notiEmailSchema";

const NotiEmailModel = mongoose.model("NotificationEmail", NotiEmailSchema, "notificationEmail");
export default NotiEmailModel;
