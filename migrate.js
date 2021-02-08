const fs = require('fs');
const xml2js = require('xml2js');

import addressModel from "./src/models/addrModel";
import docModel from "./src/models/docModel";
import IdModel from "./src/models/idModel";
import sanctionsLstModel from "./src/models/sanctionsLstModel";
import SubmissionModel from "./src/models/submissionModel";
import CountersModel from "./src/models/countersModel";
import FileAttchModel from "./src/models/fileAttchModel";
import UsersModel from "./src/models/usersModel";
import NotiEmailModel from "./src/models/notiEmailModel";
import NotiReceiverModel from "./src/models/receiverModel";
import NotiHistoryModel from "./src/models/notiHistory";
import Address from "./src/classes/address";
import Pobs from "./src/classes/Pobs";
import Docs from "./src/classes/Docs";
import Dobs from "./src/classes/Dobs";
import Features from "./src/classes/Features";
import {
  SanctionInputEntry,
  Identity,
  ActivityLog,
} from "./src/classes/SanctionInputEntry";
import { logg } from "./config/winston";
import { getLookupAllList } from "./src/controllers/lookupLstCtrl";


const fs = require("fs");
const mongoose = require("mongoose");
const ObjectID = require("mongodb").ObjectID;
const async = require("async");
const archiver = require("archiver");
const { sendBulkEmail } = require("../config/sendgrid");
require("mongoose").set("debug", false);

const asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
};

 
const parser = new xml2js.Parser();

fs.readFile(__dirname + '/data/migration/6908800.xml', function(err, data) {
    parser.parseString(data, function (err, result) {
        console.dir(jsonResult);
        console.log('result RES--------------', JSON.stringify(jsonResult));
        console.log('Done');

        insertInitialSanction(jsonResult);
        const insertInitialSanction = async function (jsonResult) {
            try {
              let tmpRef = JSON.parse(jsonResult)['entry']['language'][0];
              let entryTypeOrg = JSON.parse(jsonResult)['entry']['entryType'][0];
              let entryStatusOrg = JSON.parse(jsonResult)['entry']['entryStatus'][0];
              let versionId = "0.0";

              let workingMainLanguage = tmpRef['$']['lang'] || 'EN';
              let userEmail = tmpRef.userEmail || '';
              let entryStatusModifiedBy = "";
              let statusModifiedDte = new Date();
          
              let language = tmpRef['$']['lang'] || 'EN';
              let result = (await getLookupAllList())[0];
          
              let entryTypeArr = JSON.parse(JSON.stringify(result.entryType));
              let entryType = entryTypeArr.find(
                (item) => item[language] == entryTypeOrg
              );
          
              let entryStatusArr = JSON.parse(JSON.stringify(result.entryStatus));
              let entryStatus = entryStatusArr.find(
                (item) => item[language] == entryStatusOrg
              );
          
              let regimeArr = JSON.parse(JSON.stringify(result.regime));
              let regimeKey = ""; // i.e: QD
              let regime = regimeArr.find((item) => {
                const key = Object.keys(item[language]).find(
                  (key) => key !== "isActive" && key !== "measures"
                );
                regimeKey = item[language][key] === tmpRef.regime ? key : "";
                return item[language][key] === tmpRef.regime;
              });
          
              let langArr = JSON.parse(JSON.stringify(result.language));
          
            //   let applicableMeasures = JSON.parse(JSON.stringify(result.measures));   //fixme
            //   let measures = tmpRef.applicableMeasures.map((measure) => {
            //     return applicableMeasures.find(
            //       (item) => item[language].measureNm === measure
            //     );
            //   });
          
              let interpolNum = tmpRef.listings[0].interpolNum || '';
              let refNum = tmpRef.listings[0]['unListType'][0]['refereceNumber'][0] || '';
              let mbmrStConfid = tmpRef.listings[0].mbmrStConfid || '';
              let statmentConf = tmpRef.listings[0].stmntConfid || '';
              let availDte = tmpRef.availDte || '';
              let narrativeSumm = tmpRef.narrativeSumm || ''; //fixme
              let lstngReason = tmpRef.lstngReason || '';  //fixme
              let relatedLst = tmpRef.relatdLst || ''; //fixme
              let pressRelease = tmpRef.listings[0]['unListType'][0]['pReleases'][0]['pressRelease'][0] || '';
              let narrWebsteUpdteDte = tmpRef.narrWebsteUpdteDte || '';
              let remarks = tmpRef.listings[0].entryRemarks || '';
              let idArr = [];
              let idArrOtherLangs = [];
              let idArrs = tmpRef;
          
              function setMongooseObjectId(biometricInf) {
                return biometricInf.bioMAttch.map((fileInfo, attachmnIndex) => {
                  // at this point the id# is known, the biometric type is known, and the index of the attachnammet is known
                  // we create a string with all of the above concatenated and check to see if the filename in req.files matches this up to a double underscore
                  // then we build an array of files to go to the database later on.
                  if (fileInfo.fileId == null || fileInfo.fileId == "") {
                    let searchStr =
                      i +
                      "_" +
                      biometricInf.bioMType +
                      "_" +
                      attachmnIndex +
                      "_" +
                      fileInfo.filename;
          
                    fileInfo.fileId = new mongoose.Types.ObjectId();
                    logg.info("the file attachment id is %s", fileInfo.fileId);
        
                  }
                });
              }
          
              // put two identities in an array.  The first will go iwth the first sanction for the Chosen main language.
              // While the second id, will go with the rest of the other sanctions for the remainging languages

              //Start identify
                let addresses = tmpRef.addresses.address;
                let biometricInfs = tmpRef.biometricInf || [];
                let dobs = tmpRef.dob;
                let docs = tmpRef.documents[0].document;
                let features = tmpRef.entryFeatures[0].features;
                // let genderStatus = tmpRef.idArr[i].genderStatus;
                let gender = tmpRef.gender;        
                // let livingStatus = genderStatus.livngStat ;          
        
                let names = tmpRef.names[0]['name'];   
                let nameOrgSpt = tmpRef.names[0]['nameOrgSpt'];
          
                let identity_id = new mongoose.Types.ObjectId();
          
                function setNames(names, nameOrgSpt) {
                  let namesArr = names.map((nm) => ({
                    value: nm["name"],
                    script: nm["script"],
                    order: nm["order"],
                    nameType: nm["nameType"],
                  }));
                  let namesObj = {};
                  namesObj["names"] = namesArr;
          
                  if (nameOrgSpt) {
                    let nameOrgScptArr = nameOrgSpt.map((nmOSpt) => ({
                      value: nmOSpt["name"],
                      script: nmOSpt["script"],
                      order: nmOSpt["order"],
                      nameType: nmOSpt["nameType"],
                    }));
                    namesObj["nameOrgSpt"] = nameOrgScptArr;
                  }
                  return namesObj;
                }
          
                let nameZ = setNames(names, nameOrgSpt);
                let pobs = tmpRef.idArr[i].pobs;
                let identity = tmpRef.idArr[i].idType;
                let category = tmpRef.idArr[i].category;
                let idTitle = tmpRef.idArr[i].idTitle;
                let idDesig = tmpRef.idArr[i].idDesig;
                let idComment = tmpRef.idArr[i].idComment;
                let addrAr = [];
                let nationaltty = tmpRef.idArr[i].nationalttY;
          
                let adddressesArr = addresses.map(function (addr) {
                  let loc = { lat: addr.lat, lng: addr.lng, region: addr.region };
                  let tmpAddr = new Address(
                    addr.city,
                    addr.country,
                    loc,
                    addr.note,
                    addr.stateProv,
                    addr.street,
                    addr.zipCde
                  );
                  let result = new addressModel(tmpAddr);
                  return result;
                });
          
                let adddressesArrOtherLangs = adddressesArr.map((addr) => {
                  let loc = { lat: addr.lat, lng: addr.lng, region: addr.region };
                  let tmpAddr = new Address(
                    addr.city,
                    addr.country,
                    loc,
                    "",
                    addr.stateProv,
                    addr.street,
                    addr.zipCde
                  );
                  let result = new addressModel(tmpAddr);
                  return result;
                });
          
                // let biometricInfArr = biometricInfs.map(function (biometricInf) {
                //   if (biometricInf.bioMAttch) {
                //     // only necessary when there is an attachment
                //     let resultArr = setMongooseObjectId(biometricInf);
                //     let bioMAttchconsolidated = biometricInf.bioMAttch;
                //     if (biometricInf.bioMPrevAttchs) {
                //       bioMAttchconsolidated = biometricInf.bioMAttch.concat(
                //         biometricInf.bioMPrevAttchs
                //       );
                //     }
          
                //     return {
                //       biometricType: biometricInf.bioMType,
                //       value: biometricInf.bioMVal,
                //       note: biometricInf.bioMNote,
                //       biometricAttch: bioMAttchconsolidated,
                //       tabId: identity_id, // for deleting ease
                //       allBiometricIdForTab: new mongoose.Types.ObjectId(),
                //     };
                //   } else {
                //     let bioMAttchconsolidated = biometricInf.bioMPrevAttchs;
                //     return {
                //       biometricType: biometricInf.bioMType,
                //       value: biometricInf.bioMVal,
                //       note: biometricInf.bioMNote,
                //       biometricAttch: bioMAttchconsolidated,
                //       tabId: identity_id, // for deleting ease
                //       allBiometricIdForTab: new mongoose.Types.ObjectId(),
                //     };
                //   }
                // });
          
                // let biometricInfArrOtherLangs = biometricInfArr.map(
                //   (bioMetricOtherLang) => {
                //     const {
                //       biometricType,
                //       value,
                //       biometricAttch,
                //       tabId,
                //       allBiometricIdForTab,
                //     } = bioMetricOtherLang;
                //     let result = {
                //       biometricType: biometricType,
                //       value: value,
                //       note: "",
                //       tabId: tabId,
                //       allBiometricIdForTab: allBiometricIdForTab,
                //     };
                //     return result;
                //   }
                // );
          
                let docsArr = docs.map(function (docz) {
                  let result = new Docs(
                    docz.docNum,
                    docz.docType,
                    docz.docTyp1,
                    docz.issueDte,
                    docz.expDte,
                    docz.issuingCntry,
                    docz.issuedCntry,
                    docz.issuingCity,
                    docz.note
                  );
                  return result;
                });
          
                let docsArrOtherLang = docsArr.map((doc) => {
                  const {
                    docNumber,
                    documentType,
                    docType1,
                    issuedDate,
                    expDate,
                    issuingCountry,
                    issuedCountry,
                    issuedCity,
                  } = doc;
          
                  let result = {
                    docNumber: docNumber,
                    documentType: documentType,
                    docType1: docType1,
                    issuedDate: "issuedDate",
                    expDate: expDate,
                    issuingCountry: issuingCountry,
                    issuedCountry: issuedCountry,
                    issuedCity: issuedCity,
                    note: "",
                  };
                  return result;
                });
                let docsDb = new docModel({ document: docs });
          
                // below is part of idSchema
                let dobsArr = dobs.map(function (dob) {
                  let result = new Dobs(
                    dob.dobType,
                    dob.dobSubset,
                    dob.dobSpecDte,
                    dob.dobFrom,
                    dob.dobTo,
                    dob.dobNote,
                    dob.dobSubsetDte
                  );
                  return result;
                });
          
                let dobsArrOtherLang = dobsArr.map((dob) => {
                  const {
                    dobType,
                    dobSubset,
                    dobSubsetDte,
                    date,
                    dobSpecDte,
                    dateFrom,
                    dateTo,
                  } = dob;
                  let result = {
                    dobType: dobType,
                    dobSubset: dobSubset,
                    dobSubsetDte: dobSubsetDte,
                    date: date,
                    dobSpecDte: dobSpecDte,
                    dateFrom: dateFrom,
                    dateTo: dateTo,
                    note: "",
                  };
                  return result;
                });
                let featNotes = "";
                let featuresArr = features.map(function (feature) {
                  let result = new Features(
                    feature.featureType,
                    feature.fStatus,
                    feature.fValue,
                    feature.fNotes,
                    feature.title
                  );
                  featNotes += feature.fNotes + ", ";
                  return result;
                });
          
                let featuresArrOtherLang = featuresArr.map((features) => {
                  const { featureType, status, value } = features;
                  let result = {
                    featureType: "featureType",
                    status: status,
                    value: value,
                    notes: "",
                  };
                  return result;
                });
          
                let pobsArr = pobs.map(function (pob1) {
                  let loc = { lat: pob1.lat, lng: pob1.lng, region: pob1.region };
                  let addr = new Address(
                    pob1.city,
                    pob1.country,
                    loc,
                    pob1.note,
                    pob1.stateProv,
                    pob1.street,
                    pob1.zipCde
                  );
                  let result = new Pobs(addr);
          
                  return result;
                });
          
                let pobsArrOtherLang = pobsArr.map((pob) => {
                  const { city, country, stateProvince, street, zipCode } = pob;
                  let result = {
                    city: city,
                    country: country,
                    stateProvince: stateProvince,
                    street: street,
                    zipCode: zipCode,
                    location: {
                      city: city,
                      country: country,
                      stateProvince: stateProvince,
                      street: stateProvince,
                      zipCode: zipCode,
                    },
                    note: "",
                  };
                  return result;
                });
          
                let idCommentOtherlang = "";
                let idDesigOtherLang = ";";
                let identityy = new IdModel({
                  _id: identity_id,
                  addresses: { address: adddressesArr },
                  biometricData: { biometricInfo: { biometric: biometricInfArr } },
                  category: category,
                  comment: idComment,
                  designations: { designation: idDesig },
                  dobs: { dob: dobsArr },
                  documents: { document: docsArr },
                  entryFeatures: { feature: featuresArr, note: featNotes },
                  gender: gender[language],
                  livingStatus: '',  //fixme
                  names: { name: nameZ["names"], nameOrgSpt: nameZ["nameOrgSpt"] },
                  nationalities: { nationality: nationaltty },
                  pobs: { pob: pobsArr },
                  titles: { title: idTitle },
                  type: identity,
                });
                // we create two identitis based on the chosen language and other languages and use accordingly in hte Model
                let identityyOtherLangs = new IdModel({
                  _id: identity_id,
                  addresses: { address: adddressesArrOtherLangs },
                  biometricData: {
                    biometricInfo: { biometric: biometricInfArrOtherLangs },
                  },
                  category: category,
                  comment: idCommentOtherlang,
                  designations: { designation: idDesigOtherLang },
                  dobs: { dob: dobsArrOtherLang },
                  documents: { document: docsArrOtherLang },
                  entryFeatures: { feature: featuresArrOtherLang, note: "" },
                  gender: genderStatus.gender,
                  livingStatus: genderStatus.livngStat,
                  names: { name: nameZ["names"], nameOrgSpt: nameZ["nameOrgSpt"] },
                  nationalities: { nationality: nationaltty },
                  pobs: { pob: pobsArrOtherLang },
                  titles: { title: idTitle },
                  type: identity,
                });
          
                idArr.push(identityy);
                idArrOtherLangs.push(identityyOtherLangs);
 

              // End of Foreach

              //Start
              let submission = new SubmissionModel({
                identityMSconfidential: mbmrStConfid,
                statement: tmpRef.lstReq.lstngNotes,
                statementConfidential: statmentConf,
                submittedBy: tmpRef.lstReq.submittdBy,
                submittedOn: tmpRef.lstReq.submittdOn,
              });
          
              let stmntOtherLang = "";
              let submissionOtherLang = new SubmissionModel({
                identityMSconfidential: mbmrStConfid,
                statement: stmntOtherLang,
                statementConfidential: statmentConf,
                submittedBy: tmpRef.lstReq.submittdBy,
                submittedOn: tmpRef.lstReq.submittdOn,
              });
          
              // the below should be in a transaction
              let query = { _id: "entryIdCount" };
              let update = { $inc: { seq: 1 } };
              let entryIdCt = 0;
              let options = { new: true };
              var ret = CountersModel.findOneAndUpdate(query, update, options, function (
                err,
                result
              ) {
                if (err) return err;
          
                entryIdCt = result["seq"];
          
                let sancsArr = langArr.map((langZ) => {
                  let listReason = null,
                    usedLang = null,
                    addtnalInf = null,
                    lstngNotes = null,
                    statementConf = null,
                    rmrks = null;
                  usedLang = langZ;
                  if (language == langZ.acronym) {
                    listReason = lstngReason;
                    addtnalInf = tmpRef.addtlInfo;
                    lstngNotes = tmpRef.lstReq.lstngNotes;
                    statementConf = statmentConf;
                    rmrks = remarks;
                  }
                  const langAcronym = langZ.acronym;
          
                  let sanc = new sanctionsLstModel({
                    scSanctionEntry: {
                      addtlInfo: addtnalInf,
                      entry: {
                        entryId: entryIdCt,
                        entryStatus: entryStatus[langAcronym],
                        entryType: entryType[langAcronym],
                        statusModifiedDte: statusModifiedDte,
                        statusModifiedBy: entryStatusModifiedBy,
                        language: [
                          {
                            additionalInformation: addtnalInf,
                            identity: idArr,
                            lang: langAcronym,
                            narrativeUpdatedOn: narrWebsteUpdteDte,
                            narrativeWebsiteDate: availDte,
                            reasonForListing: listReason,
                            relatedList: relatedLst,
                          },
                        ],
                        listings: {
                          unListType: [
                            {
                              interpolUNSN: interpolNum,
                              listName: regime[langAcronym][regimeKey],
                              measure: measures.map(
                                (item) => item[langAcronym].measureNm
                              ),
                              narrativeSummary: narrativeSumm,
                              note: lstngNotes,
                              referenceNumber: refNum,
                              unlstItmsDef: {
                                updates: { updated: pressRelease },
                                measure: measures.map(
                                  (item) => item[langAcronym].measureNm
                                ),
                              },
                            },
                          ],
                        },
                        remarks: rmrks,
                        submission: {
                          identityMSconfidential: tmpRef.lstReq.mbmrStConfid,
                          statement: lstngNotes,
                          statementConfidential: statementConf,
                          submittedBy: tmpRef.lstReq.submittdBy,
                          submittedOn: tmpRef.lstReq.submittdOn,
                        },
                      },
                      langs: {
                        idLst: idArr,
                        lang: langAcronym,
                        languagesUUID: "",
                      },
                      listngReason: listReason,
                      narrUpdteOn: narrWebsteUpdteDte,
                      narrWbSteDte: availDte,
                      relatedLst: relatedLst,
                      activityLog: {
                        activityDte: new Date(),
                        userEmail: tmpRef.sanctionMetaData.userEmail,
                        prevState: "NEW",
                        currState: tmpRef.status,
                        activityNotes:
                          "Entry created with ID:" + tmpRef.sanctionMetaData.userEmail,
                      },
                      versionId: versionId,
                      workingMainLanguage: workingMainLanguage,
                      userEmail: userEmail,
                    },
                  });
                  return sanc;
                });
          
                let results = [];
                // sendEmailFunc("Translator").then((sendRes) => {
                  async.map(
                    sancsArr,
                    function (sanc, callback) {
                      let result = sanc.save();
                      return result;
                    },
                    callback(err, results)
                  );
          
                // });
              });
            } catch (error) {
              logg.info("insertInitialSanction error:: %s", error);
            }
          };


    });
});