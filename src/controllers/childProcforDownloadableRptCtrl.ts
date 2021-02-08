var fs = require("fs");
var spawn = require("child_process").spawn;
var stream = require("stream");
const mongoose = require("mongoose");
const async = require("async");
const cron = require("node-cron");
const js2xmlparser = require("js2xmlparser");
import { getLookupAllList } from "./lookupLstCtrl";
import { logg } from "../../config/winston";

export let downloadFile = function (req, res) {
  // think about how to pass in various parameters
  let consolJar = process.env.CONSOLIDATED_JAR_LOCATION;
  let consolXMLLoc = process.env.CONSOLIDATED_XML_DESTINATION;

  logg.info("the env var for jar is %s", consolJar);
  logg.info("the env var for xml location  is %s", consolXMLLoc);
  logg.info("the query ids is %o", req.query.ids);
  logg.info("the state is %s", req.query.state);
  logg.info("the lang is %s", req.query.lang);

  let ids = req.query.ids;
  let state = req.query.state;
  let lang = req.query.lang;
  let childProcArr = [];
  childProcArr.push(consolJar);
  childProcArr.push(process.env.MONGO_URI); // first command line argument must be mongo_uri
  childProcArr.push(process.env.SANCTIONSDB); // second command line argument must be database name

  if (ids != null && ids !== undefined) {
    childProcArr.push("false"); // if ids are passed in, then this is NOT A consolidated rpt being requested
    childProcArr.push(parseInt(state));
    childProcArr.push(lang);
    let idArr = ids.split(",");
    idArr.forEach(function (idAr) {
      childProcArr.push(parseInt(idAr));
    });
  } else {
    // if a consolidated report exists, then send it back, else create a new one to be sent back
    logg.info("No ids, so we are retrieving a consolidated report");
    childProcArr.push("true"); // this is a request for a consolidated report
    childProcArr.push(parseInt(state));
    childProcArr.push(lang);
  }

  // need to push things into the array based on request parameters
  // http://localhost:3000/api/downloadFile?state=3&lang=EN // for consolidated
  // http://localhost:3000/api/downloadFile?state=3&lang=EN&ids=6908611,111144  // for regualr download

  // let childProcess = spawn('java -jar ', childProcArr ,{shell: true, stdio: 'inherit'})
  let childProcess = spawn("java -jar ", childProcArr, {
    shell: true,
    stdio: "pipe",
  });
  let tmpRef = "";

  childProcess.stdout.on("data", function (data) {
    process.stdout.write(data.toString());
    process.stdout.write(childProcess.stdout);
    tmpRef += data.toString();
    logg.info("should execute ONLU after the spawn is finished.");
  });

  childProcess.on("close", function (code) {
    logg.info("lets see the data %o", tmpRef);

    var fileContents = Buffer.from(tmpRef); //defaults to UTF-8
    // var fileContents = Buffer.from(tmpRef, "base64");
    var readStream = new stream.PassThrough();
    readStream.end(fileContents);
    let filenm = "download.xml";
    if (!ids) filenm = "consolidatedRpt.xml";
    res.set("Content-disposition", "attachment; filename=" + filenm);
    res.set("Content-Type", "text/xml");
    res.send(fileContents);
  });
};

let consolidatedRptCreation = function (lang) {
  let consolJar = process.env.CONSOLIDATED_JAR_LOCATION;
  let consolXMLLoc = process.env.CONSOLIDATED_XML_DESTINATION;
  logg.info("the env var for jar is %s", consolJar);
  logg.info("the env var for xml location  is %s", consolXMLLoc);

  let state = "3"; // ACTIVE
  let childProcArr = [];
  childProcArr.push(consolJar);
  childProcArr.push(process.env.MONGO_URI); // first command line argument must be mongo_uri
  childProcArr.push(process.env.SANCTIONSDB); // second command line argument must be database name
  childProcArr.push("true"); // this is a request for a consolidated report
  childProcArr.push(parseInt(state));
  childProcArr.push(lang);
  let childProcess = spawn("java -jar ", childProcArr, {
    shell: true,
    stdio: "pipe",
  });
  let tmpRef = "";

  childProcess.stdout.on("data", function (data) {
    tmpRef += data.toString();
    logg.info("should execute ONLY after the spawn is finished.");
  });

  childProcess.on("close", function (code) {
    let fileContents = Buffer.from(tmpRef); //defaults to UTF-8
    let filenm = "consolidatedRpt_" + lang + ".xml";

    fs.writeFile(
      `${process.env.CONSOLIDATED_XML_DESTINATION}` + filenm,
      fileContents,
      (err) => {
        if (err) {
          logg.error("there was an issue writing to the file: ", err.message);
        }
      }
    );
  });
};

const json2XMLParserFunction = (results) => {
  let entryArray = [];
  
  if (results.length > 0) {
    results.forEach((scSanction) => {
      let languages = [];
      if (
        scSanction.scSanctionEntry.entry.language &&
        scSanction.scSanctionEntry.entry.language.length > 0
      ) {
        scSanction.scSanctionEntry.entry.language.forEach((languageItem) => {
          let identities = [];
          languageItem.identity.forEach((identityItem) => {
            let names = {
              name: [
                {
                  "@": {
                    nameType: "",
                    order: "",
                    script: "",
                  },
                  "#": "",
                },
              ],
              nameOrgSpt: [
                {
                  "@": {
                    nameType: "",
                    order: "",
                    script: "",
                  },
                  "#": "",
                },
              ],
            };

            if (identityItem.names.name.length > 0) {
              const nameSet = [];
              identityItem.names.name.forEach((item) => {
                const name = {
                  "@": {
                    nameType: item.nameType,
                    order: item.order,
                    script: item.script,
                  },
                  "#": item.value,
                };
                // @ts-ignore
                nameSet.push(name);
              });
              names.name = nameSet;
            }

            if (identityItem.names.nameOrgSpt.length > 0) {
              const nameOrgSptSet = [];
              identityItem.names.nameOrgSpt.forEach((item) => {
                const nameOrgSpt = {
                  "@": {
                    nameType: item.nameType,
                    order: item.order,
                    script: item.script,
                  },
                  "#": item.value,
                };
                // @ts-ignore
                nameOrgSptSet.push(nameOrgSpt);
              });
              names.nameOrgSpt = nameOrgSptSet;
            }

            let titles = [];
            if (identityItem.titles.title.length > 0) {
              identityItem.titles.title.forEach((item) => {
                const title = {
                  title: item,
                };
                titles.push(title);
              });
            } else {
              titles = [{ title: "" }];
            }

            let designations = [];
            if (identityItem.designations.designation.length > 0) {
              identityItem.designations.designation.forEach((item) => {
                const designation = {
                  designation: item,
                };
                designations.push(designation);
              });
            } else {
              designations = [{ designation: "" }];
            }

            let dobs = [];
            if (identityItem.dobs.dob.length > 0) {
              identityItem.dobs.dob.forEach((item) => {
                const dob = {
                  "@": {
                    dobType: item.dobType,
                    dobSubset: item.dobSubset,
                  },
                  date: item.date,
                  dateFrom: item.dateFrom,
                  dateTo: item.dateTo,
                  note: item.note,
                };
                dobs.push(dob);
              });
            } else {
              dobs = [
                {
                  dob: {
                    "@": {
                      dobType: "",
                      dobSubset: "",
                    },
                    date: "",
                    dateFrom: "",
                    dateTo: "",
                    note: "",
                  },
                },
              ];
            }
            let pobs = [];
            if (identityItem.pobs.pob.length > 0) {
              identityItem.pobs.pob.forEach((item) => {
                const pob = {
                  address: {
                    street: item.address.street,
                    city: item.address.city,
                    stateProvince: item.stateProvince,
                    zipCode: item.address.zipCode,
                    country: item.address.country,
                    location: {
                      region: item.address.location.region,
                      lat: item.address.location.lat,
                      lng: item.address.location.lng,
                    },
                    note: item.address.note,
                  },
                };
                pobs.push(pob);
              });
            } else {
              pobs = [
                {
                  pob: {
                    address: {
                      street: "",
                      city: "",
                      stateProvince: "",
                      zipCode: "",
                      country: "",
                      location: {
                        region: "",
                        lat: "",
                        lng: "",
                      },
                      note: "",
                    },
                  },
                },
              ];
            }

            let biometrics = [];
            if (identityItem.biometricData.biometricInfo.biometric.length > 0) {
              identityItem.biometricData.biometricInfo.biometric.forEach(
                (item) => {
                  const biometric = {
                    "@": {
                      biometricType: item.biometricType,
                    },
                    biometricAttch: {
                      "@": {
                        href: item.biometricAttch[0].filename || "",
                      },
                    },
                    note: item.note,
                  };
                  biometrics.push(biometric);
                }
              );
            } else {
              biometrics = [
                {
                  biometric: {
                    "@": {
                      biometricType: "",
                    },
                    biometricAttch: {
                      "@": {
                        href: "",
                      },
                    },
                    note: "",
                  },
                },
              ];
            }
            let nationalities = [];
            if (identityItem.nationalities.nationality.length > 0) {
              identityItem.nationalities.nationality.forEach((item) => {
                const nationalityValue = {
                  nationality: item,
                };
                nationalities.push(nationalityValue);
              });
            } else {
              nationalities = [
                {
                  nationality: "",
                },
              ];
            }
            let documents = [];
            if (identityItem.documents.document.length > 0) {
              identityItem.documents.document.forEach((item) => {
                const documentValue = {
                  document: {
                    "@": {
                      documentType: item.docType1,
                    },
                    docType1: item.docType1,
                    docType2: item.docType2,
                    docNumber: item.docNumber,
                    issuingCountry: item.issuingCountry,
                    issuedDate: item.issuedDate,
                    expDate: item.expDate,
                    issuedCity: item.issuedCity,
                    issuedCountry: item.issuedCountry,
                    note: item.note,
                  },
                };
                documents.push(documentValue);
              });
            } else {
              documents = [
                {
                  document: {
                    "@": {
                      documentType: "",
                    },
                    docType1: "",
                    docType2: "",
                    docNumber: "",
                    issuingCountry: "",
                    issuedDate: "",
                    expDate: "",
                    issuedCity: "",
                    issuedCountry: "",
                    note: "",
                  },
                },
              ];
            }
            let addresses = [];
            if (
              identityItem.addresses.address &&
              identityItem.addresses.address.length > 0
            ) {
              identityItem.addresses.address.forEach((item) => {
                const addressValue = {
                  address: {
                    street: item.street,
                    city: item.city,
                    stateProvince: item.stateProvince,
                    zipCode: item.zipCode,
                    country: item.country,
                    location: {
                      region: item.location.region,
                      lat: item.location.lat,
                      lng: item.location.lng,
                    },
                    note: item.note,
                  },
                };
                addresses.push(addressValue);
              });
            } else {
              addresses = [
                {
                  address: {
                    street: "",
                    city: "",
                    stateProvince: "",
                    zipCode: "",
                    country: "",
                    location: {
                      region: "",
                      lat: "",
                      lng: "",
                    },
                    note: "",
                  },
                },
              ];
            }
            let feature = [];
            if (identityItem.entryFeatures.feature.length > 0) {
              identityItem.entryFeatures.feature.forEach((item) => {
                const featureValue = {
                  "@": {
                    featureType: item.featrureType,
                    status: item.status,
                  },
                  "#": item.value,
                };
                feature.push(featureValue);
              });
            } else {
              feature = [
                {
                  "@": {
                    featureType: "",
                    status: "",
                  },
                  "#": "",
                },
              ];
            }
            let identityValue = {
              "@": {
                type: identityItem.type,
                category: identityItem.category,
              },
              names: names,
              titles: titles,
              designations: designations,
              gender: identityItem.gender,
              livingStatus: identityItem.livingStatus,
              dobs: dobs,
              pobs: pobs,
              biometricData: {
                biometricInfo: {
                  biometrics,
                },
              },
              nationalities: nationalities,
              documents: documents,
              addresses: addresses,
              entryFeatures: {
                feature: feature,
                note: identityItem.entryFeatures.note,
              },
              comment: identityItem.comment,
            };
            identities.push(identityValue);
          });

          let languageValue = {
            "@": {
              lang: languageItem.lang,
            },
            identity: identities,
            reasonForListing: languageItem.reasonForListing,
            additionalInformation: languageItem.additionalInformation,
          };
          languages.push(languageValue);
        });
      } else {
        languages = [
          {
            language: {
              "@": {
                lang: "",
              },
              identity: [
                {
                  "@": {
                    type: "",
                    category: "",
                  },
                  names: "",
                  titles: "",
                  designations: "",
                  gender: "",
                  livingStatus: "",
                  dobs: "",
                  pobs: "",
                  biometricData: "",
                  nationalities: [
                    {
                      nationality: "",
                    },
                  ],
                  documents: [
                    {
                      document: {
                        "@": {
                          documentType: "",
                        },
                        docType1: "",
                        docType2: "",
                        docNumber: "",
                        issuingCountry: "",
                        issuedDate: "",
                        expDate: "",
                        issuedCity: "",
                        issuedCountry: "",
                        note: "",
                      },
                    },
                  ],
                  addresses: [
                    {
                      address: {
                        street: "",
                        city: "",
                        stateProvince: "",
                        zipCode: "",
                        country: "",
                        location: {
                          region: "",
                          lat: "",
                          lng: "",
                        },
                        note: "",
                      },
                    },
                  ],
                  entryFeatures: {
                    feature: [
                      {
                        "@": {
                          featureType: "",
                        },
                      },
                    ],
                    note: "",
                  },
                  comment: "",
                },
              ],
              reasonForListing: "",
              additionalInformation: "",
            },
          },
        ];
      }

      let unListType = [];
      if (
        scSanction.scSanctionEntry.entry.listings.unListType &&
        scSanction.scSanctionEntry.entry.listings.unListType.length > 0
      ) {
        scSanction.scSanctionEntry.entry.listings.unListType.forEach(
          (unListTypeItem) => {
            let updated = [];
            if (
              unListTypeItem.updates.updated &&
              unListTypeItem.updates.updated.length > 0
            ) {
              unListTypeItem.updates.updated.forEach((item) => {
                const updatedValue = {
                  "@": {
                    updatedType: item.updateType,
                  },
                  updatedOn: item.updatedOn || "",
                  pressRelease: item.pressRelease || "",
                };
                updated.push(updatedValue);
              });
            } else {
              updated = [
                {
                  "@": {
                    updatedType: "",
                  },
                  updatedOn: "",
                  pressRelease: "",
                },
              ];
            }

            let measure = [];
            if (unListTypeItem.measure && unListTypeItem.measure.length > 0) {
              unListTypeItem.measure.forEach((item) => {
                const measureValue = {
                  measure: item,
                };
                measure.push(measureValue);
              });
            } else {
              measure = [{ measure: "" }];
            }

            const unListTypeValue = {
              listName: unListTypeItem.listName || "",
              referenceNumber: unListTypeItem.referenceNumber || "",
              measure: measure,
              exemption: "",
              narrativeSummary: unListTypeItem.narrativeSummary || "",
              interpolUNSN: unListTypeItem.interpolUNSN,
              note: unListTypeItem.note,
              updates: {
                narrativeWebsiteDate:
                  scSanction.scSanctionEntry.entry.language[0]
                    .narrativeWebsiteDate || "",
                narrativeUpdatedOn:
                  scSanction.scSanctionEntry.entry.language[0]
                    .narrativeUpdatedOn || "",
                updated: updated,
              },
            };
            unListType.push(unListTypeValue);
          }
        );
      }

      let entry = {
        entryType: scSanction.scSanctionEntry.entry.entryType,
        id: scSanction.scSanctionEntry.entry.entryId,
        language: languages,
        listings: {
          unListType: unListType,
        },
      };
      entryArray.push(entry);
    });
  } else {
    entryArray = [
      {
        entryType: "",
        id: "",
        language: "",
        listings: {
          unListType: "",
        },
      },
    ];
  }

  let entries = {
    entry: entryArray,
  };
  let resultXML = js2xmlparser.parse("consolidated", entries);
  return resultXML;
};

export let downloadFileNew = async function (req, res) {
  try {
    let { ids, state, lang, reportType } = req.query;
    let idArrayValue = [];
    let nativeMongConn = mongoose.connection.db.collection(
      process.env.SANCTIONS_COLL
    );

    const start = new Date();
    start.setHours(1, 0, 0, 0);

    const end = new Date();
    end.setHours(24, 59, 59, 999);
    let query = {};

    let result = (await getLookupAllList())[0];
    const entryStatusArr = JSON.parse(JSON.stringify(result.entryStatus));
    const activeNameObj = entryStatusArr.filter(item => item.EN === 'ACTIVE')[0];

    if (ids != null && ids !== undefined) {
      let idArr = ids.split(",");
      idArr.forEach(function (idAr) {
        idArrayValue.push(parseInt(idAr));
      });

      query = {
        "scSanctionEntry.entry.language": { $elemMatch: { lang: lang } },
        "scSanctionEntry.entry.entryId": { $in: idArrayValue },
        "scSanctionEntry.entry.entryStatus": activeNameObj[lang],
      };
      if (reportType == "2") {
        query = {
          "scSanctionEntry.entry.language": { $elemMatch: { lang: lang } },
          "scSanctionEntry.entry.entryId": { $in: idArrayValue },
          "scSanctionEntry.entry.statusModifiedDte": { $gte: start, $lt: end },
          "scSanctionEntry.entry.entryStatus": activeNameObj[lang],
        };
      }
    } else {
      query = {
        "scSanctionEntry.entry.language": { $elemMatch: { lang: lang } },
        "scSanctionEntry.entry.entryStatus": activeNameObj[lang],
      };
      if (reportType == "2") {
        query = {
          "scSanctionEntry.entry.language": { $elemMatch: { lang: lang } },
          "scSanctionEntry.entry.statusModifiedDte": { $gte: start, $lt: end },
          "scSanctionEntry.entry.entryStatus": activeNameObj[lang],
        };
      }
    }

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
            count++;
            cb(null);
          },
          function (err) {
            if (err) return logg.info(" the async  error is %o", err);
            logg.info("Every thing is done,Here!!");
          }
        );
      }
      logg.info(" now sending the results %o", results);

      if (results.length > 0) {
        let resultXML = json2XMLParserFunction(results);
        res.send(resultXML);
      } else {
        res.send([]);
      }
    });
  } catch (err) {
    console.log("downloadFileNew: Error=>", err);
  }
};

let scheduleCronProcess  = function () {
let hrs = process.env.CONSOLIDATED_RPT_HRS;
let mins = process.env.CONSOLIDATED_RPT_MINS;
cron.schedule(
  `${mins} ${hrs} * * 1-5`,
  () => {
    let langs = process.env.CONSOLIDATED_RPT_LANGS;
    let langArr = langs.split(" ");
    
    langArr.map((lang) => consolidatedRptCreation(lang));
    console.log("Running a job at 15:42 at America/New_York timezone");
  } /*, {
  scheduled: true,
  timezone: "America/New_York"
} */
);
};