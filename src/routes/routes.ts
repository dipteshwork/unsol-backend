import express = require("express");
import * as lkUpCtrl from "../controllers/lookupLstCtrl";
import * as getIndivEntryCtrl from "../controllers/getUserCtrl";
import { retrieveUser } from "../controllers/securityCtrl";
import * as docTranslatedCtrl from "../controllers/getTranslationDoc";
import * as testNodeChildprocCtrl from "../controllers/childProcforDownloadableRptCtrl";
import { logg } from "../../config/winston";
import { sendTestEmail } from '../services/mail.service'

const azureJWT = require("azure-jwt-verify");

const azureJWTConfig = {
  JWK_URI: process.env.AZURE_JWK_URI,
  ISS: process.env.AZURE_ISS,
  AUD: process.env.AZURE_AUD,
};

// need a function to look up a user by userID and return that user's UserRole
function isUserInRole(decoded: any) {
  let validRole: boolean = false;
  let usrDecoded = JSON.parse(decoded);
  return new Promise((resolve) => {
    if (usrDecoded["status"] == "success") {
      retrieveUser(usrDecoded.message.email).then((role) => {
        let rolee = role[0].roles;
        rolee.some((tmpRole: any) => {
          if (tmpRole["roleName"] == usrDecoded["message"]["roles"][0]) {
            validRole = true;
            return validRole;
          }
        });
      });
    }
    resolve(validRole);
  });
}

function checkAuth(req, res, next) {
  try {
    const jwtToken = req.headers.authorization.split(" ")[1];
    azureJWT.verify(jwtToken, azureJWTConfig).then(
      function (decoded) {
        res.locals.userRole = decoded;
        // Now here we contact the database to check if the role of the user, matches that in the database
        if (isUserInRole(decoded)) next();
        else res.status(401).json({ message: "Unauthorized user" });
      },
      function (error) {
        logg.info("JWT KO");
        logg.info(error);
        res.status(401).json({ message: "Auth failed" });
      }
    );
  } catch (error) {
    res.status(401).json({ message: "Auth failed", error: error });
  }
}

// const checkAuth = require('../middleware/check-auth');
// const checkRole = require('../middleware/check-role');

var multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
});

const router = express.Router();

router.get("/downloadFileTranslated", docTranslatedCtrl.downloadFile);
router.get("/downloadFile/", testNodeChildprocCtrl.downloadFileNew);
router.get("/getLookupList/:langPrefix/:filterValue?/:filterField?", lkUpCtrl.getLookupList);
router.get("/getStatusAmendment/", getIndivEntryCtrl.getStatusAmendment);
router.get("/getMeasuresLst/:langPrefix/:meas", lkUpCtrl.retrieveMeasures);

router.get("/getIndivByFName/:FName", getIndivEntryCtrl.getIndivEntryByFName);
router.get("/getIndivBySName/:SName", getIndivEntryCtrl.getIndivEntryBySName);

router.get(
  "/getSanctionsList/:langId/:entryStatus/:filterValue?",
  getIndivEntryCtrl.getSanctionsList
);
router.get(
  "/getSanctionsDetails/:langId/:ref/:id/:queryStatus",
  getIndivEntryCtrl.getSanctionDetails
);
router.get(
  "/getSanctionsDetails/:langId/:id/status/:queryStatus/isStatusCurrent/:isStatusCurrent",
  getIndivEntryCtrl.getSanctionDetails
);
router.get(
  "/getSanctionsDetails/:langId/:id",
  getIndivEntryCtrl.getSanctionDetails
); // to show version History; these may have their statusCurrentFlag existing
router.get(
  "/getSanctionsDetails/:langId/:id/amendment/:amendmentCt/amendmentStatus/:amendmentStatus",
  getIndivEntryCtrl.getSanctionDetails
); // to show specific Amendment record as it walks the workflow
router.get(
  "/getSanctionsDetails/:langId/:id/status/:queryStatus/amendmentId/:amendmentId",
  getIndivEntryCtrl.getSanctionDetails
);
router.get(
  "/getSanctionsDetails/:langId/:id/:supersededCt",
  getIndivEntryCtrl.getSanctionDetails
); // to show a Superseded record that used to be an Active record
// make a new controller just for version handling
router.get(
  "/getAllVersions/:entryId/:refNumb",
  getIndivEntryCtrl.getAllVersions
);
router.get("getSoftwareReleaseVersion");
router.get("/findByRefNum/:refNum", getIndivEntryCtrl.findByRefNum);
router.get("/getAttchmnt", getIndivEntryCtrl.getAttchmentByType);
router.get("/retrieveAttachments", getIndivEntryCtrl.getAttchments);
router.get(
  "/getAllAttchmnts/:attchmntTyp",
  getIndivEntryCtrl.getAllAttchmentsByType
);
router.post("/findIndivdualById", getIndivEntryCtrl.findIndividualByID);

router.post("/getJSONSanctionDocs", getIndivEntryCtrl.getRawJSONs);

router.post(
  "/insertInitialSanction",
  upload.array("attch", 12),
  getIndivEntryCtrl.insertInitialSanction
); // create
router.post(
  "/updateSanction",
  upload.array("attch", 12),
  getIndivEntryCtrl.updateSanction
); // Amendment
router.post(
  "/markTranslation",
  upload.array("attch", 12),
  getIndivEntryCtrl.markTranslation
);
router.post(
  "/reviewTranslation",
  upload.array("attch", 12),
  getIndivEntryCtrl.reviewTranslation
);
router.post(
  "/getTranslationStatus",
  upload.array("attch", 12),
  getIndivEntryCtrl.getTranslationStatus
);
router.post("/submitForReview", getIndivEntryCtrl.submitForReview);       // Pending - Submit4Review
router.post("/updateActivityLog", getIndivEntryCtrl.updateActivityLog);   // Submit4Review - OnHold (-with Delisted)
router.post(
  "/insertSanction",
  upload.array("attch", 12),
  getIndivEntryCtrl.insertSanction
); // to Active
router.post(
  "/supersedeSiblings",
  getIndivEntryCtrl.supersedeSiblings
); // to Active
router.post("/updatePressRelease", getIndivEntryCtrl.updatePressRelease); // Active - Delisted

router.post("/addNewRegime", lkUpCtrl.addNewRegime);
router.post("/updateRegime", lkUpCtrl.updateRegime);
router.post("/deleteRegime", lkUpCtrl.deleteRegime);
router.post("/addNewEntryTyp", lkUpCtrl.addNewEntryTyp);
router.post("/updateEntryTyp", lkUpCtrl.updateEntryTyp);
router.post("/deleteEntry", lkUpCtrl.deleteEntry);
router.post("/addNewMeasure", lkUpCtrl.addNewMeasure);
router.post("/updateMeasure", lkUpCtrl.updateMeasure);
router.post("/deleteMeasure", lkUpCtrl.deleteMeasure);
router.post("/addNewLanguage", lkUpCtrl.addNewLanguage);
router.post("/updateLanguage", lkUpCtrl.updateLanguage);
router.post("/addNewTranslation", lkUpCtrl.addNewTranslation);
router.post("/updateTranslation", lkUpCtrl.updateTranslation);
router.post("/addNewCountry", lkUpCtrl.addNewCountry);
router.post("/deleteCountry", lkUpCtrl.deleteCountry);
router.post("/updateCountry", lkUpCtrl.updateCountry);
router.post("/addNewBiometric", lkUpCtrl.addNewBiometric);
router.post("/updateBiometric", lkUpCtrl.updateBiometric);
router.post("/addNewCategoryType", lkUpCtrl.addNewCategoryType);
router.post("/updateCategoryType", lkUpCtrl.updateCategoryType);
router.post("/addNewFeature", lkUpCtrl.addNewFeature);
router.post("/updateFeature", lkUpCtrl.updateFeature);
router.post("/addNewGender", lkUpCtrl.addNewGender);
router.post("/updateGender", lkUpCtrl.updateGender);
router.post("/deleteGender", lkUpCtrl.deleteGender);
router.post("/addNewLivingStatus", lkUpCtrl.addNewLivingStatus);
router.post("/updateLivingStatus", lkUpCtrl.updateLivingStatus);
router.post("/addNewIdType", lkUpCtrl.addNewIdType);
router.post("/updateIdType", lkUpCtrl.updateIdType);

router.post("/deleteLivingStatus", lkUpCtrl.deleteLivingStatus);
router.post("/deleteTranslation", lkUpCtrl.deleteTranslation);
router.post("/deleteBiometricType", lkUpCtrl.deleteBiometricType);
router.post("/deleteCategory", lkUpCtrl.deleteCategory);
router.post('/deleteLanguage', lkUpCtrl.deleteLanguage);
router.post('/deleteFeature', lkUpCtrl.deleteFeature);
router.post('/deleteIdTypes', lkUpCtrl.deleteIdTypes);

router.get("/sendEmail", getIndivEntryCtrl.sendEmail); //fixme (test)

router.post("/getNextRefNumSeq", lkUpCtrl.getNextRefNumSeq);
router.post("/incrementAmendIter");

router.post("testFilesRemove", getIndivEntryCtrl.removeFileAttachments);
router.post(
  "/saveEditedFreeText",
  upload.array("file", 12),
  getIndivEntryCtrl.submitForReviewOtherLangs
);
router.post(
  "/confirmSubmitForReview",
  getIndivEntryCtrl.confirmSubmitForReview
);
router.post("/isReadyForPublish", getIndivEntryCtrl.isReadyForPublish);

router.get("/emailTest", async function (req, res) {
  try {
    const { to, name } = req.query
    console.log('to:', to)
    console.log('name:', name)

    await sendTestEmail(to, name)

    res.send ({
      message: "Successfully Sent~!"
    })
  } catch (e) {
    console.log(e)
    res.send({
      error: e
    })
  }

})

export default router;
