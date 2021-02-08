import addressModel from "../models/addrModel";
import docModel from "../models/docModel";
import IdModel from "../models/idModel";
import sanctionsLstModel from "../models/sanctionsLstModel";
import SubmissionModel from "../models/submissionModel";
import CountersModel from "../models/countersModel";
import FileAttchModel from "../models/fileAttchModel";
import NotiEmailModel from "../models/notiEmailModel";
import NotiReceiverModel from "../models/receiverModel";
import NotiHistoryModel from "../models/notiHistory";
import Address from "../classes/address";
import Pobs from "../classes/Pobs";
import Docs from "../classes/Docs";
import Dobs from "../classes/Dobs";
import Features from "../classes/Features";
import {
  SanctionInputEntry,
  Identity,
  ActivityLog,
} from "../classes/SanctionInputEntry";
import { logg } from "../../config/winston";
import { getLookupAllList } from "./lookupLstCtrl";

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

// concatenate name values in order
function getNamesInOrder(tmp) {
  tmp.sort(compare);
  let result = tmp
    .map(function (nmVal) {
      return nmVal.value;
    })
    .join(" ");
  return result;
}

function compare(nmArr, nmArr2) {
  const ordrA = nmArr.order;
  const ordrB = nmArr2.order;
  let comparison = 0;
  if (ordrA > ordrB) {
    comparison = 1;
  } else if (ordrA < ordrB) {
    comparison = -1;
  }
  return comparison;
}

async function saveActivityLog(actData) {
  // also updates the State if necessary
  // need to handle errors in first or second update, should make this transactional
  // this is  a post request, so we need to pull the information from the request body
  let activityDate = new Date();
  let postRef = actData;
  let refNum = postRef.refNum;
  if (!refNum) {
    logg.info("Since refNum is null or undefined we get a new refNum ");
  }
  let activtyLg = new ActivityLog(
    activityDate,
    postRef.userEmail,
    postRef.userTask,
    postRef.prevState,
    postRef.nextState,
    postRef.activityNotes,
    postRef.refNum,
    postRef.orderId
  );

  let updteDoc = {};
  updteDoc["activityDte"] = activtyLg.activityDate;
  updteDoc["userEmail"] = activtyLg.userEmail;
  updteDoc["userTask"] = activtyLg.userTask;
  updteDoc["activityNotes"] = activtyLg.activityNotes;
  updteDoc["prevState"] = activtyLg.prevState;
  updteDoc["currState"] = activtyLg.nextState;
  updteDoc["refNum"] = activtyLg.refNum;

  const updateQry = {
    "scSanctionEntry.entry.entryId": actData.entryId,
  };

  const results = await new Promise((resolve, reject) => {
    sanctionsLstModel.find(updateQry, function (err, docs) {
      if (err) return resolve(false);
      else return resolve(docs);
    });
  });
  const logs = results ? results[0].scSanctionEntry.activityLog : [];
  logs.push(updteDoc);
  sanctionsLstModel.update(
    updateQry,
    {
      $set: {
        "scSanctionEntry.entry.entryStatus": postRef.nextState,
        "scSanctionEntry.activityLog": logs,
      },
    },
    function (err, data) {
      if (err) {
        console.log("the updateActivityLog Error: ", err.message);
      } else {
        console.log("noError on updateActivityLog");
      }
    }
  );
}

const sendEmailFunc = async function (role) {
  const usersArr = await NotiReceiverModel.find({
    roles: role,
  });
  if (usersArr.length > 0) {
    const usersEmailArr = usersArr.map((item) => item.userEmail);

    const notiEmail = await NotiEmailModel.findOne({
      emailType: role,
    });

    await sendBulkEmail({
      to: usersEmailArr,
      title: notiEmail.emailTitle || "",
      content: notiEmail.emailDescription || "",
    });

    let newHistory = new NotiHistoryModel({
      subject: notiEmail.emailTitle || "",
      content: notiEmail.emailDescription || "",
      recipient: usersEmailArr,
      sent: false,
    });
    await newHistory.save();
  }

  return true;
};


export const getIndivEntryByFName = function (req, res) {
  const qryDoc = {
    "scSanctionEntry.langs.idLst.names.name": {
      $elemMatch: {
        nameType: "FIRST_NAME",
        value: req.params.FName,
      },
    },
  };
  sanctionsLstModel.find(qryDoc, function (err, docs) {
    if (err) return logg.error("%o", err);
    else {
      res.send(JSON.parse(JSON.stringify(docs)));
    }
  });
};

export const getIndivEntryBySName = function (req, res) {
  const qryDoc = {
    "langs.idLst.names.name": {
      $elemMatch: {
        nameType: "SECOND_NAME",
        value: req.params.SName,
      },
    },
  };

  sanctionsLstModel.find(qryDoc, function (err, docs) {
    if (err) return logg.error("%o", err);
    else {
      res.send(JSON.parse(JSON.stringify(docs)));
    }
  });
};

export const findIndividualByID = function (req, res) {
  const qryDoc = {
    "langs.lang": req.body.lang,
    "entry.entryStatus": req.body.entryStatus,
    "entry.entryType": req.body.entryType,
    "entry._id": req.body._id,
  };

  sanctionsLstModel.find(qryDoc, function (err, docs) {
    if (err) return logg.error("%o", err);
    else {
      res.send(JSON.parse(JSON.stringify(docs)));
    }
  });
};

export const getSanctionsList = async function (req, res) {
  try {
    let entryStatus = req.params["entryStatus"];
    let lang: string = req.params["langId"] || "EN";
    let filterValue = req.params["filterValue"];

    const lookup = (await getLookupAllList())[0];
    const entryStatusArr = JSON.parse(JSON.stringify(lookup.entryStatus));
    const statusArr = Object.values(entryStatusArr.find((item) => item["EN"] === entryStatus) || []);
    const removedStatusArr = Object.values(entryStatusArr.find((item) => item["EN"] === "REMOVED"));

    let matchRef = {
      "scSanctionEntry.langs.lang": lang.toUpperCase(),
    };
    if (entryStatus == "ACTIVE") {
      // an amendment that becomes ACTIVE will have an amendmentInfo record.
      matchRef["scSanctionEntry.entry.entryStatus"] = { $in: statusArr };
      matchRef["scSanctionEntry.supersededInfo.isSuperSeded"] = { $exists: false };
    } else if (entryStatus == "REMOVED" || entryStatus == "DELISTED") {
      matchRef["scSanctionEntry.entry.entryStatus"] = { $in: statusArr };
    } else if (entryStatus == "ALL") {
      matchRef["scSanctionEntry.entry.entryStatus"] = { $nin: removedStatusArr };
    } else if (entryStatus != "ALL") {
      matchRef["scSanctionEntry.entry.entryStatus"] = { $in: statusArr };
      matchRef["scSanctionEntry.supersededInfo.isSuperSeded"] = { $exists: false };
    }

    let filterRef = {};
    if (filterValue !== undefined) {
      filterRef = {
        $or: [
          { "scSanctionEntry.langs.idLst.names.name.value": { $regex: new RegExp(filterValue, 'i') } },
          { "scSanctionEntry.entry.entryType": { $regex: new RegExp(filterValue, 'i') } },
          { "scSanctionEntry.entry.entryStatus": { $regex: new RegExp(filterValue, 'i') } },
          { "scSanctionEntry.entry.listings.unListType.referenceNumber": { $regex: new RegExp(filterValue, 'i') } },
          { "scSanctionEntry.entry.listings.unListType.listName": { $regex: new RegExp(filterValue, 'i') } },
          { "scSanctionEntry.amendmentId": { $regex: new RegExp(filterValue, 'i') } },
          { "scSanctionEntry.entry.statusModifiedDte": { $regex: new RegExp(filterValue, 'i') } },
        ]
      }
    }

    let qryDoc = [
      { $match: matchRef },
      {
        $project: {
          "scSanctionEntry.langs.idLst": {
            $filter: {
              input: "$scSanctionEntry.langs.idLst",
              as: "item",
              cond: { $eq: ["$$item.type", "PRIMARY"] },
            },
          },
          "scSanctionEntry.entry.entryType": 1,
          "scSanctionEntry.entry.listings.unListType.updates.updated": 1,
          "scSanctionEntry.entry.listings.unListType.unlstItmsDef.updates.updated": 1,
          "scSanctionEntry.entry.listings.unListType.listName": 1,
          "scSanctionEntry.entry.listings.unListType.referenceNumber": 1,
          "scSanctionEntry.entry.entryId": 1,
          "scSanctionEntry.entry.entryStatus": 1,
          "scSanctionEntry.amendmentCount": {
            $cond: {
              if: { $isArray: "$scSanctionEntry.amendmentInfo" },
              then: { $size: "$scSanctionEntry.amendmentInfo" },
              else: "NA",
            },
          },
          "scSanctionEntry.amendmentId": 1,
          "scSanctionEntry.entry.statusModifiedDte": 1,
          "scSanctionEntry.supersededInfo": 1,
        },
      },
      {
        $project: {
          "scSanctionEntry.entry.entryType": 1,
          "scSanctionEntry.langs.idLst.entryFeatures": 1,
          "scSanctionEntry.langs.idLst.type": 1,
          "scSanctionEntry.langs.idLst.dobs": 1,
          "scSanctionEntry.langs.idLst.pobs": 1,
          "scSanctionEntry.langs.idLst.names.name": 1,
          "scSanctionEntry.langs.idLst.addresses.address": 1,
          "scSanctionEntry.entry.listings.unListType.updates.updated": 1,
          "scSanctionEntry.entry.listings.unListType.unlstItmsDef.updates.updated": 1,
          "scSanctionEntry.entry.listings.unListType.listName": 1,
          "scSanctionEntry.entry.listings.unListType.referenceNumber": 1,
          "scSanctionEntry.entry.entryId": 1,
          "scSanctionEntry.entry.entryStatus": 1,
          "scSanctionEntry.amendmentCount": 1,
          "scSanctionEntry.amendmentId": 1,
          "scSanctionEntry.entry.statusModifiedDte": { $toString: "$scSanctionEntry.entry.statusModifiedDte" },
          "scSanctionEntry.supersededInfo": 1,
        },
      },
      { $match: filterRef },
      {
        $sort: { "scSanctionEntry.entry.statusModifiedDte": -1 },
      },
    ];

    sanctionsLstModel.aggregate(qryDoc, function (err, docs) {
      if (err) {
        res.status(400).json({ message: err.message, error: err });
      } else {
        let tmpDoc = JSON.parse(JSON.stringify(docs));

        const mapResult = tmpDoc.map((tmp) => ({
          refNum:
            tmp.scSanctionEntry.entry.listings.unListType[0] ? tmp.scSanctionEntry.entry.listings.unListType[0].referenceNumber : '',
          idNum: tmp.scSanctionEntry.entry.entryId,
          recordType: tmp.scSanctionEntry.entry.entryType,
          name: getNamesInOrder(tmp.scSanctionEntry.langs.idLst[0] ? tmp.scSanctionEntry.langs.idLst[0].names.name : []),
          country: getCountry(tmp.scSanctionEntry.langs.idLst[0] ? tmp.scSanctionEntry.langs.idLst[0].pobs : ''),
          sanctionType:
            tmp.scSanctionEntry.entry.listings.unListType[0] ? tmp.scSanctionEntry.entry.listings.unListType[0].listName : '',
          listedOn: getListedOnDte(
            tmp.scSanctionEntry.entry.listings.unListType[0]
          ),
          region: displayAddrOrRegion(
            tmp.scSanctionEntry.langs.idLst[0] ? tmp.scSanctionEntry.langs.idLst[0].addresses.address[0] : ''
          ),
          status: tmp.scSanctionEntry.entry.entryStatus,
          dob: getDob(tmp.scSanctionEntry.langs.idLst[0] ? tmp.scSanctionEntry.langs.idLst[0].dobs : ''),
          pob: getPobCity(tmp.scSanctionEntry.langs.idLst[0] ? tmp.scSanctionEntry.langs.idLst[0].pobs : ''),
          amendmentCt: tmp.scSanctionEntry.amendmentCount,
          amendmentId: tmp.scSanctionEntry.amendmentId,
          modifiedDate: tmp.scSanctionEntry.entry.statusModifiedDte,
          superseded: tmp.scSanctionEntry.supersededInfo && tmp.scSanctionEntry.supersededInfo.isSuperSeded,
          pressRelease: tmp.scSanctionEntry.entry.listings.unListType[0] ?
            tmp.scSanctionEntry.entry.listings.unListType[0].unlstItmsDef ?
            tmp.scSanctionEntry.entry.listings.unListType[0].unlstItmsDef.updates.updated : [] : [],
        }));

        function getPobCity(pob) {
          let pobCity = "";
          if (
            pob &&
            pob.pob[0] &&
            pob.pob[0].address[0] &&
            pob.pob[0].address[0].city
          ) {
            pobCity = pob.pob[0].address[0].city;
          }
          return pobCity;
        }

        function getDob(dteOfBirth) {
          let birthDte = "";
          if (dteOfBirth && dteOfBirth.dob[0]) {
            birthDte = dteOfBirth.dob[0].date;
          }
          return birthDte;
        }

        function getCountry(addrCtry) {
          if (addrCtry && addrCtry.pob && addrCtry.pob[0] && addrCtry.pob[0].address[0]) {
            return addrCtry.pob[0] && addrCtry.pob[0].address[0].country;
          } else return "";
        }

        function getListedOnDte(tmp) {
          if (
            tmp != null &&
            tmp.updates != null &&
            tmp.updates.updated != null &&
            tmp.updates.updated[0] != null &&
            tmp.updates.updated[0].updateType == "LISTED_ON"
          )
            return tmp.updates.updated[0].updatedOn;
          else return "N/A";
        }

        function displayAddrOrRegion(addrOrRegion) {
          let place = "";
          if (addrOrRegion) {
            if (addrOrRegion.city != null || addrOrRegion.street != null) {
              let city = addrOrRegion.city;
              let street = addrOrRegion.street;
              place = street + " " + city;
            } else {
              let latt = addrOrRegion.location.lat;
              let lngg = addrOrRegion.location.lng;
              let regionn = addrOrRegion.location.region;
              place = "lat: " + latt + "long: " + lngg + "region " + regionn;
            }
          }
          return place;
        }

        //Send notification
        //sendEmailFunc("DGC");

        res.send(mapResult);
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message, error });
  }
};


export const getSanctionDetails = function (req, res) {
  try {
    let langId = req.params["langId"];
    if (!langId) langId = "EN";
    let entryId = req.params["id"];
    let amendmentCt = req.params["amendmentCt"];
    let amendmentStatus = req.params["amendmentStatus"];
    let queryStatus = req.params["queryStatus"];
    let supersededCt = req.params["supersededCt"];
    let qryDoc = {};
    let amendmentId = req.params["amendmentId"];

    // query for documents whose status is current
    qryDoc = {
      "scSanctionEntry.entry.entryId": parseInt(entryId, 10),
      "scSanctionEntry.langs.lang": langId,
      "scSanctionEntry.entry.isStatusCurrent": { $exists: false },
      "scSanctionEntry.entry.entryStatus": queryStatus,
    };
    if (amendmentId) {
      qryDoc = {
        "scSanctionEntry.entry.entryId": parseInt(entryId, 10),
        "scSanctionEntry.langs.lang": langId,
        "scSanctionEntry.entry.isStatusCurrent": { $exists: false },
        "scSanctionEntry.entry.entryStatus": queryStatus,
        "scSanctionEntry.amendmentId": amendmentId,
      };
    }

    // documnents that are not amendments will either not have a parent, or their parent value will be NULL. documents that are not current will have a stats of false
    if (req.params["isStatusCurrent"] == "false") {
      qryDoc = {
        "scSanctionEntry.entry.entryId": parseInt(entryId, 10),
        "scSanctionEntry.entry.isStatusCurrent": false,
        "scSanctionEntry.entry.entryStatus": queryStatus,
        $or: [
          { "scSanctionEntry.parent": { $exists: false } },
          { "scSanctionEntry.parent": null },
        ],
      };
    }

    // if amendment vlaue comes in, use that value
    if (amendmentCt > 0) {
      qryDoc = {
        "scSanctionEntry.entry.entryId": parseInt(entryId, 10),
        "scSanctionEntry.amendmentInfo": { $exists: true },
        "scSanctionEntry.amendmentInfo.amendmentCount": amendmentCt,
        "scSanctionEntry.entry.entryStatus": amendmentStatus,
      };
    } else if (supersededCt) {
      qryDoc = {
        "scSanctionEntry.entry.entryId": parseInt(entryId, 10),
        "scSanctionEntry.supersededInfo": { $exists: true },
      };
    }

    let docUnderscoreId = null;
    let amendmentInfo = null;
    let supersededInfo = null;
    let ancestorsArr = [];
    let parent = null;
    let siblingsArr = [];
    let sameSubjectFoundInEntriesArr = [];

    let overallQryDoc = [
      {
        $facet: {
          details: [
            { $match: qryDoc },
            {
              $project: { scSanctionEntry: 1 },
            },
          ],
          submitReviewResult: [
            {
              $match: {
                "scSanctionEntry.entry.entryId": parseInt(entryId, 10),
                "scSanctionEntry.entry.isStatusCurrent": { $exists: false },
                "scSanctionEntry.entry.entryStatus": "SUBMIT4REVIEW",
              },
            },
            {
              $project: {
                _id: 0,
                sanctionLang: "$scSanctionEntry.langs.lang",
                submitReviewConfirmed: {
                  $cond: {
                    if: {
                      $eq: [
                        undefined,
                        "$scSanctionEntry.submitReviewConfirmed",
                      ],
                    },
                    then: "false",
                    else: "$scSanctionEntry.submitReviewConfirmed",
                  },
                },
              },
            },
          ],
        },
      },
    ];

    sanctionsLstModel.aggregate(overallQryDoc, function (err, docs) {
      if (err) {
        res.status(500).json({ message: err.message, error: err });
      } else if (
        typeof JSON.parse(JSON.stringify(docs))[0] == "undefined" ||
        JSON.parse(JSON.stringify(docs))[0].details.length == 0
      ) {
        let sancInputEntry: SanctionInputEntry = new SanctionInputEntry(
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null
        );
        res.send(sancInputEntry);
      } else {
        let tmp = JSON.parse(JSON.stringify(docs))[0].details;
        let submitReviewResult = JSON.parse(JSON.stringify(docs))[0]
          .submitReviewResult;
        let isSubmitReviewMp = new Map<string, {}>();

        for (let i = 0; i < submitReviewResult.length; i++) {
          let key = submitReviewResult[i]["sanctionLang"];
          let val = submitReviewResult[i]["submitReviewConfirmed"];
          if (val == undefined) val = false;
          isSubmitReviewMp.set(key, { isSubmitReviewConfirmed: val });
        }

        let tmpDoc = tmp[1] ? tmp[1] : tmp[0];
        let entryType = tmpDoc.scSanctionEntry.entry.entryType;
        let versionId = tmpDoc.scSanctionEntry.versionId;
        let entryId = tmpDoc.scSanctionEntry.entry.entryId;
        let langId = tmpDoc.scSanctionEntry.langs.lang;
        docUnderscoreId = tmpDoc._id;

        if (tmpDoc.scSanctionEntry.amendmentInfo)
          amendmentInfo = tmpDoc.scSanctionEntry.amendmentInfo;
        if (tmpDoc.scSanctionEntry.supersededInfo)
          supersededInfo = tmpDoc.scSanctionEntry.supersededInfo;
        if (tmpDoc.scSanctionEntry.ancestors)
          ancestorsArr = tmpDoc.scSanctionEntry.ancestors;
        if (tmpDoc.scSanctionEntry.parent)
          parent = tmpDoc.scSanctionEntry.parent;

        if (tmpDoc.scSanctionEntry.siblings)
          siblingsArr = tmpDoc.scSanctionEntry.siblings;
        let sanctEntry = tmpDoc.scSanctionEntry.entry;
        let statusModifiedDte = sanctEntry.statusModifiedDte;
        let ids = tmpDoc.scSanctionEntry.langs.idLst;

        function setupIdArr(id) {
          // do biometric here
          let biometricInfo = null;
          if (id.biometricData) {
            let allBiometricIdForTab = id.biometricData.biometricInfo._id;

            if (
              id.biometricData &&
              typeof id.biometricData !== "undefined" &&
              id.biometricData.biometricInfo &&
              typeof id.biometricData.biometricInfo !== "undefined" &&
              Array.isArray(id.biometricData.biometricInfo.biometric)
            ) {
              biometricInfo = id.biometricData.biometricInfo.biometric.map(
                function (biometricData) {
                  let bioMattchVal = null;
                  if (biometricData.biometricAttch) {
                    bioMattchVal = biometricData.biometricAttch;
                  }
                  return {
                    allBiometricIdForTab: allBiometricIdForTab,
                    bioMEntryId: biometricData._id,
                    bioMType: biometricData.biometricType,
                    bioMNote: biometricData.note,
                    bioMVal: biometricData.value,
                    bioMAttch: bioMattchVal,
                    bioMTabId: id._id,
                  };
                }
              );
            }
          }
          let dob = id.dobs.dob.map(function (dob) {
            let subSetDte = null;
            let dobTyp = null;
            let subsetType = null;
            if (dob.dobSubsetType != null) {
              subsetType = dob.dobSubsetType;
            }
            if (dob.dobSubsetDte) {
              subSetDte = dob.dobSubsetDte;
            }
            if (dob.dobType) {
              dobTyp = dob.dobType;
            }
            return {
              dobSpecDte: dob.date,
              dobSubset: dob.dobSubset,
              dobSubsetDte: subSetDte,
              dobTo: dob.dateTo,
              dobFrom: dob.dateFrom,
              dobNote: dob.note,
              dobType: dobTyp,
              dobSubsetType: subsetType,
            };
          });

          let pob = id.pobs.pob.map(function (pob) {
            // cycle through the addresses
            return {
              street: pob.address[0].street,
              zipCde: pob.address[0].zipCode,
              city: pob.address[0].city,
              country: pob.address[0].country,
              note: pob.address[0].note,
              stateProv: pob.address[0].stateProvince,
              region: pob.address[0]["location"].region,
              lng: pob.address[0].location.lng,
              lat: pob.address[0].location.lat,
            };
          });

          let address = id.addresses.address.map(function (addr) {
            return {
              street: addr.street,
              zipCde: addr.zipCode,
              city: addr.city,
              country: addr.country,
              note: addr.note,
              stateProv: addr.stateProvince,
              region: addr.location.region,
              lng: addr.location.lng,
              lat: addr.location.lat,
            };
          });

          let biometricData = biometricInfo;
          let dobs = dob;
          let pobs = pob;
          let addresses = address;
          let entryFeatures = id.entryFeatures;
          let documents = id.documents;
          let names = id.names;
          let livingStatus = id.livingStatus;
          let gender = id.gender;
          let nationalities = id.nationalities;
          let type = id.type;
          let category = id.category;
          let tabId = id._id;
          let titles = id.titles;
          let designations = id.designations;
          let comment = id.comment;
          let identty = new Identity(
            addresses,
            biometricData,
            names,
            dobs,
            documents,
            entryFeatures,
            livingStatus,
            gender,
            nationalities,
            type,
            category,
            pobs,
            titles,
            designations,
            comment,
            tabId
          );
          return identty;
        }

        let idArr = ids.map((id) => setupIdArr(id));

        let isSubmitForReviewConfirmed = false;
        if (tmpDoc.scSanctionEntry.submitReviewConfirmed) {
          isSubmitForReviewConfirmed =
            tmpDoc.scSanctionEntry.submitReviewConfirmed;
        }
        let translated = tmpDoc.scSanctionEntry.translated;
        let entryStatus = sanctEntry.entryStatus;
        let rptStatusCount = sanctEntry.rptStatusCount;
        let rptStatusDates = sanctEntry.rptStatusDates;
        let interpolNum = sanctEntry.listings.unListType[0].interpolUNSN;
        let lstName = sanctEntry.listings.unListType[0].listName;
        let refNumber = sanctEntry.listings.unListType[0].referenceNumber;
        let measureArr = sanctEntry.listings.unListType[0].measure;
        // let narrativeSumm = sanctEntry.listings.unListType[0].narrativeSummary;
        let narrativeSumm = {
          listngReason: tmpDoc.scSanctionEntry.listngReason,
          relatedLst: tmpDoc.scSanctionEntry.relatedLst,
          addtlInfo: tmpDoc.scSanctionEntry.addtlInfo,
          availDte: tmpDoc.scSanctionEntry.narrWbSteDte,
        };
        let updatedArr = null;
        if (
          sanctEntry.listings.unListType[0].unlstItmsDef &&
          sanctEntry.listings.unListType[0].unlstItmsDef.updates &&
          sanctEntry.listings.unListType[0].unlstItmsDef.updates.updated
        ) {
          updatedArr =
            sanctEntry.listings.unListType[0].unlstItmsDef.updates.updated;
        }

        let amendmentId = tmpDoc.scSanctionEntry.amendmentId;
        let mbrStateConf = sanctEntry.submission.identityMSconfidential;
        let statementConfid = sanctEntry.submission.statementConfidential;
        let lstNote = sanctEntry.listings.unListType[0].note;
        let submittedBy = sanctEntry.submission.submittedBy;
        let submittedOn = sanctEntry.submission.submittedOn;
        let lstReason: string = "";
        let addtlInf: string = "";
        let relatdLst: string[] = [];
        let availDte: string = "";

        if (tmpDoc.scSanctionEntry != null) {
          lstReason = tmpDoc.scSanctionEntry.listngReason;
          addtlInf = tmpDoc.scSanctionEntry.addtlInfo;
          relatdLst = tmpDoc.scSanctionEntry.relatedLst;
          availDte = tmpDoc.scSanctionEntry.narrWbSteDte;
        }

        let lstRmrks: string = sanctEntry.remarks;
        let newEntry = entryId;
        let language = langId;
        let activityLog: ActivityLog[] = [];

        if (tmpDoc.scSanctionEntry.activityLog != null) {
          let actvtyLg = tmpDoc.scSanctionEntry.activityLog;
          for (let i = 0; i < actvtyLg.length; i++) {
            let loginDte = null,
              activityDate = null,
              userEmail = null,
              userTask = null,
              activityNotes = null,
              logoutDte = null,
              prevState = null,
              currState = null,
              refNum = null,
              orderId = null;
            loginDte = actvtyLg[i].loginDte;
            activityDate = actvtyLg[i].activityDte;
            userEmail = actvtyLg[i].userEmail;
            userTask = actvtyLg[i].userTask;
            activityNotes = actvtyLg[i].activityNotes;
            logoutDte = actvtyLg[i].logoutDte;
            prevState = actvtyLg[i].prevState;
            currState = actvtyLg[i].currState;
            refNum = actvtyLg[i].refNum;
            orderId = actvtyLg[i].orderId;
            let actvLg = new ActivityLog(
              activityDate,
              userEmail,
              userTask,
              prevState,
              currState,
              activityNotes,
              refNum,
              orderId
            );

            activityLog.push(actvLg);
          }
        }
        let reversActLog = activityLog.reverse();

        let lstReq = {
          recordTyp: entryType,
          status: entryStatus,
          regime: lstName,
          language: language,
          refNum: refNumber,
          interpolNum: interpolNum,
          mbmrStConfid: mbrStateConf,
          submittdBy: submittedBy,
          submittdOn: submittedOn,
          lstngNotes: lstNote,
          lstRmrks: lstRmrks,
          statementConfid: statementConfid,
          pressRelease: sanctEntry.listings.unListType[0].unlstItmsDef.updates.updated,
        };
        let removedStatusDte = null,
          removedStatusReason = null;
        let priortoremovedState = null;
        if (sanctEntry.removedStatusDtails != null) {
          removedStatusDte = sanctEntry.removedStatusDtails.removedStatusDte;
          removedStatusReason =
            sanctEntry.removedStatusDtails.removedStatusReason;
          priortoremovedState =
            sanctEntry.removedStatusDtails.priortoremovedState;
        }

        let workingMainLanguage: string =
          tmpDoc.scSanctionEntry.workingMainLanguage;
        let userEmail: string = tmpDoc.scSanctionEntry.userEmail;

        // [{"lstngReason": lstReason, "addtlInf": addtlInf,"reltedLst": relatdLst, "availDte":  availDte}];
        let sancInputEntry: SanctionInputEntry = new SanctionInputEntry(
          entryType,
          entryStatus,
          interpolNum,
          lstName,
          refNumber,
          lstNote,
          mbrStateConf,
          submittedBy,
          submittedOn,
          lstReason,
          addtlInf,
          relatdLst,
          availDte,
          newEntry,
          idArr,
          lstReq,
          narrativeSumm,
          removedStatusDte,
          removedStatusReason,
          priortoremovedState,
          reversActLog,
          statementConfid,
          measureArr,
          updatedArr,
          lstRmrks,
          rptStatusCount,
          rptStatusDates,
          statusModifiedDte,
          amendmentInfo,
          versionId,
          supersededInfo,
          ancestorsArr,
          parent,
          siblingsArr,
          sameSubjectFoundInEntriesArr,
          docUnderscoreId,
          amendmentId,
          workingMainLanguage,
          userEmail,
          submitReviewResult,
          isSubmitForReviewConfirmed,
          translated
        );
        res.send(sancInputEntry);
      }
    });
  } catch (error) {
    logg.info("getSanctionDetails error: %s", error.message);
    res.status(500).json({ message: error.message, error });
  }
};


export const getStatusAmendment = function (req, res) {
  try {
    let langId = req.params["langId"];
    if (!langId) langId = "EN";
    let qryDoc = {};
    qryDoc = {
       "scSanctionEntry.entry.entryStatus": {$in:["PENDING","SUBMIT4REVIEW","ONHOLD"]},
    };
   
    let overallQryDoc = [
      { $match: qryDoc },
      {
        $project: {
          "scSanctionEntry.entry.entryStatus": 1,
          "scSanctionEntry.amendmentInfo": 1,
          "scSanctionEntry.amendmentId":1
        },
      },
    ];
    
    sanctionsLstModel.aggregate(overallQryDoc, function (err, docs) {
      if (err) {
        res.status(400).json({ message: err.message, error: err });
      } else {
        const data=[];
        docs.forEach(element => {
          let docData={
            id:element._id,
            entryStatus:element.scSanctionEntry.entry.entryStatus,
            amendmentInfo:element.scSanctionEntry.amendmentInfo,
            amendmentId:element.scSanctionEntry.amendmentId,
          }
          data.push(docData)
        });
        res.status(200).json({docs});
      }
    });
    
  } catch (error) {
    logg.info("getStatusAmendment error: %s", error.message);
    res.status(500).json({ message: error.message, error });
  }
};

// after an insert or update action, the activity log should be updated. It is not updated by a user typing its entries, but rather is a sort of Audit log
// send in a JSON  doc from front end for the activity log, as shown at the end of this function
export const insertNewSanction = function (req, res) {
  try {
    let rptStatusCt = 0;
    let file = req.file;
    // need work done on Language so it shows nicer and not short code
    // let language = req.body.newEntry.language;
    let language = req.body.lstReq.language;
    let entryStatusModifiedBy = "";
    let statusModifiedDte = new Date();
    let recType = req.body.lstReq.recordTyp;
    let status = req.body.lstReq.status;
    let interpolNum = req.body.lstReq.interpolNum;
    let regime = req.body.lstReq.regime.split("--")[1];
    let refNum = req.body.lstReq.refNum;
    let submittdby = req.body.lstReq.submittdby;
    let submittOn = req.body.lstReq.submittOn;
    let mbmrStConfid = req.body.lstReq.mbmrStConfid;
    let statmentConf = req.body.lstReq.stmntConfid;
    let lstngNotes = req.body.lstReq.lstngNotes;
    let addtnalInf = req.body.addtlInfo;
    let availDte = req.body.availDte;
    let narrativeSumm = req.body.narrativeSumm;
    let newEntry = req.body.newEntry;
    let lstngReason = req.body.lstngReason;
    let relatedLst = req.body.relatdLst;
    let pressRelease = req.body.lstReq.presRelesee;
    let applicableMeasures = req.body.applicableMeasures;
    let narrWebsteUpdteDte = req.body.narrWebsteUpdteDte;
    let remarks = req.body.lstReq.entryRemarks;
    let idArr = [];
    let idArrs = req.body.idArr;

    // need to loop from here to line 304 for multiple identities
    for (var i = 0; i < idArrs.length; i++) {
      let addresses = req.body.idArr[i].address;
      let biometricInfs = req.body.idArr[i].biometricInf;
      let dobs = req.body.idArr[i].dobs;
      let docs = req.body.idArr[i].docs;
      let features = req.body.idArr[i].features;
      let genderStatus = req.body.idArr[i].genderStatus;
      let names = req.body.idArr[i].names;
      let nameOrgSpt = req.body.idArr[i].nameOrgSpt;

      function setNames(names, nameOrgSpt) {
        let namesArr = names.map((nm) => ({
          value: nm["name"],
          script: nm["script"],
          order: nm["order"],
          nameType: nm["nameType"],
        }));
        let nameOrgScptArr = nameOrgSpt.map((nmOSpt) => ({
          value: nmOSpt["name"],
          script: nmOSpt["script"],
          order: nmOSpt["order"],
          nameType: nmOSpt["nameType"],
        }));
        let namesObj = {};
        namesObj["names"] = namesArr;
        namesObj["nameOrgSpt"] = nameOrgScptArr;
        return namesObj;
      }
      let nameZ = setNames(names, nameOrgSpt);
      let pobs = req.body.idArr[i].pobs;
      // use a map function for the above
      // nationallty
      let identity = req.body.idArr[i].idType;
      let category = req.body.idArr[i].category;
      let idTitle = req.body.idArr[i].idTitle;
      let idDesig = req.body.idArr[i].idDesig;
      let idComment = req.body.idArr[i].idComment;
      let addrAr = [];
      let nationaltty = req.body.idArr[i].nationalttY;

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

      let biometricInfArr = biometricInfs.map(function (biometricInf) {
        let result = {
          biometric: {
            biometricType: biometricInf.bioMType,
            value: biometricInf.bioMVal,
          },
          biometricAttch: {
            href: biometricInf.bioMAttch,
            value: biometricInf.bioMAttch,
          },
          note: biometricInf.bioMNote,
        };
        return result;
      });

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

      let identityy = new IdModel({
        addresses: { address: adddressesArr },
        biometricData: { biometricInfo: biometricInfArr },
        category: category,
        comment: idComment,
        designations: { designation: idDesig },
        dobs: { dob: dobsArr },
        documents: { document: docsArr },
        entryFeatures: { feature: featuresArr, note: featNotes },
        gender: genderStatus.gender,
        livingStatus: genderStatus.livngStat,
        names: { name: nameZ["names"], nameOrgSpt: nameZ["nameOrgSpt"] },
        nationalities: { nationality: nationaltty },
        pobs: { pob: pobsArr },
        titles: { title: idTitle },
        type: identity,
      });
      idArr.push(identityy);
    }
    let submission = new SubmissionModel({
      identityMSconfidential: mbmrStConfid,
      statement: req.body.lstReq.lstngNotes,
      statementConfidential: statmentConf,
      submittedBy: [req.body.lstReq.submittdBy],
      submittedOn: req.body.lstReq.submittdOn,
    });

    let rptStatusDteArr = [];
    let sanc = new sanctionsLstModel({
      addtlInfo: req.body.addtlInfo,
      entry: {
        _id: 123,
        entryStatus: req.body.status,
        statusModifiedDte: statusModifiedDte,
        statusModifiedBy: entryStatusModifiedBy,
        entryType: recType,
        rptStatusCount: rptStatusCt,
        rptStatusDates: rptStatusDteArr.push(new Date()),
        language: [
          {
            additionalInformation: addtnalInf,
            identity: idArr,
            lang: language,
            narrativeUpdatedOn: narrWebsteUpdteDte,
            narrativeWebsiteDate: availDte,
            reasonForListing: lstngReason,
            relatedList: relatedLst,
          },
        ],
        listings: {
          unListType: [
            {
              interpolUNSN: interpolNum,
              listName: regime,
              measure: applicableMeasures,
              narrativeSummary: narrativeSumm,
              note: lstngNotes,
              referenceNumber: refNum,
              unlstItmsDef: {
                updates: { updated: pressRelease },
                measure: applicableMeasures,
              },
            },
          ],
        },
        remarks: remarks,
        submission: {
          identityMSconfidential: req.body.lstReq.mbmrStConfid,
          statement: req.body.lstReq.lstngNotes,
          statementConfidential: statmentConf,
          submittedBy: [req.body.lstReq.submittdBy],
          submittedOn: req.body.lstReq.submittdOn,
        },
      },
      langs: {
        idLst: idArr,
        lang: language,
        languagesUUID: "",
      },
      listngReason: lstngReason,
      narrUpdteOn: narrWebsteUpdteDte,
      narrWbSteDte: availDte,
      relatedLst: relatedLst,
      // "activityLog":   {"loginDte":null, "activityDte":new Date(), "userId":"Andrewwalk", "userTask":"Testting updte to actitivity log",
      // "activityNotes":"testing ativity  log update", "logoutDte":null, "prevState":"ACTIVE", "currState":"ACTIVE"}
    });

    // need to identify the parts that will now be saved initially, i.e. the narrative free form text parts
    let sanc2 = sanc;
    sanc2.langs.lang = "SP";
    sanc.save(function (err, data) {
      if (err) logg.error("the error is %o", err);
      else res.send({ "noError Saving Sanction": true, data });
    });
    async.parallel(
      [
        // for all six languages
        (callback) => sanc.save(callback),
        (callback) => sanc2.save(callback),
      ],
      (err) => {
        if (err) throw err;
        console.log("Both a and b are saved now");
      }
    );

    function callback(data) {
      res.send({ "noError Saving Sanction": true, data: data });
    }
  } catch (error) {
    logg.info("insertNewSanction error:: %s", error.message);
    res.status(500).json({ message: error.message, error });
  }
};

export const isReadyForPublish = function (req, res) {
  try {
    let sancEntryId = parseInt(req.body.sancId);
    let lang = req.body.lang;
    let status = "SUBMIT4REVIEW";
    let queryDoc = {
      "scSanctionEntry.entry.entryId": sancEntryId,
      "scSanctionEntry.entry.isStatusCurrent": { $exists: false },
      "scSanctionEntry.entry.entryStatus": status,
      "scSanctionEntry.submitReviewConfirmed": true,
    };
    let updteDoc = { $set: { "scSanctionEntry.submitReviewConfirmed": true } };
    let options = { new: true };
    sanctionsLstModel.countDocuments(queryDoc, function (err, data) {
      if (err) {
        logg.error("the confirmSubmitForReview Error is %o", err);
        res.status(400).json({ message: err.message, error: err });
        // res.send({"Error while confirmSubmitForReview": true, 'err': err});
      } else {
        logg.info("noError confirmSubmitForReview  %o", data);
        res.send({
          "noError confirmSubmitForReview ": true,
          submitReviewConfirmed: data.scSanctionEntry.submitReviewConfirmed,
        });
      }
    });
  } catch (error) {
    logg.info("isReadyForPublish error:: %s", error.message);
    res.status(500).json({ message: error.message, error });
  }
};

export const confirmSubmitForReview = function (req, res) {
  try {
    // get the scSanctionEntryId, check tha tthe currentstatus is indeed Submit4Review, then upate a single field to ensure that
    logg.info("Inised of confirmSubmitForReview");
    let sancEntryId = parseInt(req.body.sancId);
    let lang = req.body.lang;
    let status = "SUBMIT4REVIEW";
    let queryDoc = {
      "scSanctionEntry.entry.entryId": sancEntryId,
      "scSanctionEntry.entry.isStatusCurrent": { $exists: false },
      "scSanctionEntry.entry.entryStatus": status,
      "scSanctionEntry.langs.lang": lang,
    };
    let updteDoc = { $set: { "scSanctionEntry.submitReviewConfirmed": true } };
    let options = { new: true };
    sanctionsLstModel.findOneAndUpdate(queryDoc, updteDoc, options, function (
      err,
      data
    ) {
      if (err) {
        logg.error("the confirmSubmitForReview Error is %o", err);
        res.status(400).json({ message: err.message, error: err });
        // res.send({"Error while confirmSubmitForReview": true, 'err': err});
      } else {
        logg.info("noError confirmSubmitForReview  %o", data);
        res.send({ "noError confirmSubmitForReview ": true, data: data });
      }
    });
  } catch (error) {
    logg.info("confirmSubmitForReview error:: %s", error.message);
    res.status(500).json({ message: error.message, error });
  }
};

export const submitForReviewOtherLangs = function (req, res) {
  // takes records as shown onscreen and updates the free text fields
  try {
    let tmpRef = JSON.parse(req.body.entryData);
    let lstngNotes = tmpRef.lstReq.lstngNotes;
    let statmentConfid = tmpRef.lstReq.stmntConfid;
    let remarks = tmpRef.lstReq.entryRemarks;
    let language = tmpRef.lang; //aw get thsi from request
    let refNum = null;
    let entryStatus = "SUBMIT4REVIEW";
    let addtnalInf = tmpRef.addtlInfo;
    let narrativeSumm = tmpRef.narrativeSumm;
    let entryId = parseInt(tmpRef.newEntry, 10);
    let lstngReason = tmpRef.lstngReason;

    // Below is from Identity section, will have to take the whole tab content
    let idArr = [];
    let idArrs = tmpRef.idArr;
    let fileIdsToBDeleteArr = [];

    let filesArr = req.files;
    let persistentAttchmntsArr = [];

    function getAttchLocationInFilesArr(searchStr) {
      let result = filesArr.findIndex((obj) => obj.originalname == searchStr);
      logg.info("the result is %d", result);
      return result;
    }

    function createArrayOfAttchmentsForDB(objIdStr, fileRef) {
      let fileAttchmnt = fileRef;
      if (fileAttchmnt != null) {
        let filenam = fileAttchmnt.originalname.substr(
          fileAttchmnt.originalname.lastIndexOf("_") + 1
        );

        let attchmnt = {
          _id: new ObjectID(objIdStr),
          attchmntName: filenam,
          contentType: fileAttchmnt.mimetype,
          size: fileAttchmnt.size,
          attchmnt: new Buffer(fileAttchmnt.buffer, "base64"),
        }; //  let attchmnt = {'_id': new ObjectID (objIdStr),  "attchmntName": filenam, "contentType": fileAttchmnt.mimetype, "size": fileAttchmnt.size, 'attchmnt':new Buffer(fileAttchmnt.buffer, 'base64')}; //new Buffer(encode_file, 'base64')
        persistentAttchmntsArr.push(attchmnt);
      }
    }

    // need to loop from here to line 304 for multiple identities
    for (var i = 0; i < idArrs.length; i++) {
      let tabId = new mongoose.Types.ObjectId();
      let addresses = tmpRef.idArr[i].address;
      let biometricInfs = tmpRef.idArr[i].biometricInf;
      let dobs = tmpRef.idArr[i].dobs;
      let docs = tmpRef.idArr[i].docs;
      let features = tmpRef.idArr[i].features;
      let genderStatus = tmpRef.idArr[i].genderStatus;
      let names = tmpRef.idArr[i].names;
      let nameOrgSpt = tmpRef.idArr[i].nameOrgSpt;

      function setNames(names, nameOrgSpt) {
        let namesArr = names.map((nm) => ({
          value: nm["name"],
          script: nm["script"],
          order: nm["order"],
          nameType: nm["nameType"],
        }));
        let nameOrgScptArr = nameOrgSpt.map((nmOSpt) => ({
          value: nmOSpt["name"],
          script: nmOSpt["script"],
          order: nmOSpt["order"],
          nameType: nmOSpt["nameType"],
        }));
        let namesObj = {};
        namesObj["names"] = namesArr;
        namesObj["nameOrgSpt"] = nameOrgScptArr;
        return namesObj;
      }
      let nameZ = setNames(names, nameOrgSpt);
      let pobs = tmpRef.idArr[i].pobs;
      // use a map function for the above
      // nationality
      let identity = tmpRef.idArr[i].idType;
      let category = tmpRef.idArr[i].category;
      let idTitle = tmpRef.idArr[i].idTitle;
      let idDesigs = tmpRef.idArr[i].idDesig;
      let idComment = tmpRef.idArr[i].idComment;
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

            if (!fileInfo.fileId) {
              // only creae a new fileID if one didn't exist beforehand
              fileInfo.fileId = new mongoose.Types.ObjectId();
            }
            logg.info("the file attachment id is %s", fileInfo.fileId);
            let filesIndex = getAttchLocationInFilesArr(searchStr);
            if (filesIndex != -1) {
              createArrayOfAttchmentsForDB(
                fileInfo.fileId,
                req.files[filesIndex]
              );
            }
          }
        });
      }

      // Only need biometric note, so have to adjust this logic - if we already have an id
      let biometricInfArr = biometricInfs.map((biometricInf) => {
        fileIdsToBDeleteArr = fileIdsToBDeleteArr.concat(
          biometricInf.bioMDeletes
        );
        if (biometricInf.bioMAttch) {
          // only necessary when there is an attachment without an id
          setMongooseObjectId(biometricInf);
          let bioMAttchconsolidated = biometricInf.bioMAttch;
          if (biometricInf.bioMPrevAttchs) {
            bioMAttchconsolidated = biometricInf.bioMAttch.concat(
              biometricInf.bioMPrevAttchs
            );
          }

          return {
            biometricType: biometricInf.bioMType,
            value: biometricInf.bioMVal,
            note: biometricInf.bioMNote,
            biometricAttch: bioMAttchconsolidated,
            tabId: tabId,
            allBiometricIdForTab: new mongoose.Types.ObjectId(),
          };
        } else {
          let bioMAttchconsolidated = biometricInf.bioMPrevAttchs;
          return {
            biometricType: biometricInf.bioMType,
            value: biometricInf.bioMVal,
            note: biometricInf.bioMNote,
            biometricAttch: bioMAttchconsolidated,
            tabId: tabId,
            allBiometricIdForTab: new mongoose.Types.ObjectId(),
          };
        }
      });

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

      let identityy = new IdModel({
        addresses: { address: adddressesArr },
        biometricData: { biometricInfo: { biometric: biometricInfArr } },
        category: category,
        comment: idComment,
        designations: { designation: idDesigs },
        dobs: { dob: dobsArr },
        documents: { document: docsArr },
        entryFeatures: { feature: featuresArr, note: featNotes },
        gender: genderStatus.gender,
        livingStatus: genderStatus.livngStat,
        names: { name: nameZ["names"], nameOrgSpt: nameZ["nameOrgSpt"] },
        nationalities: { nationality: nationaltty },
        pobs: { pob: pobsArr },
        titles: { title: idTitle },
        type: identity,
      });
      idArr.push(identityy);
    } // end loop for id Tab array
    /*  now persist to the database ,the whole identity, plus free text parts of narrative summary and Lst Req,
        but make sure to add the refNum AND ChosenLanguage
    */

    let updateDoc: {} = {
      $set: {
        "scSanctionEntry.langs": {
          idLst: idArr,
          lang: language,
          languagesUUID: "",
          language: [
            {
              additionalInformation: tmpRef.addtlInfo,
              identity: idArr,
              lang: language,
              reasonForListing: lstngReason,
            },
          ],
        },
        listings: {
          unListType: [{ note: lstngNotes, referenceNumber: refNum }],
        },
        "scSanctionEntry.addtlInfo": tmpRef.addtlInfo,
        "scSanctionEntry.listngReason": lstngReason,
        "scSanctionEntry.entry.remarks": remarks,
        "scSanctionEntry.entry.submission.statement": statmentConfid,
        "scSanctionEntry.entry.submission.statementConfidential": statmentConfid,
      },
    };
    sanctionsLstModel.update(
      {
        "scSanctionEntry.entry.entryId": entryId,
        "scSanctionEntry.langs.lang": language,
        "scSanctionEntry.entry.entryStatus": entryStatus,
      },
      updateDoc,
      function (err, data) {
        if (err) {
          logg.error(
            "the  Entry in Submit4Review otherLangs  Error is %o",
            err
          );
          res.status(500).json({ message: err.message, error: err });
          // res.send({"Error while  Entry in Submit4Review otherLangs ": true, 'err': err});
        } else {
          logg.info(
            "noError updating Entry in Submit4Review otherLangs %o",
            data
          );
          res.send({
            "noError updating   Entry in Submit4Review otherLangs ": true,
            data: data,
          });
        }
      }
    );
  } catch (error) {
    logg.info("submitForReviewOtherLangs error:: %s", error.message);
    res.status(500).json({ message: error.message, error });
  }
};

export const submitForReview = async function (req, res) {
  // takes pending records from the database and updates the status
  try {
    let sanctId = req.body.sanctionId;
    let currStatus = "PENDING";
    let nextStatus = "SUBMIT4REVIEW";
    let recordCount = 6;
    let optionLenDoc = { limit: recordCount };
    let lookup = (await getLookupAllList())[0];
    let entryStatusArr = JSON.parse(JSON.stringify(lookup.entryStatus));
    let curStatusObj = entryStatusArr.find((item) => item["EN"] == "PENDING");
    let nextStatusObj = entryStatusArr.find(
      (item) => item["EN"] == "SUBMIT4REVIEW"
    );

    let qryDoc = {
      "scSanctionEntry.entry.entryId": sanctId,
      "scSanctionEntry.entry.entryStatus": { $in: Object.values(curStatusObj) },
    };
    let loggedOnUser = "testUser";

    function callback(err, data) {
      if (err) {
        throw err;
      } else {
      }
    }

    sanctionsLstModel.find(qryDoc, null, optionLenDoc, function (err, docs) {
      if (err) {
        return logg.error("submitForReview find error %o", err.message);
      } else {
        let oldIdArr = [];
        let sancArr = docs.map((tmpDoc) => {
          let old_id = tmpDoc._id;
          oldIdArr.push(new ObjectID(old_id));
          tmpDoc.scSanctionEntry.entry.versionHistory.push({
            status: tmpDoc.scSanctionEntry.entry.entryStatus,
            statusModifiedDte: tmpDoc.scSanctionEntry.entry.statusModifiedDte,
            rptStatusCount: tmpDoc.scSanctionEntry.entry.rptStatusCount
         });
          tmpDoc.scSanctionEntry.entry.entryStatus =
            nextStatusObj[tmpDoc.scSanctionEntry.langs.lang];

          let sibLingCreateDte = tmpDoc.scSanctionEntry.entry.statusModifiedDte;
          tmpDoc.scSanctionEntry.entry.statusModifiedDte = new Date();
          tmpDoc.scSanctionEntry.entry.statusModifiedBy = loggedOnUser;

          let newActivity = {
            activityDte: new Date(),
            userEmail: tmpDoc.userEmail,
            prevState: currStatus,
            currState: nextStatus,
            activityNotes: "Entry submitted for review",
          };
          tmpDoc.scSanctionEntry.activityLog.push(newActivity);

          tmpDoc.scSanctionEntry.siblings.push({
            identifier: old_id,
            entryId: sanctId,
            entryStatus: currStatus,
            entryStatusCreateDte: sibLingCreateDte,
          });
          return tmpDoc;
        });

        let results = [];

        // also update is isStatusCurrent flag within a transaction.  This will ensure it doesn't show up on fthe front end listing of its previous state.
        let s4rResult = async.map(
          sancArr,
          function (sanc, callback) {
            const curLang = sanc.scSanctionEntry.langs.lang;
            const status = curStatusObj[curLang];

            sanctionsLstModel.update(
              {
                _id: sanc._id,
                "scSanctionEntry.entry.entryStatus": status,
                "scSanctionEntry.langs.lang": curLang,
              },
              sanc,
              function (err, data) {
                if (err) {
                  logg.error(
                    "submitForReview sanctionsLstModel.findOneAndUpdate error %o",
                    err.message
                  );
                  throw err;
                }
              }
            );
          },
          callback(err, results)
        );

        // sendEmailFunc("Secretary").then((sendRes) => {
          res.send(s4rResult);
        // });
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message, error });
  }
};

// this is for editing entry, submit4review to publish does not call this
export const updateSanction = async function (req, res) {
  try {
    let tmpRef = JSON.parse(req.body.entryData);
    let filesArr = req.files;
    let persistentAttchmntsArr = [];

    function getAttchLocationInFilesArr(searchStr) {
      return filesArr.findIndex((obj) => obj.originalname == searchStr);
    }

    function createArrayOfAttchmentsForDB(objIdStr, fileRef) {
      let fileAttchmnt = fileRef;
      if (fileAttchmnt != null) {
        let filenam = fileAttchmnt.originalname.substr(
          fileAttchmnt.originalname.lastIndexOf("_") + 1
        );
        let attchmnt = {
          _id: new ObjectID(objIdStr),
          attchmntName: filenam,
          contentType: fileAttchmnt.mimetype,
          size: fileAttchmnt.size,
          attchmnt: new Buffer(fileAttchmnt.buffer, "base64"),
        };
        persistentAttchmntsArr.push(attchmnt);
      }
    }

    let entryStatusModifiedBy = "";
    let statusModifiedDte = new Date();
    let recType = tmpRef.lstReq.recordTyp;
    let isIndividualEntry = recType.indexOf('Individual') >= 0;
    let interpolNum = tmpRef.lstReq.interpolNum;
    let regime = tmpRef.lstReq.regime.split("--")[1];
    let refNum = tmpRef.lstReq.refNum;
    let sanctionMetaData = tmpRef.sanctionMetaData;
    let prevStatus: string;
    let nextStatus: string;
    let docUnderscoreId: string;

    if (sanctionMetaData) {
      prevStatus = sanctionMetaData.prevState;
      nextStatus = sanctionMetaData.nextState;
      docUnderscoreId = sanctionMetaData.docUnderscoreId;
    }

    let statmentConfid = tmpRef.lstReq.stmntConfid;
    let lstngNotes = tmpRef.lstReq.lstngNotes;
    let addtnalInf = tmpRef.addtlInfo;
    let availDte = tmpRef.availDte;
    let narrativeSumm = tmpRef.narrativeSumm;
    let newEntry = parseInt(tmpRef.newEntry, 10);
    let lstngReason = tmpRef.lstngReason;
    let relatedLst = tmpRef.relatdLst;
    let pressRelease = tmpRef.lstReq.presRelesee;
    let applicableMeasures = tmpRef.applicableMeasures;
    let narrWebsteUpdteDte = tmpRef.narrWebsteUpdteDte;
    let remarks = tmpRef.lstReq.entryRemarks;

    let idArr = [];
    let idArrs = tmpRef.idArr;
    let fileIdsToBDeleteArr = [];

    // need to loop for multiple identities
    for (let i = 0; i < idArrs.length; i++) {
      let tabId = new mongoose.Types.ObjectId();
      let addresses = tmpRef.idArr[i].address;
      let biometricInfs = tmpRef.idArr[i].biometricInf;
      let dobs = tmpRef.idArr[i].dobs;
      let docs = tmpRef.idArr[i].docs;
      let features = tmpRef.idArr[i].features;
      let genderStatus = tmpRef.idArr[i].genderStatus || '';
      let names = tmpRef.idArr[i].names;
      let nameOrgSpt = tmpRef.idArr[i].nameOrgSpt;

      function setNames(names, nameOrgSpt) {
        let namesArr = names.map((nm) => ({
          value: nm["name"],
          script: nm["script"],
          order: nm["order"],
          nameType: nm["nameType"],
        }));
        let nameOrgScptArr = nameOrgSpt.map((nmOSpt) => ({
          value: nmOSpt["name"],
          script: nmOSpt["script"],
          order: nmOSpt["order"],
          nameType: nmOSpt["nameType"],
        }));
        let namesObj = {};
        namesObj["names"] = namesArr;
        namesObj["nameOrgSpt"] = nameOrgScptArr;
        return namesObj;
      }

      let nameZ = setNames(names, nameOrgSpt);
      let pobs = tmpRef.idArr[i].pobs;
      let identity = tmpRef.idArr[i].idType;
      let category = tmpRef.idArr[i].category;
      let idTitle = isIndividualEntry ? tmpRef.idArr[i].idTitle : [tmpRef.idArr[i].idTitleSingle];
      let idDesigs = tmpRef.idArr[i].idDesig;
      let idComment = tmpRef.idArr[i].idComment;
      let nationality = tmpRef.idArr[i].nationalttY;

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
        return new addressModel(tmpAddr);
      });

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

            if (!fileInfo.fileId) {
              // only creae a new fileID if one didn't exist beforehand
              fileInfo.fileId = new mongoose.Types.ObjectId();
            }

            let filesIndex = getAttchLocationInFilesArr(searchStr);
            if (filesIndex != -1) {
              createArrayOfAttchmentsForDB(
                fileInfo.fileId,
                req.files[filesIndex]
              );
            }
          }
        });
      }

      // here we create the objectId to be used for the biotmetric attachments which will be saved later on
      let biometricInfArr = biometricInfs.map((biometricInf) => {
        fileIdsToBDeleteArr = fileIdsToBDeleteArr.concat(
          biometricInf.bioMDeletes
        );
        if (biometricInf.bioMAttch) {
          // only necessary when there is an attachment without an id
          // will create ONLY if the objectId did not exist, i.e for new entries
          setMongooseObjectId(biometricInf);
          let bioMAttchconsolidated = biometricInf.bioMAttch;

          return {
            biometricType: biometricInf.bioMType,
            value: biometricInf.bioMVal,
            note: biometricInf.bioMNote,
            biometricAttch: bioMAttchconsolidated,
            tabId: tabId,
            allBiometricIdForTab: new mongoose.Types.ObjectId(),
          };
        } else {
          let bioMAttchconsolidated = biometricInf.bioMPrevAttchs;
          return {
            biometricType: biometricInf.bioMType,
            value: biometricInf.bioMVal,
            note: biometricInf.bioMNote,
            biometricAttch: bioMAttchconsolidated,
            tabId: tabId,
            allBiometricIdForTab: new mongoose.Types.ObjectId(),
          };
        }
      });

      let docsArr = docs.map(function (docz) {
        return new Docs(
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
      });

      // below is part of idSchema
      let dobsArr = dobs.map(function (dob) {
        return new Dobs(
          dob.dobType,
          dob.dobSubset,
          dob.dobSpecDte,
          dob.dobFrom,
          dob.dobTo,
          dob.dobNote,
          dob.dobSubsetDte
        );
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
        return new Pobs(addr);
      });

      let identityy = new IdModel({
        addresses: { address: adddressesArr },
        biometricData: { biometricInfo: { biometric: biometricInfArr } },
        category: category,
        comment: idComment,
        designations: { designation: idDesigs },
        dobs: { dob: dobsArr },
        documents: { document: docsArr },
        entryFeatures: { feature: featuresArr, note: featNotes },
        gender: genderStatus.gender || {},
        livingStatus: genderStatus.livngStat,
        names: { name: nameZ["names"], nameOrgSpt: nameZ["nameOrgSpt"] },
        nationalities: { nationality },
        pobs: { pob: pobsArr },
        titles: { title: idTitle },
        type: identity,
      });

      idArr.push(identityy);
    }

    let language = tmpRef.lstReq.language;
    let result = (await getLookupAllList())[0];

    let entryTypeArr = JSON.parse(JSON.stringify(result.entryType));
    let entryType = entryTypeArr.find(
      (item) => item[language]['entryTypeName'] == tmpRef.lstReq.recordTyp
    );

    let entryStatusArr = JSON.parse(JSON.stringify(result.entryStatus));
    let entryStatus = entryStatusArr.find(
      (item) => item[language] == tmpRef.status
    );

    let regimeArr = JSON.parse(JSON.stringify(result.regime));
    let regimeKey = ""; // i.e: QD
    let regimeObj = regimeArr.find((item) => {
      const key = Object.keys(item[language]).find(
        (key) => key !== "isActive" && key !== "measures"
      );
      regimeKey = item[language][key] === tmpRef.regime ? key : "";
      return item[language][key] === tmpRef.regime;
    });

    let langArr = JSON.parse(JSON.stringify(result.language));

    let applicableMeasuresArr = JSON.parse(JSON.stringify(result.measures));
    let measures = tmpRef.applicableMeasures.map((measure) => {
      return applicableMeasuresArr.find(
        (item) => item[language].measureNm === measure
      );
    });

    // create amendment: active -> amend -> pending
    if (refNum && prevStatus == "ACTIVE" && nextStatus == "PENDING") {
      let oldAmendmentInfo = tmpRef.sanctionMetaData.amendmentInfo;
      let amendmentCount = oldAmendmentInfo.length + 1;
      let amendmentID = refNum + "_A_" + amendmentCount;

      let newEntryId = 0;
      await CountersModel.findOneAndUpdate({_id: "entryIdCount"}, {$inc: {seq: 1}}, { new: true },
        async function (err, result) {
          if (err) return err;
          
          const nextStatusObj = entryStatusArr.find(
            (item) => item["EN"] == "PENDING"
          );
          const numberOfAmendments = await sanctionsLstModel.find({
            "scSanctionEntry.entry.entryID": { $ne: tmpRef.newEntry },
            "scSanctionEntry.entry.listings.unListType.0.referenceNumber": { $regex: `${refNum}..*` },
            "scSanctionEntry.langs.lang": "EN",
          }).count() + 1;

          newEntryId = result["seq"];
          for (let i = 0; i < langArr.length; i ++) {
            const langAcronym = langArr[i].acronym;

            let amendedEntry = await sanctionsLstModel.findOne(
              {
                "scSanctionEntry.entry.entryId": newEntry,
                "scSanctionEntry.entry.listings.unListType.0.referenceNumber": refNum,
                "scSanctionEntry.langs.lang": langAcronym,
              });
            amendedEntry = JSON.parse(JSON.stringify(amendedEntry));
            const {_id, ...rest} = amendedEntry;
            rest.scSanctionEntry.entry.listings.unListType[0].referenceNumber = refNum + '.' + numberOfAmendments;
            rest.scSanctionEntry.entry.entryId = newEntryId;
            rest.scSanctionEntry.activityLog = [];
            rest.scSanctionEntry.entry.entryStatus = nextStatusObj[langAcronym];
            rest.scSanctionEntry.entry.entryType = entryType[langAcronym]['entryTypeName'];
            rest.scSanctionEntry.amendmentId = amendmentID;
            rest.scSanctionEntry.translated = false;
            rest.scSanctionEntry.entry.versionHistory = [];

            let sanc = new sanctionsLstModel(rest);

            sanc.save();
          }
        }
      );

      // update active entry
      let updateDoc = {
        "scSanctionEntry.addtlInfo": addtnalInf,
        "scSanctionEntry.entry.entryId": newEntry,
        "scSanctionEntry.entry.statusModifiedDte": statusModifiedDte,
        "scSanctionEntry.entry.statusModifiedBy": entryStatusModifiedBy,
        "scSanctionEntry.entry.entryType": recType,
        "scSanctionEntry.entry.language[0].additionalInformation": addtnalInf,
        "scSanctionEntry.entry.language[0].identity": idArr,
        "scSanctionEntry.entry.language[0].narrativeUpdatedOn": narrWebsteUpdteDte,
        "scSanctionEntry.entry.language[0].narrativeWebsiteDate": availDte,
        "scSanctionEntry.entry.language[0].reasonForListing": lstngReason,
        "scSanctionEntry.entry.language[0].relatedList": relatedLst,
        "scSanctionEntry.entry.listings.unListType[0].interpolUNSN": interpolNum,
        "scSanctionEntry.entry.listings.unListType[0].listName": regime,
        "scSanctionEntry.entry.listings.unListType[0].measure": applicableMeasures,
        "scSanctionEntry.entry.listings.unListType[0].narrativeSummary": narrativeSumm,
        "scSanctionEntry.entry.listings.unListType[0].note": lstngNotes,
        "scSanctionEntry.entry.listings.unListType[0].referenceNumber": refNum,
        "scSanctionEntry.entry.listings.unListType[0].unlstItmsDef.updates.updated": pressRelease,
        "scSanctionEntry.entry.listings.unListType[0].unlstItmsDef.measure": applicableMeasures,
        "scSanctionEntry.entry.remarks": remarks,
        "scSanctionEntry.entry.submission.identityMSconfidential": tmpRef.lstReq.mbmrStConfid,
        "scSanctionEntry.entry.submission.statement": tmpRef.lstReq.lstngNotes,
        "scSanctionEntry.entry.submission.statementConfidential": statmentConfid,
        "scSanctionEntry.entry.submission.submittedBy": tmpRef.lstReq.submittdBy,
        "scSanctionEntry.entry.submission.submittedOn": tmpRef.lstReq.submittdOn,
        "scSanctionEntry.langs.idLst": idArr,
        "scSanctionEntry.langs.lang": language,
        "scSanctionEntry.langs.languagesUUID": "",
        "scSanctionEntry.lstngReason": lstngReason,
        "scSanctionEntry.narrUpdteOn": narrWebsteUpdteDte,
        "scSanctionEntry.narrWbSteDte": availDte,
        "scSanctionEntry.relatedLst": relatedLst,
        "scSanctionEntry.amendmentInfo": [],
      };
      let newActivity = {
        userTask: "Amend",
        refNum: refNum,
        activityDte: new Date(),
        userEmail: tmpRef.userEmail,
        prevState: "ACTIVE",
        currState: "ACTIVE",
        activityNotes: `Amendment created`,
      };

      updateDoc["$push"] = {
        "scSanctionEntry.activityLog": newActivity,
      };
      updateDoc["scSanctionEntry.siblings"] = [];
      updateDoc["scSanctionEntry.parent"] = docUnderscoreId;
      updateDoc["scSanctionEntry.ancestors"] = [
        { identifier: docUnderscoreId },
      ];

      delete updateDoc[
        "scSanctionEntry.entry.listings.unListType[0].referenceNumber"
      ];
      delete updateDoc["scSanctionEntry.entry.entryId"];
      // we want this status to be the currentStatus of PENDING, so wouldn't set to false
      delete updateDoc["scSanctionEntry.entry.isStatusCurrent"];

      let updateActiveAmendInfo = {};

      if (oldAmendmentInfo.length == 0) {
        updateActiveAmendInfo = {
          "scSanctionEntry.amendmentInfo": {
            amendmentCount: amendmentCount,
            amendmentDte: new Date(),
            child: { amendmentId: amendmentID },
          },
        };
      } else {
        updateActiveAmendInfo = {
          $addToSet: {
            "scSanctionEntry.amendmentInfo": {
              amendmentCount: amendmentCount,
              amendmentDte: new Date(),
              child: { amendmentId: amendmentID },
            }
          },
        };
      }

      async function updateActiveDocAndCreateAmendmentInPendingStateTransactionally() {
        // const session = await mongoose.startSession();
        // session.startTransaction();
        try {
          for (let i = 0; i < langArr.length; i ++) {
            const langAcronym = langArr[i].acronym;
            updateDoc["scSanctionEntry.entry.entryType"] = entryType[langAcronym]['entryTypeName'];;
            updateDoc["scSanctionEntry.entry.language[0].lang"] = langAcronym;
            updateDoc["scSanctionEntry.langs.lang"] = langAcronym;

            await sanctionsLstModel.findOneAndUpdate(
              {
                "scSanctionEntry.entry.entryId": newEntry,
                "scSanctionEntry.entry.listings.unListType.0.referenceNumber": refNum,
                "scSanctionEntry.langs.lang": langAcronym,
              },
              updateDoc
            );
          }

          for (let i = 0; i < langArr.length; i ++) {
            const langAcronym = langArr[i].acronym;
            await sanctionsLstModel.updateOne(
              {
                "scSanctionEntry.entry.entryId": newEntry,
                "scSanctionEntry.entry.listings.unListType.0.referenceNumber": refNum,
                "scSanctionEntry.langs.lang": langAcronym,
              },
              updateActiveAmendInfo
            );
          }

          // await session.commitTransaction();
          // session.endSession();

          res.send({ success: true, data: "success" });
        } catch (error) {
          // If an error occurred, abort the whole transaction and
          // undo any changes that might have happened
          // await session.abortTransaction();
          // session.endSession();
          throw error;
        }
      }

      try {
        (async () => {
          await updateActiveDocAndCreateAmendmentInPendingStateTransactionally();
        })();
      } catch (error) {
        console.log(error.message);
      }
    } else {
      let updateDoc = {
        scSanctionEntry: {
          addtlInfo: addtnalInf,
          entry: {
            entryId: newEntry,
            entryStatus: tmpRef.status,
            statusModifiedDte: statusModifiedDte,
            statusModifiedBy: entryStatusModifiedBy,
            entryType: recType,
            language: [
              {
                additionalInformation: addtnalInf,
                identity: idArr,
                lang: language,
                narrativeUpdatedOn: narrWebsteUpdteDte,
                narrativeWebsiteDate: availDte,
                reasonForListing: lstngReason,
                relatedList: relatedLst,
              },
            ],
            listings: {
              unListType: [
                {
                  interpolUNSN: interpolNum,
                  listName: regime,
                  measure: applicableMeasures,
                  narrativeSummary: narrativeSumm,
                  note: lstngNotes,
                  referenceNumber: refNum,
                  unlstItmsDef: {
                    updates: { updated: pressRelease },
                    measure: applicableMeasures,
                  },
                },
              ],
            },
            remarks: remarks,
            submission: {
              identityMSconfidential: tmpRef.lstReq.mbmrStConfid,
              statement: tmpRef.lstReq.lstngNotes,
              statementConfidential: statmentConfid,
              submittedBy: tmpRef.lstReq.submittdBy,
              submittedOn: tmpRef.lstReq.submittdOn,
            },
            rptStatusCount: 0
          },
          langs: {
            idLst: idArr,
            lang: language,
            languagesUUID: "",
          },
          listngReason: lstngReason,
          narrUpdteOn: narrWebsteUpdteDte,
          narrWbSteDte: availDte,
          relatedLst,
        },
      };
      let newActivity = {
        activityDte: new Date(),
        userEmail: tmpRef.userEmail,
        prevState: tmpRef.lstReq.status,
        currState: tmpRef.status,
        activityNotes: "Entry edited",
      };

      // now insert the fileAttachmeents
      FileAttchModel.insertMany(persistentAttchmntsArr, function (err, data) {
        if (err) {
          logg.error("insertFileAttachments the error is %o", err.message);
        }
      });

      for (const langZ of langArr) {
        const langAcronym = langZ.acronym;
        let query = {
          "scSanctionEntry.entry.entryId": newEntry,
          "scSanctionEntry.langs.lang": langAcronym,
        };

        // get sanction for a specific language
        const oldEntries = await new Promise((res, rej) => {
          sanctionsLstModel.find(query, null, { limit: 1 }, function (
            err,
            docs
          ) {
            if (err) {
              return res(false);
            } else {
              return res(docs);
            }
          });
        });

        // update sanction based on its original data
        if ((oldEntries as any).length > 0) {
          const oldEntry = oldEntries[0];

          idArr = idArr.map((item, index) => {
            if (langAcronym !== language) {
              item.biometricData.biometricInfo = item.biometricData.biometricInfo.biometric.map(biometric => {
                biometric.note = null;
                if (
                  oldEntry.scSanctionEntry.langs.idLst[index] &&
                  oldEntry.scSanctionEntry.langs.idLst[index].biometricData.biometricInfo.biometric
                ) {
                  for (const prevBiometric of oldEntry.scSanctionEntry.langs.idLst[index].biometricData.biometricInfo.biometric) {
                    if (biometric.biometricType == prevBiometric.biometricType) {
                      biometric.note = prevBiometric.note;
                    }
                  }
                }
                return biometric;
              });

              if (oldEntry.scSanctionEntry.langs.idLst[index]) {
                // identity titles
                if (oldEntry.scSanctionEntry.langs.idLst[index].titles.title.length > 0) {
                  item.titles.title = oldEntry.scSanctionEntry.langs.idLst[index].titles.title;
                }

                // identity notes
                item.comment = oldEntry.scSanctionEntry.langs.idLst[index].comment;

                // names - use existing values
                if (oldEntry.scSanctionEntry.langs.idLst[index].names.name.length > 0) {
                  item.names.name = oldEntry.scSanctionEntry.langs.idLst[index].names.name;
                }

                // name original script - use existing values
                if (oldEntry.scSanctionEntry.langs.idLst[index].names.nameOrgSpt.length > 0) {
                  item.names.nameOrgSpt = oldEntry.scSanctionEntry.langs.idLst[index].names.nameOrgSpt;
                }

                // dates of birth
                if (oldEntry.scSanctionEntry.langs.idLst[index].dobs.dob.length > 0) {
                  item.dobs = oldEntry.scSanctionEntry.langs.idLst[index].dobs;
                  console.log(item.dobs.dob.length)
                  console.log(tmpRef.idArr[index].dobs.length)
                  // if adding new items - then please attach them
                }

                // places of birth
                if (oldEntry.scSanctionEntry.langs.idLst[index].pobs.pob.length > 0) {
                  item.pobs = oldEntry.scSanctionEntry.langs.idLst[index].pobs;
                }

                // addresses
                if (oldEntry.scSanctionEntry.langs.idLst[index].addresses.address.length > 0) {
                  item.addresses = oldEntry.scSanctionEntry.langs.idLst[index].addresses;
                }

                // nationalities
                if (oldEntry.scSanctionEntry.langs.idLst[index].nationalities.nationality.length > 0) {
                  item.nationalities.nationality = oldEntry.scSanctionEntry.langs.idLst[index].nationalities.nationality;
                }

                // features
                if (oldEntry.scSanctionEntry.langs.idLst[index].entryFeatures.feature.length > 0) {
                  item.entryFeatures.feature = oldEntry.scSanctionEntry.langs.idLst[index].entryFeatures.feature;
                  item.entryFeatures.note = oldEntry.scSanctionEntry.langs.idLst[index].entryFeatures.note;
                }

                // designations
                if (oldEntry.scSanctionEntry.langs.idLst[index].designations.designation.length > 0) {
                  item.designations.designation = oldEntry.scSanctionEntry.langs.idLst[index].designations.designation;
                }

                // documents
                if (oldEntry.scSanctionEntry.langs.idLst[index].documents.document.length > 0) {
                  item.documents.document = oldEntry.scSanctionEntry.langs.idLst[index].documents.document;
                }
              }
            } else {
              item.biometricData.biometricInfo = item.biometricData.biometricInfo.biometric.map((biometric, i) => {
                biometric.note = tmpRef.idArr[index].biometricInf[i].bioMNote;
                return biometric;
              });

              // names - use new values
              item.names.name = tmpRef.idArr[index].names.map((nm) => ({
                value: nm["name"],
                script: nm["script"],
                order: nm["order"],
                nameType: nm["nameType"],
              }));

              // name original script - use new values
              item.names.nameOrgSpt = tmpRef.idArr[index].nameOrgSpt.map((nmOSpt) => ({
                value: nmOSpt["name"],
                script: nmOSpt["script"],
                order: nmOSpt["order"],
                nameType: nmOSpt["nameType"],
              }));

              // dates of birth - use new values
              item.dobs.dob = tmpRef.idArr[index].dobs.map(dob => new Dobs(
                dob.dobType,
                dob.dobSubset,
                dob.dobSpecDte,
                dob.dobFrom,
                dob.dobTo,
                dob.dobNote,
                dob.dobSubsetDte
              ));

              // places of birth - use new values
              item.pobs.pob = tmpRef.idArr[index].pobs.map(pob => {
                const loc = { lat: pob.lat, lng: pob.lng, region: pob.region };
                const addr = new Address(
                  pob.city,
                  pob.country,
                  loc,
                  pob.note,
                  pob.stateProv,
                  pob.street,
                  pob.zipCde
                );
                return new Pobs(addr);
              });

              // identity titles
              item.titles = { title: isIndividualEntry ? tmpRef.idArr[index].idTitle : [tmpRef.idArr[index].idTitleSingle] };

              // identity notes
              item.comment = tmpRef.idArr[index].idComment;

              // addresses
              item.addresses.address = tmpRef.idArr[index].address.map((addr) => {
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
                return new addressModel(tmpAddr);
              });

              // nationalities
              item.nationalities.nationality = tmpRef.idArr[index].nationalttY;

              // features
              let featureNote = "";
              item.entryFeatures.feature = tmpRef.idArr[index].features.map((feature) => {
                let result = new Features(
                  feature.featureType,
                  feature.fStatus,
                  feature.fValue,
                  feature.fNotes,
                  feature.title
                );
                featureNote += feature.fNotes + ", ";
                return result;
              });
              item.entryFeatures.note = featureNote;

              // designations
              item.designations.designation = tmpRef.idArr[index].idDesig;

              // docs
              item.documents.document = tmpRef.idArr[index].docs.map(function (docz) {
                return new Docs(
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
              });
            }
            return item;
          });

          updateDoc.scSanctionEntry = oldEntry.scSanctionEntry;
          updateDoc.scSanctionEntry.langs = {
            idLst: idArr,
            lang: langAcronym,
            languagesUUID: "",
          };
          updateDoc.scSanctionEntry.narrUpdteOn = narrWebsteUpdteDte;
          updateDoc.scSanctionEntry.narrWbSteDte = availDte;
          updateDoc.scSanctionEntry.relatedLst = relatedLst;

          updateDoc.scSanctionEntry.entry.entryId = newEntry;
          updateDoc.scSanctionEntry.entry.rptStatusCount = oldEntry.scSanctionEntry.entry.rptStatusCount + 1;
          updateDoc.scSanctionEntry.entry.entryStatus =
            entryStatus[langAcronym];
          updateDoc.scSanctionEntry.entry.statusModifiedDte = statusModifiedDte;
          updateDoc.scSanctionEntry.entry.statusModifiedBy = entryStatusModifiedBy;
          updateDoc.scSanctionEntry.entry.entryType = entryType[langAcronym];
          updateDoc.scSanctionEntry.entry.language = [
            {
              additionalInformation: addtnalInf,
              identity: idArr,
              lang: langAcronym,
              narrativeUpdatedOn: narrWebsteUpdteDte,
              narrativeWebsiteDate: availDte,
              reasonForListing: lstngReason,
              relatedList: relatedLst,
            },
          ];

          updateDoc.scSanctionEntry.entry.listings.unListType[0].interpolUNSN = interpolNum;
          updateDoc.scSanctionEntry.entry.listings.unListType[0].listName =
            regimeObj[langAcronym][regimeKey];
          updateDoc.scSanctionEntry.entry.listings.unListType[0].measure = measures.map(
            (item) => item[langAcronym].measureNm
          );
          updateDoc.scSanctionEntry.entry.listings.unListType[0].narrativeSummary = narrativeSumm;
          updateDoc.scSanctionEntry.entry.listings.unListType[0].referenceNumber = refNum;
          updateDoc.scSanctionEntry.entry.listings.unListType[0].unlstItmsDef = {
            updates: { updated: pressRelease },
            measure: measures.map((item) => item[langAcronym].measureNm),
          };

          updateDoc.scSanctionEntry.entry.remarks = remarks;
          updateDoc.scSanctionEntry.entry.submission.identityMSconfidential =
            tmpRef.lstReq.mbmrStConfid;
          updateDoc.scSanctionEntry.entry.submission.submittedBy =
            tmpRef.lstReq.submittdBy;
          updateDoc.scSanctionEntry.entry.submission.submittedOn =
            tmpRef.lstReq.submittdOn;

          if (langAcronym === language) {
            updateDoc.scSanctionEntry.addtlInfo = addtnalInf;
            updateDoc.scSanctionEntry.entry.submission.statement =
              tmpRef.lstReq.lstngNotes;
            updateDoc.scSanctionEntry.entry.submission.statementConfidential = statmentConfid;
            updateDoc.scSanctionEntry.listngReason = lstngReason;

            updateDoc.scSanctionEntry.entry.listings.unListType[0].note = lstngNotes;
          }

          (updateDoc.scSanctionEntry as any).activityLog = [
            ...(updateDoc.scSanctionEntry as any).activityLog,
            newActivity,
          ];

          // if (updateDoc["scSanctionEntry.entry"].entryStatus == "SUBMIT4REVIEW")
          //   updateQry["scSanctionEntry.entry.entryStatus"] = "SUBMIT4REVIEW";
          // else if (updateDoc["scSanctionEntry.entry"].entryStatus == "PENDING")
          //   updateQry["scSanctionEntry.entry.entryStatus"] = "PENDING";

          sanctionsLstModel.updateOne(query, updateDoc, function (
            error,
            data
          ) {
            if (error) {
              console.log("fail", error.message);
            } else {
              console.log("success");
            }
          });
        }
      }

      if (tmpRef.status === "ACTIVE") {
        // await sendEmailFunc("Translator");
      }

      res.send({ success: true, data: "success" });
    }
  } catch (error) {
    console.log("error on updating entry: ", error.message);
    res.status(500).json({ message: error.message, error });
  }
};

export const markTranslation = function (req, res) {
  try {
    let langId = req.body.langId;
    let idNum = req.body.idNum;

    // mark translation as completed
    let updateDoc: {} = {
      $set: {
        "scSanctionEntry.translated": true,
      },
    };
    let updateQry = {
      "scSanctionEntry.entry.entryId": idNum,
      "scSanctionEntry.langs.lang": langId,
    };
    sanctionsLstModel.update(updateQry, updateDoc, function (err, data) {
      if (err) {
        res.send({ err });
      } else {
        // sendEmailFunc("Officer").then((sendRes) => {
          res.send({ data });
        // });
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message, error });
  }
};

export const reviewTranslation = function (req, res) {
  try {
    let langId = req.body.langId;
    let idNum = req.body.idNum;

    // mark translation as completed
    let updateDoc: {} = {
      $set: {
        "scSanctionEntry.translated": false,
      },
    };
    let updateQry = {
      "scSanctionEntry.entry.entryId": idNum,
      "scSanctionEntry.langs.lang": langId,
    };
    sanctionsLstModel.update(updateQry, updateDoc, function (err, data) {
      if (err) {
        res.send({ err });
      } else {
        // sendEmailFunc("Officer").then((sendRes) => {
        res.send({ data });
        // });
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message, error });
  }
};

export const getTranslationStatus = function (req, res) {
  try {
    let idNum = req.body.idNum;
    let fetchQuery = [
      {
        $match: {
          "scSanctionEntry.entry.entryId": idNum,
        },
      },
    ];

    sanctionsLstModel.aggregate(fetchQuery, function (err, data) {
      if (err) {
        res.send({ err: err });
      } else {
        const arr = data.map((item) => [
          item.scSanctionEntry.langs.lang,
          item.scSanctionEntry.translated,
        ]);
        const translated = arr.reduce(
          (a, item) => ({ ...a, [item[0]]: item[1] || false }),
          {}
        );
        res.send(translated);
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message, error });
  }
};

export const updatePressRelease = function (req, res) {
  try {
    let pressRelease = req.body.pressRelease;
    let entryId = req.body["entryId"];
    let refNum = req.body["refNum"];
    let idNum = null;

    if (refNum) idNum = refNum;
    else idNum = entryId + "";

    let presRelease1 = {
      entryId: entryId,
      pressRelease: pressRelease,
      updateType: req.body["updateType"],
      updatedOn: req.body["updatedOn"],
      pressReleaseId: "",
      refNumOrEntryId: idNum,
    };
    let updateDoc = {};

    if (refNum) {
      // there must have been no refNum before so newly created one is going into the document
      updateDoc = {
        $set: {
          "scSanctionEntry.entry.listings.unListType.0.referenceNumber": refNum,
        },
        $push: {
          "scSanctionEntry.entry.listings.unListType.0.updates.updated": presRelease1,
        },
      };
    } else {
      updateDoc = {
        $push: {
          "scSanctionEntry.entry.listings.unListType.0.updates.updated": presRelease1,
        },
      };
    }

    sanctionsLstModel.update(
      { "scSanctionEntry.entry.entryId": entryId },
      updateDoc,
      function (err, data) {
        if (err) {
          logg.error("the updtePressRelease Error is %o", err);
          res.send({ "Error while updating  Sanction": true, err: err });
        } else {
          sanctionsLstModel.find(
            { "scSanctionEntry.entry.entryId": entryId },
            function (err, resData) {
              // sendEmailFunc("Secretary");
              res.send({
                "noError updating  updtePressRelease": true,
                data: resData,
              });
            }
          );
        }
      }
    );
  } catch (error) {
    logg.info("updatePressRelease error: %s", error.message);
    res.status(500).json({ message: error.message, error });
  }
};

export const updateActivityLog = async function (req, res) {
  try {
    // also updates the State if necessary
    // need to handle errors in first or second update, should make this transactional
    // this is  a post request, so we need to pull the information from the request body
    let activityDate = new Date();
    let statementMetaDta = req.body.stateMetaDataRef;
    let pressRelease = req.body.pressRelease;
    let postRef = req.body.actvtyLg;
    let refNum = postRef.refNum;
    let activityNotes = "";
    let updteDoc = {};
    let entryId = req.body.actvtyLg.orderId;

    let lookup = (await getLookupAllList())[0];
    let entryStatusArr = JSON.parse(JSON.stringify(lookup.entryStatus));
    let curStatusObj = entryStatusArr.find(
      (item) => item["EN"] == "SUBMIT4REVIEW"
    );
    let nextStatusObj = entryStatusArr.find((item) => item["EN"] == postRef.nextState);

    function callback(err, data) {
      if (err) {
        throw err;
      } else {}
    }

    if (!refNum) {
      logg.info("Since refNum is null or undefined we get a new refNum ");
    }
    let activtyLg = new ActivityLog(
      activityDate,
      postRef.userEmail,
      postRef.userTask,
      postRef.prevState,
      postRef.nextState,
      postRef.activityNotes,
      postRef.refNum,
      postRef.orderId
    );

    if (postRef.nextState == "ONHOLD") {
      activityNotes = "Entry put on hold";
    } else if (postRef.nextState == "DELISTED") {
      activityNotes = "Entry de-listed on " + pressRelease.updatedOn;
    } else if (postRef.prevState == "ACTIVE" && postRef.nextState == "ACTIVE") {
      activityNotes = "Entry reviewed on " + pressRelease.updatedOn;
    } else if (postRef.nextState == "ACTIVE") {
      activityNotes = "Entry deleted on : " + postRef.activityNotes;
    }

    if (req.body.translate) {
      activityNotes = postRef.activityNotes;
    }

    updteDoc["activityDte"] = activtyLg.activityDate;
    updteDoc["userEmail"] = activtyLg.userEmail;
    updteDoc["userTask"] = activtyLg.userTask;
    updteDoc["activityNotes"] = activityNotes;
    updteDoc["prevState"] = activtyLg.prevState;
    updteDoc["currState"] = activtyLg.nextState;
    updteDoc["refNum"] = activtyLg.refNum;

    let objId = statementMetaDta["docUnderscoreId"];
    let siblingsArr = [
      {
        identifier: new ObjectID(objId),
        entryStatus: updteDoc["prevState"],
        entryStatusCreateDte: new Date(),
      },
    ];

    const qryDoc = {
      "scSanctionEntry.entry.entryId": entryId,
    };

    const results = await new Promise((resolve, reject) => {
      sanctionsLstModel.find(qryDoc, function (err, docs) {
        if (err) return resolve(false);
        else return resolve(docs);
      });
    });

    const logs = results ? results[0].scSanctionEntry.activityLog : [];
    if (Object.keys(updteDoc).length > 0) {
      logs.push(updteDoc);
    }

    let activityLog = [];
    if (logs != null && logs.length > 0) {
      for (let i = 0; i < logs.length; i++) {
        let loginDte = null,
          activityDate = null,
          userEmail = null,
          userTask = null,
          activityNotes = null,
          logoutDte = null,
          prevState = null,
          currState = null,
          refNum = null,
          orderId = null;
        loginDte = logs[i].loginDte;
        activityDate = logs[i].activityDte;
        userEmail = logs[i].userEmail;
        userTask = logs[i].userTask;
        activityNotes = logs[i].activityNotes;
        logoutDte = logs[i].logoutDte;
        prevState = logs[i].prevState;
        currState = logs[i].currState;
        refNum = logs[i].refNum;
        orderId = logs[i].orderId;
        let actvLg = new ActivityLog(
          activityDate,
          userEmail,
          userTask,
          prevState,
          currState,
          activityNotes,
          refNum,
          orderId
        );

        activityLog.push(actvLg);
      }
    }
    let reversActLog = activityLog.reverse();

    async.map(
      results,
      function (entry, callback) {
        let prevVersion = postRef.prevState != postRef.nextState ? [{
          status: entry.scSanctionEntry.entry.entryStatus,
          statusModifiedDte: entry.scSanctionEntry.entry.statusModifiedDte,
          rptStatusCount: entry.scSanctionEntry.entry.rptStatusCount
        }] : [];
        sanctionsLstModel.update(
          { _id: entry._id },
          {
            $push: {
              "scSanctionEntry.siblings": siblingsArr,
              "scSanctionEntry.entry.versionHistory": prevVersion
            },
            $set: {
              "scSanctionEntry.entry.entryStatus":
                nextStatusObj[entry.scSanctionEntry.langs.lang],
              "scSanctionEntry.activityLog": logs,
            },
          },
          function (err, data) {
            if (err) {
              console.log("the updateActivityLog Error: ", err.message);
            } else {
              console.log("noError on updateActivityLog");
            }
          }
        );
      },
      callback(null, results)
    );

    res.send({
      success: true,
      activityLog: reversActLog,
    });
  } catch (error) {
    console.log("updateActivityLg error: ", error.message);
    res.status(500).json({ message: error.message, error });
  }
};

//fixme (test)
export const sendEmail = async function (req, res) {
  try {
    const role = "Officer";
    const usersArr = await NotiReceiverModel.find({
      roles: role,
    });
    if (usersArr.length > 0) {
      const usersEmailArr = usersArr.map((item) => item.userEmail);

      const notiEmail = await NotiEmailModel.findOne({
        emailType: role,
      });

      await sendBulkEmail({
        to: usersEmailArr,
        title: notiEmail.emailTitle || "",
        content: notiEmail.emailDescription || "",
      });

      let newHistory = new NotiHistoryModel({
        subject: notiEmail.emailTitle || "",
        content: notiEmail.emailDescription || "",
        recipient: usersEmailArr,
        sent: false,
      });
      await newHistory.save();
      res.send({
        success: true,
        usersArr,
        usersEmailArr,
        notiEmail,
      });
    } else {
      res.send({
        error: "Not exist",
      });
    }
  } catch (error) {}
};

export const getRawJSONs = function (req, res) {
  try {
    let paramArr = req.body;
    let nativeMongConn = mongoose.connection.db.collection(
      process.env.SANCTIONS_COLL
    );

    let query = { "scSanctionEntry.entry.entryId": { $in: paramArr } };
    nativeMongConn.find(query).toArray(function (err, results) {
      if (err) {
        throw err;
      } else if (!results) {
        logg.info("No incomplete downloads!");
        res.end();
      } else {
        let count = 0;

        async.each(
          results,
          function (doc, cb) {
            // we want to try to zip the files up
            logg.info(
              "now time to gather the results %s",
              doc["scSanctionEntry"]["entry"].entryId
            );
            // try to extract teh id number  out of the file to use for the name
            /*fs.createReadStream(file)
           .pipe(zlib.createGzip())
           .pipe(fs.createWriteStream(file + '.gz'));
           */
            // writeStrema =  fs.createWriteStream( doc['scSanctionEntry']['entry'].entryId + "_" +  count +  '.gz');
            count++;
            // writeStrema.pipe(zlib.createGzip());
            // need to chunk this data, in the event that it is too big
            // docStr += JSON.stringify(doc);

            // writeStrema.write(docStr);
            // writeStrema.end(function () { logg.info('we are done'); });
            cb(null);
            // .pipe(zlib.createGzip());
          },
          function (err) {
            console.log(err.message);
          }
        );
      }

      res.send(results);
    });
  } catch (error) {
    res.status(500).json({ message: error.message, error });
  }
};

export const updateWorkflowState = function (req, res) {};

export const saveWithoutStateChg = function (req, res) {};

// for creating entry
export const insertInitialSanction = async function (req, res) {
  try {
    let tmpRef = JSON.parse(req.body.entryData);
    let filesArr = req.files;
    let versionId = tmpRef.versionId || "0.0";
    let workingMainLanguage = tmpRef.sanctionMetaData.workingMainLanguage;
    let userEmail = tmpRef.sanctionMetaData.userEmail;
    let entryStatusModifiedBy = "";
    let statusModifiedDte = new Date();

    let language = tmpRef.lstReq.language;
    let result = (await getLookupAllList())[0];

    let entryTypeArr = JSON.parse(JSON.stringify(result.entryType));
    let entryType = entryTypeArr.find(
      (item) => item[language]['entryTypeName'] == tmpRef.lstReq.recordTyp
    );

    let entryStatusArr = JSON.parse(JSON.stringify(result.entryStatus));
    let entryStatus = entryStatusArr.find(
      (item) => item[language] == tmpRef.status
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
    let languageObj = langArr.map((item) => item.acronym);

    let applicableMeasures = JSON.parse(JSON.stringify(result.measures));
    let measures = tmpRef.applicableMeasures.map((measure) => {
      return applicableMeasures.find(
        (item) => item[language].measureNm === measure
      );
    });

    let interpolNum = tmpRef.lstReq.interpolNum;
    let refNum = tmpRef.lstReq.refNum;
    let mbmrStConfid = tmpRef.lstReq.mbmrStConfid;
    let statmentConf = tmpRef.lstReq.stmntConfid;
    let availDte = tmpRef.availDte;
    let narrativeSumm = tmpRef.narrativeSumm;
    let lstngReason = tmpRef.lstngReason;
    let relatedLst = tmpRef.relatdLst;
    let pressRelease = tmpRef.lstReq.presRelesee;
    let narrWebsteUpdteDte = tmpRef.narrWebsteUpdteDte;
    let remarks = tmpRef.lstReq.entryRemarks;
    let idArr = [];
    let idArrOtherLangs = [];
    let idArrs = tmpRef.idArr;
    let persistentAttchmntsArr = [];

    function getAttchLocationInFilesArr(searchStr) {
      let result = filesArr.findIndex((obj) => obj.originalname == searchStr);
      return result;
    }

    function createArrayOfAttchmentsForDB(objIdStr, fileRef) {
      let fileAttchmnt = fileRef;
      if (fileAttchmnt != null) {
        let filenam = fileAttchmnt.originalname.substr(
          fileAttchmnt.originalname.lastIndexOf("_") + 1
        );
        let attchmnt = {
          _id: new ObjectID(objIdStr),
          attchmntName: filenam,
          contentType: fileAttchmnt.mimetype,
          size: fileAttchmnt.size,
          attchmnt: new Buffer(fileAttchmnt.buffer, "base64"),
        };
        persistentAttchmntsArr.push(attchmnt);
      }
    }

    function setMongooseObjectId(biometricInf) {
      return biometricInf.bioMAttch.map((fileInfo, attachmnIndex) => {
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
        let filesIndex = getAttchLocationInFilesArr(searchStr);
        if (filesIndex != -1) {
          createArrayOfAttchmentsForDB(
            fileInfo.fileId,
            req.files[filesIndex]
          );
        }
      });
    }

    // put two identities in an array.  The first will go iwth the first sanction for the Chosen main language.
    // While the second id, will go with the rest of the other sanctions for the remainging languages
    for (var i = 0; i < idArrs.length; i++) {
      let addresses = tmpRef.idArr[i].address;
      let biometricInfs = tmpRef.idArr[i].biometricInf;
      let dobs = tmpRef.idArr[i].dobs;
      let docs = tmpRef.idArr[i].docs;
      let features = tmpRef.idArr[i].features;
      let genderStatus = tmpRef.idArr[i].genderStatus;
      let gender = genderStatus.gender;
      let livingStatus = genderStatus.livngStat;
      let names = tmpRef.idArr[i].names;
      let nameOrgSpt = tmpRef.idArr[i].nameOrgSpt;
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

      let biometricInfArr = biometricInfs.map(function (biometricInf) {
        if (biometricInf.bioMAttch) {
          // only necessary when there is an attachment
          let resultArr = setMongooseObjectId(biometricInf);
          let bioMAttchconsolidated = biometricInf.bioMAttch;
          // if (biometricInf.bioMPrevAttchs) {
          //   bioMAttchconsolidated = biometricInf.bioMAttch.concat(
          //     biometricInf.bioMPrevAttchs
          //   );
          // }

          return {
            biometricType: biometricInf.bioMType,
            value: biometricInf.bioMVal,
            note: biometricInf.bioMNote,
            biometricAttch: bioMAttchconsolidated,
            tabId: identity_id, // for deleting ease
            allBiometricIdForTab: new mongoose.Types.ObjectId(),
          };
        } else {
          let bioMAttchconsolidated = biometricInf.bioMPrevAttchs;
          return {
            biometricType: biometricInf.bioMType,
            value: biometricInf.bioMVal,
            note: biometricInf.bioMNote,
            biometricAttch: bioMAttchconsolidated,
            tabId: identity_id, // for deleting ease
            allBiometricIdForTab: new mongoose.Types.ObjectId(),
          };
        }
      });

      let biometricInfArrOtherLangs = biometricInfArr.map(
        (bioMetricOtherLang) => {
          const {
            biometricType,
            value,
            biometricAttch,
            tabId,
            allBiometricIdForTab,
          } = bioMetricOtherLang;
          let result = {
            biometricType: biometricType,
            value: value,
            note: "",
            tabId: tabId,
            allBiometricIdForTab: allBiometricIdForTab,
          };
          return result;
        }
      );

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
      let identityData = new IdModel({
        _id: identity_id,
        addresses: { address: adddressesArr },
        biometricData: { biometricInfo: { biometric: biometricInfArr } },
        category: category,
        comment: idComment,
        designations: { designation: idDesig },
        dobs: { dob: dobsArr },
        documents: { document: docsArr },
        entryFeatures: { feature: featuresArr, note: featNotes },
        gender: gender,
        livingStatus: livingStatus,
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

      idArr.push(identityData);
      idArrOtherLangs.push(identityyOtherLangs);
    }
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
              entryType: entryType[langAcronym]['entryTypeName'],
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

        function callback(err, data) {
          if (err) {
            throw err;
          } else {
            res.send({ success: true, data });
          }
        }
      // });
    });
  } catch (error) {
    logg.info(error.message);
    res.status(500).json({ message: error.message, error });
  }
};

// action to publish does call this function
export const insertSanction = async function (req, res) {
  try {
    let tmpRef = JSON.parse(req.body.entryData);
    let versionId = "0.0";
    let workingMainLanguage = tmpRef.workingMainLanguage;
    let userEmail = tmpRef.userEmail;
    let entryStatusModifiedBy = "";
    let statusModifiedDte = new Date();
    let filesArr = req.files;
    let language = tmpRef.lstReq.language;
    let recType = tmpRef.lstReq.recordTyp;
    let status = tmpRef.lstReq.status;
    let interpolNum = tmpRef.lstReq.interpolNum;
    let regime = tmpRef.regime;
    let refNum = tmpRef.lstReq.refNum;
    let mbmrStConfid = tmpRef.lstReq.mbmrStConfid;
    let statmentConf = tmpRef.lstReq.statementConfid;
    let lstngNotes = tmpRef.lstReq.lstngNotes;
    let addtnalInf = tmpRef.addtlInfo;
    let availDte = tmpRef.availDte;
    let narrativeSumm = tmpRef.narrativeSumm;
    let lstngReason = tmpRef.lstngReason;
    let relatedLst = tmpRef.relatdLst;
    let pressRelease = tmpRef.updatedArr[0];

    let applicableMeasures = tmpRef.measureArr;
    let narrWebsteUpdteDte = tmpRef.narrWebsteUpdteDte;
    let remarks = tmpRef.lstReq.lstRmrks;
    let siblingsArr = tmpRef.siblingsArr;
    let prevStatus = null;
    if (siblingsArr && siblingsArr.length > 0)
      prevStatus = siblingsArr[siblingsArr.length - 1]["entryStatus"];
    let ancestorsArr = tmpRef.ancestorsArr;
    let amendmentInfo = tmpRef.amendmentInfo;
    let parents = tmpRef.parent;
    let persistentAttchmntsArr = [];

    let result = (await getLookupAllList())[0];

    let entryTypeArr = JSON.parse(JSON.stringify(result.entryType));
    let entryTypeObj = entryTypeArr.find(
      (item) => item[language]['entryTypeName'] == tmpRef.lstReq.recordTyp
    );

    let entryStatusArr = JSON.parse(JSON.stringify(result.entryStatus));
    let nextStatusObj = entryStatusArr.find(
      (item) => item[language] == tmpRef.status
    );

    function getAttchLocationInFilesArr(searchStr) {
      let result = filesArr.findIndex((obj) => obj.originalname == searchStr);
      return result;
    }

    function createArrayOfAttchmentsForDB(objIdStr, fileRef) {
      let fileAttchmnt = fileRef;
      if (fileAttchmnt != null) {
        let filenam = fileAttchmnt.originalname.substr(
          fileAttchmnt.originalname.lastIndexOf("_") + 1
        );
        let attchmnt = {
          _id: new ObjectID(objIdStr),
          attchmntName: filenam,
          contentType: fileAttchmnt.mimetype,
          size: fileAttchmnt.size,
          attchmnt: new Buffer(fileAttchmnt.buffer, "base64"),
        };
        persistentAttchmntsArr.push(attchmnt);
      }
    }

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
          let filesIndex = getAttchLocationInFilesArr(searchStr);
          if (filesIndex != -1) {
            createArrayOfAttchmentsForDB(
              fileInfo.fileId,
              req.files[filesIndex]
            );
          }
        }
      });
    }

    let idArr = [];
    let idArrs = tmpRef.idArr;
    // need to loop for multiple identities
    for (var i = 0; i < idArrs.length; i++) {
      let addresses = tmpRef.idArr[i].address;
      let biometricInfs = tmpRef.idArr[i].biometricInf;
      let dobs = tmpRef.idArr[i].dobs;
      let docs = tmpRef.idArr[i].docs;
      let features = tmpRef.idArr[i].features;
      let genderStatus = tmpRef.idArr[i].genderStatus;
      let livingStatus = tmpRef.idArr[i].livingStatus;
      let names = tmpRef.idArr[i].names;
      // let nameOrgSpt =tmpRef.idArr[i].names.nameOrgSpt;
      let nameOrgSpt = tmpRef.idArr[i].nameOrgSpt;
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
      let nameZ = setNames(names.names, names.nameOrgSpt);
      let pobs = tmpRef.idArr[i].pobs;
      // use a map function for the above
      // nationality
      let identity = tmpRef.idArr[i].idType;
      let category = tmpRef.idArr[i].category;
      let idTitle = tmpRef.idArr[i].idTitle.title.join();
      let idDesig = tmpRef.idArr[i].idDesig.designation;
      let idComment = tmpRef.idArr[i].comment;
      let addrAr = [];
      let nationaltty = tmpRef.idArr[i].nationaltty.nationality;

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

      let biometricInfArr = biometricInfs.map(function (biometricInf) {
        if (biometricInf.bioMAttch) {
          // only necessary when there is an attachment
          let resultArr = setMongooseObjectId(biometricInf);
          let bioMAttchconsolidated = biometricInf.bioMAttch;
          if (biometricInf.bioMPrevAttchs) {
            bioMAttchconsolidated = biometricInf.bioMAttch.concat(
              biometricInf.bioMPrevAttchs
            );
          }
          return {
            biometricType: biometricInf.bioMType,
            value: biometricInf.bioMVal,
            note: biometricInf.bioMNote,
            biometricAttch: bioMAttchconsolidated,
            tabId: identity_id, // for deleting ease
            allBiometricIdForTab: new mongoose.Types.ObjectId(),
          };
        } else {
          let bioMAttchconsolidated = biometricInf.bioMPrevAttchs;
          return {
            biometricType: biometricInf.bioMType,
            value: biometricInf.bioMVal,
            note: biometricInf.bioMNote,
            biometricAttch: bioMAttchconsolidated,
            tabId: identity_id, // for deleting ease
            allBiometricIdForTab: new mongoose.Types.ObjectId(),
          };
        }
      });
      // [{"biometric":{"biometricType":"Height","value":"5"},"biometricAttch":{"href":"","value":""},"note":"bioinoes"}]
      // let biometricInfDb = new BioModel( {    "biometricInfo" : biometricInfArr});

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
      let identityy = new IdModel({
        addresses: { address: adddressesArr },
        biometricData: { biometricInfo: { biometric: biometricInfArr } },
        category: category,
        comment: idComment,
        designations: { designation: idDesig },
        dobs: { dob: dobsArr },
        documents: { document: docsArr },
        entryFeatures: { feature: featuresArr, note: featNotes },
        gender: genderStatus,
        livingStatus: livingStatus,
        names: { name: nameZ["names"], nameOrgSpt: nameZ["nameOrgSpt"] },
        nationalities: { nationality: nationaltty },
        pobs: { pob: pobsArr },
        titles: { title: idTitle },
        type: identity,
      });
      idArr.push(identityy);
    }

    let entryId = parseInt(tmpRef.entryId);
    let amendmentId = tmpRef.amendmentId;
    let activityNotes =
      tmpRef.status == "ACTIVE"
        ? "Entry listed on " + tmpRef.updatedArr[0].updatedOn
        : "";

    let activityUpdateDoc = {
      activityDte: new Date(),
      userEmail: tmpRef.userEmail,
      prevState: tmpRef.lstReq.status,
      currState: tmpRef.status,
      refNum: tmpRef.refNum,
      activityNotes: activityNotes,
    };

    // update current status
    try {
      if (amendmentId && nextStatusObj['EN'] == 'ACTIVE') {
        await updateOriginalEntry();
      }
      await updateCurrentStatusFlag();
      // await sendEmailFunc('Secretary');
    } catch (error) {
      error.message;
    }

    function callback(err, data) {
      if (err) {
        throw err;
      }
    }

    // get SubmitForReview documents for the other languages besides inEffectLanguage, then update them to ACTIVE state
    async function updateStateForRemainingLangs() {
      let otherLangArr = ["FR", "AR", "RU", "SP", "CH"];
      let qryDoc = {
        "scSanctionEntry.entry.entryId": entryId,
        "scSanctionEntry.entry.entryStatus": prevStatus,
        "scSanctionEntry.langs.lang": { $in: otherLangArr },
      };
      sanctionsLstModel.find(qryDoc, function (err, docs) {
        if (err) {
          console.log(err.message);
        } else {
          // now get the result set and walk through its array, removing the _id and adjusting the metadata
          let resArr = docs.map((tmpData) => {
            let old_id = tmpData._id;
            // tmpData.remove('_id');
            tmpData.scSanctionEntry.entry.entryStatus = "ACTIVE";
            // set sibling
            let sibling = {
              _id: new ObjectID(),
              identifier: new ObjectID(old_id),
              entryId: tmpData.scSanctionEntry.entry.entryId,
              entryStatus: "SUBMIT4REVIEW",
              entryStatusCreateDte: new Date(),
            };
            tmpData.scSanctionEntry.siblings.push(sibling);
            return tmpData;
          });

          async.map(
            resArr,
            function (sanc1) {
              sanc1.scSanctionEntry.entry.listings.unListType[0].referenceNumber = refNum;
              let tmpDocc = JSON.parse(JSON.stringify(sanc1));
              delete tmpDocc._id;
              let sancNew = new sanctionsLstModel(tmpDocc);
              return sancNew.save();
            },
            callback(err, docs)
          );
        }
      });
    }

    // here set the isStatusCurrent flag of the predecessor entry to false, while making the successor entry's isStatusCurrent flag have the value of true
    async function updateCurrentStatusFlag() {
      // const session = await mongoose.startSession();
      // session.startTransaction();

      try {
        const qryDoc = {
          "scSanctionEntry.entry.entryId": entryId,
        };
        const results = await new Promise((resolve, reject) => {
          sanctionsLstModel.find(qryDoc, function (err, docs) {
            if (err) return resolve(false);
            else return resolve(docs);
          });
        });

        let logs = results ? results[0].scSanctionEntry.activityLog : [];
        if (Object.keys(activityUpdateDoc).length > 0) {
          logs.push(activityUpdateDoc);
        }

        let options = { upsert: false };
        let updateRes = "";
        await asyncForEach(results, async (entry, index) => {
          const curLang = entry.scSanctionEntry.langs.lang;
          entry.scSanctionEntry.entry.versionHistory.push({
            status: entry.scSanctionEntry.entry.entryStatus,
            statusModifiedDte: entry.scSanctionEntry.entry.statusModifiedDte,
            rptStatusCount: entry.scSanctionEntry.entry.rptStatusCount
          })
          entry.scSanctionEntry.activityLog = logs;
          entry.scSanctionEntry.entry.entryStatus = nextStatusObj[curLang];
          entry.scSanctionEntry.entry.entryType = entryTypeObj[curLang];
          entry.scSanctionEntry.entry.statusModifiedDte = statusModifiedDte;
          entry.scSanctionEntry.entry.statusModifiedBy = entryStatusModifiedBy;
          entry.scSanctionEntry.entry.language[0].identity = idArr;
          entry.scSanctionEntry.langs.idLst = idArr;
          entry.scSanctionEntry.entry.listings.unListType[0].referenceNumber = refNum;
          entry.scSanctionEntry.entry.listings.unListType[0].unlstItmsDef.updates.updated = pressRelease;

          updateRes = await sanctionsLstModel.findOneAndUpdate(
            { _id: entry._id },
            entry,
            options
          );
        });

        await updateStateForRemainingLangs();
        // await session.commitTransaction();
        // session.endSession();
        res.send(updateRes);
      } catch (error) {
        logg.error("transaction error: ", error.message);
        // await session.abortTransaction();
        // session.endSession();
        throw error;
      }
    }

    async function updateOriginalEntry() {
      const statusValues = Object.values(nextStatusObj);
      for (const status of statusValues) {
        const parentRef = refNum.substr(0, refNum.lastIndexOf('.'));

        await sanctionsLstModel.findOneAndUpdate(
          {
            "scSanctionEntry.entry.entryStatus": status,
            "scSanctionEntry.entry.listings.unListType.referenceNumber": parentRef,
            "scSanctionEntry.supersededInfo": { $exists: false },
          },
          {
            $set: {
              "scSanctionEntry.supersededInfo": {
                isSuperSeded: true,
                supersededDte: new Date(),
              }
            }
          }
        );
      }
    }
  } catch (error) {
    console.log("insertSanction error: ", error.message);
    res.status(500).json({ message: error.message, error });
  }
};

export const supersedeSiblings = async function(req, res) {
  try {
    const { refNum } = req.body;
    let rootRefNum = refNum;
    if ((refNum.match(/./g) || []).length > 1) {
      const arr = refNum.split('.');
      rootRefNum = `${arr[0]}.${arr[1]}`;
    }
    const lookup = (await getLookupAllList())[0];
    const entryStatusArr = JSON.parse(JSON.stringify(lookup.entryStatus));
    const status_0 = Object.values(entryStatusArr.find((item) => item["EN"] == "PENDING"));
    const status_1 = Object.values(entryStatusArr.find((item) => item["EN"] == "SUBMIT4REVIEW"));
    const status_2 = Object.values(entryStatusArr.find((item) => item["EN"] == "ONHOLD"));

    for (const status of ["PENDING", "SUBMIT4REVIEW", "ONHOLD"]) {
      const statusObj = entryStatusArr.find((item) => item["EN"] == status);
      for (const statusKey of Object.keys(statusObj)) {
        await sanctionsLstModel.updateOne(
          {
            "scSanctionEntry.entry.entryStatus": statusObj[statusKey],
            "scSanctionEntry.entry.listings.unListType.referenceNumber": { $regex: `${rootRefNum}..*` },
            "scSanctionEntry.supersededInfo": { $exists: false },
          },
          {
            $set: {
              "scSanctionEntry.entry.entryStatus": statusObj[statusKey],
              "scSanctionEntry.supersededInfo": {
                isSuperSeded: true,
                supersededDte: new Date(),
              }
            }
          },
        );
      }
    }

    // try to update all of them at once, but failed
    // const updateData = await sanctionsLstModel.updateMany(
    //   {
    //     "scSanctionEntry.entry.entryStatus": { $in: [...status_0, ...status_1, ...status_2] },
    //     "scSanctionEntry.entry.listings.unListType.referenceNumber": { $regex: `${rootRefNum}..*` },
    //     "scSanctionEntry.supersededInfo": { $exists: false },
    //   },
    //   {
    //     $set: {
    //       "scSanctionEntry.entry.entryStatus": "$scSanctionEntry.workingMainLanguage",
    //       "scSanctionEntry.supersededInfo": {
    //         isSuperSeded: true,
    //         supersededDte: new Date(),
    //       }
    //     }
    //   },
    //   { multi: true },
    // );

    res.status(200).json({ success: true, message: "Records updated successfully" });
  } catch(error) {
    res.status(200).json({ success: false, message: error.message });
  }
};

export const getAllVersions = function (req, res) {
  try {
    const ids = req.params["entryId"];
    const refNum = req.params["refNumb"];
    const parentRefNum = refNum.substr(0, refNum.lastIndexOf('.')) || 'undefined!';
    let rootRefNum = refNum;
    let versionID = "";

    // QDi.150.1... - this entry is an amendment, we need to get root reference number
    if ((refNum.match(/./g) || []).length > 1) {
      const arr = refNum.split('.');
      rootRefNum = `${arr[0]}.${arr[1]}`;
    }

    let entryId = parseInt(ids);
    let qryAllVersionsArr = [];

    qryAllVersionsArr.push({
      "scSanctionEntry.entry.entryId": entryId,
      "scSanctionEntry.langs.lang": "EN",
    });

    if (refNum) {
      // only include the refNum if the value exists, or is undefined, or is not Null
      let qryAllVersionsObj = {
        "scSanctionEntry.entry.listings.unListType.referenceNumber": refNum,
        "scSanctionEntry.langs.lang": "EN",
      };
      qryAllVersionsArr.push(qryAllVersionsObj);
    }

    let matchRef = { $or: qryAllVersionsArr };
    let overallQryDoc = [
      {
        $facet: {
          allVersions: [
            { $match: matchRef },
            { $sort: { "scSanctionEntry.entry.statusModifiedDte": -1 } },
            {
              $project: {
                "scSanctionEntry.entry.statusModifiedDte": 1,
                "scSanctionEntry.entry.entryStatus": 1,
                "scSanctionEntry.entry.rptStatusCount": 1,
                "scSanctionEntry.entry.rptStatusDates": 1,
                "scSanctionEntry.entry.entryId": 1,
                "scSanctionEntry.entry.isStatusCurrent": 1,
                "scSanctionEntry.entry.versionHistory": 1,
                "scSanctionEntry.entry.listings.unListType.referenceNumber": 1,
                "scSanctionEntry.amendmentCount": 1,
                "scSanctionEntry.amendmentDte": 1,
                "scSanctionEntry.langs.lang": 1,
                "scSanctionEntry.langs.idLst.names.name": 1,
                "scSanctionEntry.amendmentId": 1,
                "scSanctionEntry.versionId": 1,
              },
            },
          ],
          onGoingAmendment: [
            {
              $match: {
                "scSanctionEntry.langs.lang": "EN",
                "scSanctionEntry.amendmentId": { $exists: true },
                "scSanctionEntry.supersededInfo": { $exists: false },
                "scSanctionEntry.entry.entryStatus": { $ne: "ACTIVE" },
                "scSanctionEntry.entry.listings.unListType.referenceNumber": { $regex: `${rootRefNum}..*` },
                "scSanctionEntry.entry.isStatusCurrent": {
                  $exists: false,
                },
              },
            },
            { $sort: { "scSanctionEntry.entry.statusModifiedDte": -1 } },
            {
              $project: {
                "scSanctionEntry.entry.statusModifiedDte": 1,
                "scSanctionEntry.entry.entryStatus": 1,
                "scSanctionEntry.entry.rptStatusCount": 1,
                "scSanctionEntry.entry.rptStatusDates": 1,
                "scSanctionEntry.amendmentInfo.amendmentCount": 1,
                "scSanctionEntry.amendmentInfo.amendmentDte": 1,
                "scSanctionEntry.entry.listings.unListType.referenceNumber": 1,
                "scSanctionEntry.entry.entryId": 1,
                "scSanctionEntry.langs.idLst.names.name": 1,
                "scSanctionEntry.langs.lang": 1,
                "scSanctionEntry.amendmentId": 1,
                "scSanctionEntry.versionId": 1,
              },
            },
          ],
          supersededInf: [
            // a superseded entry will still have an " 'scSanctionEntry.entry.entryStatus:'ACTIVE' " status,
            // but will have a superseded entry and will be the parent of another ACTIVE record
            {
              $match: {
                "scSanctionEntry.langs.lang": "EN",
                "scSanctionEntry.entry.listings.unListType.referenceNumber": { $regex: `${rootRefNum}.*` },
                "scSanctionEntry.supersededInfo": { $exists: true },
                "scSanctionEntry.supersededInfo.isSuperSeded": true,
              },
            },
            { $sort: { "scSanctionEntry.entry.statusModifiedDte": -1 } },
            {
              $project: {
                "scSanctionEntry.entry.statusModifiedDte": 1,
                "scSanctionEntry.entry.entryStatus": 1,
                "scSanctionEntry.entry.listings.unListType.referenceNumber": 1,
                "scSanctionEntry.entry.entryId": 1,
                "scSanctionEntry.langs.idLst.names.name": 1,
                "scSanctionEntry.amendmentId": 1,
                "scSanctionEntry.versionId": 1,
              },
            },
          ],
          activeInf: [
            // an ACTIVE entry will still have an 'scSanctionEntry.entry.entryStatus:'ACTIVE' " status,
            // but will NOT have a superseded entry or its value would be false
            {
              $match: {
                "scSanctionEntry.langs.lang": "EN",
                "scSanctionEntry.entry.listings.unListType.referenceNumber": { $regex: `${parentRefNum}.*` },
                "scSanctionEntry.supersededInfo": { $exists: false },
                "scSanctionEntry.entry.entryStatus": "ACTIVE",
              },
            },
            { $sort: { "scSanctionEntry.entry.statusModifiedDte": -1 } },
            {
              $project: {
                "scSanctionEntry.entry.statusModifiedDte": 1,
                "scSanctionEntry.entry.rptStatusCount": 1,
                "scSanctionEntry.entry.entryStatus": 1,
                "scSanctionEntry.entry.listings.unListType.referenceNumber": 1,
                "scSanctionEntry.entry.entryId": 1,
                "scSanctionEntry.langs": 1,
                "scSanctionEntry.amendmentId": 1,
                "scSanctionEntry.versionId": 1,
              },
            },
          ],
        },
      },
    ];

    sanctionsLstModel.aggregate(overallQryDoc, function (err, docs) {
      if (err) {
        console.log(err.message);
      } else {
        let versTmpArr = docs[0]["allVersions"];
        let ongoingAmendArr = docs[0]["onGoingAmendment"];
        let superSededArr = docs[0]["supersededInf"];
        let activeArr = docs[0]["activeInf"];

        let verHist = [];
        let currentVersion = [];
        versTmpArr.forEach((sancEntry) => {
          versionID = sancEntry.scSanctionEntry.versionId;
          let result =
            "0" +
            "." +
            sancEntry.scSanctionEntry.entry.entryStatus +
            "." +
            sancEntry.scSanctionEntry.entry.rptStatusCount +
            versionID;
          let status = sancEntry.scSanctionEntry.entry.entryStatus;
          let amendmentID = "";
          if (sancEntry.scSanctionEntry.amendmentId) {
            amendmentID = sancEntry.scSanctionEntry.amendmentId;
          }

          if (sancEntry.scSanctionEntry.entry.versionHistory && sancEntry.scSanctionEntry.entry.versionHistory.length > 0) {
            sancEntry.scSanctionEntry.entry.versionHistory.forEach(history => {
              verHist.push({
                version: "0" + "." + history.status + "." + history.rptStatusCount + versionID,
                status: history.status,
                modifiedDte: history.statusModifiedDte,
                entryId: entryId,
                amendmentId: amendmentID,
                isStatusCurrent:
                sancEntry.scSanctionEntry.entry.isStatusCurrent,
                lang: sancEntry.scSanctionEntry.langs.lang,
              })
            })
          }

          verHist.push({
            version: result,
            status: status,
            modifiedDte:
            sancEntry.scSanctionEntry.entry.statusModifiedDte,
            entryId: entryId,
            amendmentId: amendmentID,
            isStatusCurrent:
            sancEntry.scSanctionEntry.entry.isStatusCurrent,
            lang: sancEntry.scSanctionEntry.langs.lang,
          });
          if (sancEntry.scSanctionEntry.langs.lang === "EN") {
            currentVersion.push({
              version: result,
              status: status,
              modifiedDte: sancEntry.scSanctionEntry.entry.statusModifiedDte,
              entryId: entryId,
              amendmentId: amendmentID,
              lang: sancEntry.scSanctionEntry.langs.lang,
              refNum: sancEntry.scSanctionEntry.entry.listings.unListType[0].referenceNumber,
              name: sancEntry.scSanctionEntry.langs.idLst[0].names.name[0].value,
            });
          }
        });

        // should return the amendment count and use it for the first digit ???
        let ongoingAmendments = ongoingAmendArr.map((sancEntry) => {
          versionID = sancEntry.scSanctionEntry.versionId;
          let amendmmentCt = 0;
          if (
            sancEntry.scSanctionEntry.amendmentInfo &&
            sancEntry.scSanctionEntry.amendmentInfo.amendmentCount
          ) {
            amendmmentCt = sancEntry.scSanctionEntry.amendmentInfo.amendmentCount;
          }
          let result =
            amendmmentCt +
            "." +
            sancEntry.scSanctionEntry.entry.entryStatus +
            "." +
            sancEntry.scSanctionEntry.entry.rptStatusCount +
            versionID;
          let status = sancEntry.scSanctionEntry.entry.entryStatus;
          let amendmentID = null;
          if (sancEntry.scSanctionEntry.amendmentId) {
            amendmentID = sancEntry.scSanctionEntry.amendmentId;
          }

          return {
            version: result,
            status: status,
            modifiedDte:
              sancEntry.scSanctionEntry.entry.statusModifiedDte,
            entryId: sancEntry.scSanctionEntry.entry.entryId,
            amendmentId: amendmentID,
            refNum:
              sancEntry.scSanctionEntry.entry.listings.unListType[0]
                .referenceNumber,
            lang: sancEntry.scSanctionEntry.langs.lang,
            name:
              sancEntry.scSanctionEntry.langs.idLst[0].names.name[0]
          };
        });

        let superseded = superSededArr.map((sancEntry) => {
          versionID = sancEntry.scSanctionEntry.versionId;
          const rptCnt = sancEntry.scSanctionEntry.entry.rptStatusCount || 0;
          let result =
            "SS" +
            "." +
            sancEntry.scSanctionEntry.entry.entryStatus +
            "." +
            rptCnt +
            versionID;
          let status = sancEntry.scSanctionEntry.entry.entryStatus;
          let amendmentID = null;
          if (sancEntry.scSanctionEntry.amendmentId) {
            amendmentID = sancEntry.scSanctionEntry.amendmentId;
          }
          return {
            version: result,
            status: status,
            modifiedDte:
              sancEntry.scSanctionEntry.entry.statusModifiedDte,
            entryId: sancEntry.scSanctionEntry.entry.entryId,
            refNum:
              sancEntry.scSanctionEntry.entry.listings.unListType[0]
                .referenceNumber,
            lang: sancEntry.scSanctionEntry.langs.lang,
            name:
              sancEntry.scSanctionEntry.langs.idLst[0].names.name[0],
            amendmentId: amendmentID
          };
        });

        let active = activeArr.map((sancEntry) => {
          versionID = sancEntry.scSanctionEntry.versionId;
          let result =
            sancEntry.scSanctionEntry.entry.entryStatus +
            "." +
            sancEntry.scSanctionEntry.entry.rptStatusCount +
            versionID;
          let status = sancEntry.scSanctionEntry.entry.entryStatus;
          let amendmentID = null;
          if (sancEntry.scSanctionEntry.amendmentId) {
            amendmentID = sancEntry.scSanctionEntry.amendmentId;
          }
          return {
            version: result,
            status: status,
            modifiedDte:
              sancEntry.scSanctionEntry.entry.statusModifiedDte,
            entryId: sancEntry.scSanctionEntry.entry.entryId,
            refNum:
              sancEntry.scSanctionEntry.entry.listings.unListType[0]
                .referenceNumber,
            name:
              sancEntry.scSanctionEntry.langs.idLst[0].names.name[0]
                .value,
            lang: sancEntry.scSanctionEntry.langs.lang,
            amendmentId: amendmentID
          };
        });

        let result = {};
        result["verHist"] = verHist;
        result["ongoingAmendments"] = ongoingAmendments;
        result["superseded"] = superseded;
        result["active"] = active;
        result["currentVersion"] = currentVersion;
        res.send(result);
      }
    });
  } catch (error) {
    console.log("getAllVersions error: ", error.message);
    res.status(500).json({ message: error.message, error });
  }
};

export const findByRefNum = function (req, res) {
  try {
    let recordCount = 10;
    let lang = "EN";
    // let results = [{"name":"aaa", "RefNum":"1234"}, {"name":"bbb", "RefNum":"1234444"},{"name":"ccc", "RefNum":"999"}];
    let searchStr = req.params.refNum;
    let qryDoc = {
      "scSanctionEntry.entry.listings.unListType.referenceNumber": new RegExp(
        "^" + searchStr,
        "i"
      ),
      "scSanctionEntry.entry.entryStatus": "ACTIVE",
      "scSanctionEntry.langs.lang": lang,
      "scSanctionEntry.supersededInfo": { $exists: false },
    };

    let optionLenDoc = { limit: recordCount };
    sanctionsLstModel.find(qryDoc, null, optionLenDoc, function (err, docs) {
      if (err) {
        console.log(err.message);
      } else {
        let results = docs.map((tmpDoc) => {
          let namez =
            tmpDoc["scSanctionEntry"].langs.idLst[0].names.name[0].value;
          let refNum =
            tmpDoc["scSanctionEntry"].entry.listings.unListType[0]
              .referenceNumber;
          let result = { name: namez, RefNum: refNum };
          return result;
        });
        res.send(results);
      }
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message, error });
  }
};

export const removeFileAttachments = function (req, res) {
  try {
    // accept an array of fileAttachmentIDs, use to delete from FileAttch  collection
    // Character.deleteMany({ name: /Stark/, age: { $gte: 18 } }, function (err) {});
    // let fileAttchModel = new FileAttchModel();
    let filesTdsArr = req.getFilesIDs();
    FileAttchModel.deleteMany(filesTdsArr, function (err, data) {
      if (err) logg.error("removeFileAttachments the error is %o", err);
      else {
        res.send({
          "removeFileAttachments noError Saving Sanction": true,
          data: data,
        });
      }
    });
  } catch (error) {
    logg.info("removeFileAttachments error: %s", error.message);
    res.status(500).json({ message: error.message, error });
  }
};

export const getAttchmentByType = function (req, res) {
  try {
    let qryDoc = { _id: new ObjectID("5dbc6ecde22f2457e8dffc4a") };

    FileAttchModel.findById(qryDoc, function (err, docs) {
      if (err) {
        logg.error("error in getAttchmentByType %o", err.message);
      } else {
        logg.info("success in getAttchmentByType %o", docs.attchmnt);
        res.contentType("image/jpg");
        res.send(docs.attchmnt);
      }
    });
  } catch (error) {
    logg.info("getAttchmentByType error: %s", error.message);
    res.status(500).json({ message: error.message, error });
  }
};

export const getAttchments = function (req, res) {
  try {
    let archive = archiver("zip", {
      zlib: { level: 9 },
    });

    res.writeHead(200, {
      "Content-Type": "application/zip",
      "Content-Disposition": "attachment; filename=myFile.zip",
    });

    let qryDoc;
    if (Array.isArray(req.query.fileIds)) {
      let fileIdsArr = req.query.fileIds;
      let fileIds = fileIdsArr.map((fileID) => {
        return new ObjectID(fileID);
      });
      qryDoc = { _id: { $in: fileIds } };
    } else {
      qryDoc = { _id: { $in: req.query.fileIds } };
    }

    FileAttchModel.find(qryDoc, function (err, docs) {
      if (err) {
        logg.error("error in getAttchmentByType %o", err.message);
      } else {
        docs.map((doc, index) => {
          let extIndex = doc.contentType.indexOf("/");
          let fileExt = doc.contentType.substr(extIndex + 1);
          let lastIndexof = doc.attchmntName.lastIndexOf(".");
          let fileNm = "";

          if (lastIndexof != -1) {
            fileNm = doc.attchmntName.substr(0, lastIndexof);
          } else {
            fileNm = "unsolFile";
          }

          doc.attchmntName.substr(0);
          archive.append(doc.attchmnt, {
            name: fileNm + "_" + index + "." + fileExt,
          });
        });

        // pipe archive data to the response output stream
        archive.pipe(res);
        // now get data from the Mongodatabase
        archive.finalize();
      }
    });

    archive.on("error", function (err) {
      logg.error("there has been an error while archiving");
      throw err;
    });
  } catch (error) {
    logg.info("getAttchments error: %s", error.message);
    res.status(500).json({ message: error.message, error });
  }
};

export const getAllAttchmentsByType = function (req, res) {
  try {
    let qryDoc = {
      "langs.lang": req.body.lang,
      "entry.entryStatus": req.body.entryStatus,
      "entry.entryType": req.body.entryType,
      "entry._id": req.body._id,
    };

    FileAttchModel.find(qryDoc, function (err, docs) {
      if (err) {
        logg.error("%o", err.message);
        throw err;
      } else {
        res.send(JSON.parse(JSON.stringify(docs)));
      }
    });
  } catch (error) {
    logg.info("getAllAttchmentsByType error: %s", error.message);
    res.status(500).json({ message: error.message, error });
  }
};
