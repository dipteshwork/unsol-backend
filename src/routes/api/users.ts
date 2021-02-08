const router = require("express").Router();
import * as secCtrl from "../../controllers/securityCtrl";

router.get("/getUsers/:filterValue?", secCtrl.retrieveUsers);
// router.post('/getUser', secCtrl.retrieveUser);
router.post("/getUser", secCtrl.lookupUser);
router.post("/updateUser", secCtrl.updateUser);
router.post("/insertUser", secCtrl.insertUser);
router.post("/deleteUser", secCtrl.deleteUser);

module.exports = router;
