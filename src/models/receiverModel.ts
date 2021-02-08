import mongoose = require("mongoose");
import ReceiverSchema from "../schemas/receiverSchema";

const ReceiverModel = mongoose.model("NotificationReceiver", ReceiverSchema, "notificationReceiver");
export default ReceiverModel;
