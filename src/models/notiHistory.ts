import NotiHistorySchema from "../schemas/notiHistory";
const mongoose = require("mongoose");
let NotiHistoryModel = mongoose.model("NotificationHistory", NotiHistorySchema, "notificationHistory");

export default NotiHistoryModel;
