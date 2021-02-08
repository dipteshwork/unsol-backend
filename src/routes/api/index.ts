const express = require("express");
const router = express.Router();
import * as secCtrl from "../../controllers/securityCtrl";

router.post("/getToken", secCtrl.getJWTToken);

router.use("/security/users", require("./users"));

router.get("/security/getRoles/:filterValue?", secCtrl.retrieveRoles);
router.get("/security/getRole", secCtrl.retrieveRole);
router.post("/security/updateRole", secCtrl.updateRole);
router.post("/security/insertRole", secCtrl.insertRole);
router.post("/security/deleteRole", secCtrl.deleteRole);

router.get("/security/notification/getEmail/:filterValue?", secCtrl.retrieveNotificationEmail);
router.post("/security/notification/updateEmail", secCtrl.updateNotificationEmail);
router.post("/security/notification/insertEmail", secCtrl.insertNotificationEmail);
router.post("/security/notification/deleteEmail", secCtrl.deleteNotificationEmail);

router.get("/security/notification/getReceivers/:filterValue?", secCtrl.retrieveNotificationReceivers);
router.post("/security/notification/updateReceiver", secCtrl.updateNotificationReceiver);
router.post("/security/notification/insertReceiver", secCtrl.insertNotificationReceiver);
router.post("/security/notification/deleteReceiver", secCtrl.deleteNotificationReceiver);

export default router;
