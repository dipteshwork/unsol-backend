import lookupLstModel from "../models/lookupLstModel";
import { Document, Schema, Model, model } from "mongoose";
import { logg } from "../../config/winston";
import RefNumCounterModel from "../models/refNumCounterModel";
import Country from "../classes/lookupCountries";
import { rejects } from "assert";
import { resolve } from "dns";

const asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
};

export let retrieveLookupLst = function (req, res) {
  lookupLstModel.findOne(function (err, docs) {
    // info: test message 123 {}
    if (err) return logg.error(" in retrieveLookupLst the error is %o", err);
    else {
      res.send(JSON.parse(JSON.stringify(docs)));
      //logg.info('this fires after the post find hook' + JSON.stringify(docs));
    }
  });
};

export const getLookupList = async function (req, res) {
  let langPrefix = req.params["langPrefix"];
  let filterValue = req.params["filterValue"];
  let filterField = req.params["filterField"];

  let result = await getLookUpFunction(langPrefix, filterValue, filterField);
  res.send(result);
};

export const getLookupAllList = async function () {
  return await lookupLstModel.find({});
};

const getLookUpFunction = async (langPrefix, filterValue?, filterField?) => {
  try {
    if (!langPrefix) {
      langPrefix = "EN";
    }

    let matchRef = {};
    let projects = {};
    matchRef = { $match: { ["entryStatus." + langPrefix]: { $exists: 1 } } };
    projects = {
      $project: {
        livingStatus: { $arrayElemAt: ["$livingStatus." + langPrefix, 0] },
        gender: { $arrayElemAt: ["$gender." + langPrefix, 0] },
        regime: "$regime",
        docType1: { $arrayElemAt: ["$docType1." + langPrefix, 0] },
        measures: { $arrayElemAt: ["$measures." + langPrefix, 0] },
        features: { $arrayElemAt: ["$features." + langPrefix, 0] },
        entryType: "$entryType",
        entryStatus: "$entryStatus",
        language: "$language",
        idCategory: "$idCategory." + langPrefix,
        translations: "$translations",
        idType: "$idType." + langPrefix,
        dobType: "$dobType." + langPrefix,
        dobSubset: "$dobSubset." + langPrefix,
        biometricType: "$biometricType." + langPrefix,
        nameOrgSptType: "$nameOrgSptType." + langPrefix,
        scriptType: "$scriptType." + langPrefix,
        "un_country_list.record.UN_name": 1,
        "un_country_list.record.en_Short": 1,
        "un_country_list.record.fr_Short": 1,
        "un_country_list.record.sp_Short": 1,
        "un_country_list.record.ru_Short": 1,
        "un_country_list.record.ch_Short": 1,
        "un_country_list.record.ar_Short": 1,
        "featuresStatus.EN": 1,
        "un_country_list.record.M49_code": 1,
        "un_country_list.record.ISO_code": 1,
      },
    };

    let qryDoc = [matchRef, projects];
    let result = await lookupLstModel.find({});
    // let result = await lookupLstModel.aggregate(qryDoc);
    if (filterValue) {
      let dataValue = [];
      if (filterField === 'biometricType' && langPrefix === 'ALL') {
        // search value in all languages
        result[0].biometricType.forEach(item => {
          let count = 0;
          item.forEach((value, key) => {
            if (count == 0 && value.biometricTypeName.toLowerCase().indexOf(filterValue) > -1) {
              count = count + 1;
              dataValue.push(JSON.parse(JSON.stringify(item)));
            }
          });
        });
        result[0].biometricType = dataValue;
      } else if (filterField === 'entryType' && langPrefix === 'ALL') {
        result[0].entryType.forEach(item => {
          let count = 0;
          item.forEach((value, key) => {
            if (count == 0 && value.entryTypeName.toLowerCase().indexOf(filterValue) > -1) {
              count = count + 1;
              dataValue.push(JSON.parse(JSON.stringify(item)));
            }
          });
        });
        result[0].entryType = dataValue;
      } else if (filterField === 'measures' && langPrefix === 'ALL') {
        result[0].measures.forEach(item => {
          let count = 0;
          item.forEach((value, key) => {
            if (count == 0 && value.measureNm.toLowerCase().indexOf(filterValue) > -1) {
              count = count + 1;
              dataValue.push(JSON.parse(JSON.stringify(item)));
            }
          });
        });
        result[0].measures = dataValue;
      } else if (filterField === 'regime' && langPrefix === 'ALL') {
        result[0].regime.forEach(item => {
          let count = 0;
          item.forEach((value, key) => {
            for (var prop in value) { 
              if (count == 0 && prop!='isActive' && (value[prop].toString().toLowerCase().indexOf(filterValue) > -1 || 
                value["measures"].toString().toLowerCase().indexOf(filterValue) > -1 )) {
                count = count + 1;
                dataValue.push(JSON.parse(JSON.stringify(item)));
              }
            } 
          });
        });
        result[0].regime = dataValue;
      } else if (filterField === 'gender' && langPrefix === 'ALL') {
        result[0].gender.forEach(item => {
          let count = 0;
          item.forEach((value, key) => {
            if (count == 0 && value.genderName.toString().toLowerCase().indexOf(filterValue) > -1) {
              count = count + 1;
              dataValue.push(JSON.parse(JSON.stringify(item)));
            }
          });
        });
        result[0].gender = dataValue;
      } else if (filterField === 'livingStatus' && langPrefix === 'ALL') {
        result[0].livingStatus.forEach(item => {
          let count = 0;
          item.forEach((value, key) => {
            if (count == 0 && value.livingStatusName.toString().toLowerCase().indexOf(filterValue) > -1) {
              count = count + 1;
              dataValue.push(JSON.parse(JSON.stringify(item)));
            }
          });
        });
        result[0].livingStatus = dataValue;
      } else if (filterField === 'idCategory' && langPrefix === 'ALL') {
        result[0].idCategory.forEach(item => {
          let count = 0;
          item.forEach((value, key) => {
            if (count == 0 && value.idCategoryName.toLowerCase().indexOf(filterValue) > -1) {
              count = count + 1;
              dataValue.push(JSON.parse(JSON.stringify(item)));
            }
          });
        });
        result[0].idCategory = dataValue;
      } else if (filterField === 'features' && langPrefix === 'ALL') {
        result[0].features.forEach(item => {
          let count = 0;
          item.forEach((value, key) => {
            if (count == 0 && value.toString().toLowerCase().indexOf(filterValue) > -1) {
              count = count + 1;
              dataValue.push(JSON.parse(JSON.stringify(item)));
            }
          });
        });
        result[0].features = dataValue;
      } else if (filterField === 'idType' && langPrefix === 'ALL') {
        result[0].idType.forEach(item => {
          let count = 0;
          item.forEach((value, key) => {
            if (count == 0 && value.toString().toLowerCase().indexOf(filterValue) > -1) {
              count = count + 1;
              dataValue.push(JSON.parse(JSON.stringify(item)));
            }
          });
        });
        result[0].idType = dataValue;
      } else if (filterField === 'translations' && langPrefix === 'ALL') {
        result[0].translations.translation.forEach(item => {
          let count = 0;
          item.forEach((value, key) => {
            if (count == 0 && value.toString().toLowerCase().indexOf(filterValue) > -1) {
              count = count + 1;
              dataValue.push(JSON.parse(JSON.stringify(item)));
            }
          });
        });
        result[0].translations.translation = dataValue;
      } else if (filterField === 'un_country_list' && langPrefix === 'ALL') {
        result[0].un_country_list.record.forEach(item => {
          let count = 0;
          if (count == 0 && (item.UN_name.toLowerCase().indexOf(filterValue) > -1
          || (item.en_Short && item.en_Short.toLowerCase().indexOf(filterValue) > -1)
          || (item.ch_Short && item.ch_Short.toLowerCase().indexOf(filterValue) > -1)
          || (item.fr_Short && item.fr_Short.toLowerCase().indexOf(filterValue) > -1)
          || (item.ru_Short && item.ru_Short.toLowerCase().indexOf(filterValue) > -1)
          || (item.ar_Short && item.ar_Short.toLowerCase().indexOf(filterValue) > -1)
          || (item.sp_Short && item.sp_Short.toLowerCase().indexOf(filterValue) > -1)
        )) {
            count = count + 1;
            dataValue.push(JSON.parse(JSON.stringify(item)));
          }
        });
        result[0].un_country_list.record = dataValue;
      } else if (filterField === 'biometricType') {
        result[0].biometricType = result[0].biometricType.filter(
          (item) => JSON.parse(JSON.stringify(item))[langPrefix].toLowerCase().indexOf(filterValue) > -1
        );
      } else if (filterField === 'entryType') {
        result[0].entryType = result[0].entryType.filter(
          (item) => JSON.parse(JSON.stringify(item))[langPrefix].toLowerCase().indexOf(filterValue) > -1
        );
      } else if (filterField === 'gender') {
        result[0].gender = result[0].gender.filter(
          (item) => JSON.parse(JSON.stringify(item))[langPrefix].toLowerCase().indexOf(filterValue) > -1
        );
      } else if (filterField === 'livingStatus') {
        result[0].livingStatus = result[0].livingStatus.filter(
          (item) => JSON.parse(JSON.stringify(item))[langPrefix].toLowerCase().indexOf(filterValue) > -1
        );
      } else if (filterField === 'idType') {
        result[0].idType = result[0].idType.filter(
          (item) => JSON.parse(JSON.stringify(item))[langPrefix].toLowerCase().indexOf(filterValue) > -1
        );
      } else if (filterField === 'idCategory') {
        result[0].idCategory = result[0].idCategory.filter(
          (item) => JSON.parse(JSON.stringify(item))[langPrefix].toLowerCase().indexOf(filterValue) > -1
        );
      } else if (filterField === 'features') {
        result[0].features = result[0].features.filter(
          (item) => JSON.parse(JSON.stringify(item))[langPrefix].toLowerCase().indexOf(filterValue) > -1
        );
      } else if (filterField === 'measures') {
        result[0].measures = result[0].measures.filter(
          (item) => JSON.parse(JSON.stringify(item))[langPrefix].measureNm.toLowerCase().indexOf(filterValue) > -1
        );
      } else if (filterField === 'un_country_list') {
        result[0].un_country_list.record = result[0].un_country_list.record.filter(
          (item) => {
            const country = JSON.parse(JSON.stringify(item));
            return (country.UN_name.toLowerCase().indexOf(filterValue) > -1
              || (country.en_Short && country.en_Short.toLowerCase().indexOf(filterValue) > -1)
              || (country.ch_Short && country.ch_Short.toLowerCase().indexOf(filterValue) > -1)
              || (country.fr_Short && country.fr_Short.toLowerCase().indexOf(filterValue) > -1)
              || (country.ru_Short && country.ru_Short.toLowerCase().indexOf(filterValue) > -1)
              || (country.ar_Short && country.ar_Short.toLowerCase().indexOf(filterValue) > -1)
              || (country.sp_Short && country.sp_Short.toLowerCase().indexOf(filterValue) > -1)
            );
          }
        );
      } else if (filterField === 'regime') {
        result[0].regime = result[0].regime.filter(
          (item) => {
            const regime = JSON.parse(JSON.stringify(item))[langPrefix];
            const acronym = Object.keys(regime).filter(item => item !== 'isActive' && item !== 'measures')[0];
            return (acronym.toLowerCase().indexOf(filterValue) > -1
              || regime[acronym].toLowerCase().indexOf(filterValue) > -1
              || regime['measures'].toString().toLowerCase().indexOf(filterValue) > -1);
          }
        );
      } else if (filterField === 'translations') {
        result[0].translations.translation = result[0].translations.translation.filter(
          (item) => {
            const translation = JSON.parse(JSON.stringify(item));
            return ((translation.en && translation.en.toLowerCase().indexOf(filterValue) > -1)
              || (translation.ch && translation.ch.toLowerCase().indexOf(filterValue) > -1)
              || (translation.sp && translation.sp.toLowerCase().indexOf(filterValue) > -1)
              || (translation.ru && translation.ru.toLowerCase().indexOf(filterValue) > -1)
              || (translation.ar && translation.ar.toLowerCase().indexOf(filterValue) > -1)
              || (translation.fr && translation.fr.toLowerCase().indexOf(filterValue) > -1));
          }
        );
      } else if (filterField === 'language') {
        result[0].language = result[0].language.filter(
          (item) => {
            const language = JSON.parse(JSON.stringify(item));
            const languageTranslation = result[0].translations.translation.filter(
              (translation) => JSON.parse(JSON.stringify(translation)).en === language.name
            );
            return JSON.parse(JSON.stringify(languageTranslation))[0][langPrefix.toLowerCase()].toLowerCase().indexOf(filterValue) > -1;
          }
        );
      }
    }
    return result;
  } catch (error) {
    logg.info("%o", error.message);
  }
};

export let addNewEntryTyp = function (req, res) {
  let reqData = req.body;
  lookupLstModel.findOneAndUpdate(
    {},
    { $push: { entryType: reqData } },
    function (err, result) {
      if (err) {
        return res.status(500).json({ message: err.message, error: err });
      }
      res.send(result);
    }
  );
};

export let updateEntryTyp = function (req, res) {
  let reqData = req.body;
  let newObject = reqData.newObject;

  lookupLstModel.findOneAndUpdate(
    {
      [`entryType.${reqData.lang}.entryTypeName`]: reqData.oldData.entryTypeName,
    },
    {
      $set: { "entryType.$": newObject },
    },
    {
      new: true,
      upsert: false,
    },
    function (err, result) {
      if (err) {
        return res.status(500).json({ message: err.message, error: err });
      }
      res.send(result);
    }
  );
};

export let deleteEntry = function (req, res) {
  let reqData = req.body.entryTypeData;
  let lookupId = req.body._id
  lookupLstModel.updateOne(
    {
      _id: lookupId
    },

    {
      $set: { "entryType": reqData },
    },
    {
      new: true,
      upsert: false,
    },
    function (err, result) {
      if (err) {
        return res.status(500).json({ message: err.message, error: err });
      }
      res.send(result);
    }
  );
};

export let deleteLivingStatus = function (req, res) {
  let reqData = req.body.livingStatusData;
  let lookupId = req.body._id
  lookupLstModel.updateOne(
    {
      _id: lookupId
    },

    {
      $set: { "livingStatus": reqData },
    },
    {
      new: true,
      upsert: false,
    },
    function (err, result) {
      if (err) {
        return res.status(500).json({ message: err.message, error: err });
      }
      res.send(result);
    }
  );
};

export let deleteTranslation = async function (req, res) {
  let keyword = req.body.keyword;
  let lookupId = req.body._id

  const obj = await lookupLstModel.findOne({_id: lookupId});
  const lookupData = obj.toObject()
  const translations = lookupData.translations
  const index = translations.translation.findIndex(element => element.get('en') === keyword)
  translations.translation.splice(index, 1)

  lookupLstModel.updateOne(
    {
      _id: lookupId
    },

    {
      $set: { "translations.translation": translations.translation },
    },
    {
      new: true,
      upsert: false,
    },
    function (err, result) {
      if (err) {
        return res.status(500).json({ message: err.message, error: err });
      }
      res.send(result);
    }
  );
};

export let deleteBiometricType = function (req, res) {
  let reqData = req.body.biometricData;
  let lookupId = req.body._id
  lookupLstModel.updateOne(
    {
      _id: lookupId
    },

    {
      $set: { "biometricType": reqData },
    },
    {
      new: true,
      upsert: false,
    },
    function (err, result) {
      if (err) {
        return res.status(500).json({ message: err.message, error: err });
      }
      res.send(result);
    }
  );
};

export let deleteCategory = function (req, res) {
  let reqData = req.body.idCategoryData;
  let lookupId = req.body._id
  lookupLstModel.updateOne(
    {
      _id: lookupId
    },

    {
      $set: { "idCategory": reqData },
    },
    {
      new: true,
      upsert: false,
    },
    function (err, result) {
      if (err) {
        return res.status(500).json({ message: err.message, error: err });
      }
      res.send(result);
    }
  );
};

export let deleteLanguage = function (req, res) {
  let reqData = req.body.languageData;
  let lookupId = req.body._id
  lookupLstModel.updateOne(
    {
      _id: lookupId
    },

    {
      $set: { "language": reqData },
    },
    {
      new: true,
      upsert: false,
    },
    function (err, result) {
      if (err) {
        return res.status(500).json({ message: err.message, error: err });
      }
      res.send(result);
    }
  );
};

export let deleteFeature = function (req, res) {
  let reqData = req.body.featuresData;
  let lookupId = req.body._id
  lookupLstModel.updateOne(
    {
      _id: lookupId
    },

    {
      $set: { "features": reqData },
    },
    {
      new: true,
      upsert: false,
    },
    function (err, result) {
      if (err) {
        return res.status(500).json({ message: err.message, error: err });
      }
      res.send(result);
    }
  );
};

export let deleteIdTypes = function (req, res) {
  let reqData = req.body.idTypesData;
  let lookupId = req.body._id
  lookupLstModel.updateOne(
    {
      _id: lookupId
    },

    {
      $set: { "idType": reqData },
    },
    {
      new: true,
      upsert: false,
    },
    function (err, result) {
      if (err) {
        return res.status(500).json({ message: err.message, error: err });
      }
      res.send(result);
    }
  );
};


// export let addNewEntryTyp = async function (req, res) {
//   let entryType = req.body;
//   let langPrefix = "EN";
//   let lookupLst = await getLookupAllList();
//   let languagesArr = lookupLst[0].language.map(
//       lang => JSON.parse(JSON.stringify(lang)).acronym
//   );
//   let newFeature = {};
//   languagesArr.forEach((lang) => {
//     newFeature[lang] = entryType[lang.toLowerCase() + 'EntryTypNm'];
//   });
//   await lookupLstModel.updateOne({}, { $addToSet: { entryType: newFeature } });
//   let result = await getLookUpFunction(langPrefix);

//   res.send(result["0"]["entryType"]);
// };

// export let updateEntryTyp = async function (req, res) {
//   try {
//     let { newEntryType, oldEntryType } = req.body;
//     let langPrefix = "EN";
//     let lookupLst = await getLookupAllList();
//     let languagesArr = lookupLst[0].language.map(
//         lang => JSON.parse(JSON.stringify(lang)).acronym
//     );
//     let oldEntryTypeObj = {};
//     let updateFeatureObj = {};
//     languagesArr.forEach((lang) => {
//       oldEntryTypeObj[lang] = oldEntryType[lang.toLowerCase() + '_name'];
//       updateFeatureObj[lang] = newEntryType[lang.toLowerCase() + 'EntryTypNm']
//     });

//     await lookupLstModel.findOneAndUpdate(
//       {
//         entryType: {
//           $elemMatch: oldEntryTypeObj,
//         },
//       },
//       { $set: { "entryType.$": updateFeatureObj } },
//       { new: true, upsert: false }
//     );
//     let result = await getLookUpFunction(langPrefix);
//     res.send(result["0"]["entryType"]);
//   } catch (err) {
//     res.send(500, { error: err });
//   }
// };

export let addNewMeasure = function (req, res) {
  let measure = req.body;
  lookupLstModel.findOneAndUpdate(
    {},
    { $push: { measures: measure } },
    function (err, result) {
      if (err) {
        return res.status(500).json({ message: err.message, error: err });
      }
      res.send(result);
    }
  );
};

const autoConvertMapToObject = (map) => {
  const obj = {};
  for (const item of [...map]) {
    const [key, value] = item;
    obj[key] = value;
  }
  return obj;
};

export let updateMeasure = async function (req, res) {
 let measure = req.body;
 let newMeasure = measure.newMeasure;
 lookupLstModel.findOneAndUpdate(
   {
     [`measures.${measure.lang}.measureNm`]: measure.oldMeasure.measureNm,
   },
   {
     $set: { "measures.$": newMeasure },
   },
   {
     new: true,
     upsert: false,
   },
   function (err, result) {
     /*When update measure also Update regime value */
     lookupLstModel.find({}, function (err, doc) {
       if (err) return res.send(500, { error: err });
       doc[0].regime.forEach((item) => {
         item.forEach((value, key1) => {
           value.measures.forEach((element, key2) => {
             for (let x in measure.oldMeasure) {
               if (measure.oldMeasure["measureNm"] === element) {
                 const oldRegime = JSON.parse(
                   JSON.stringify(autoConvertMapToObject(item))
                 );
                 element = newMeasure[key1].measureNm;
                 value[key2] == newMeasure[key1].measureNm;
                 const newRegime = JSON.parse(JSON.stringify(item));
                 for (let y in newMeasure) {
                   newRegime[y].measures[key2] = newMeasure[y].measureNm;
                 }
                 lookupLstModel.findOneAndUpdate(
                   {
                     regime: {
                       $elemMatch: oldRegime,
                     },
                   },
                   { $set: { "regime.$": newRegime } },
                   { new: true, upsert: false },
                   function (err, doc) {
                     console.log("err:", err);
                   }
                 );
                 break;
               }
             }
           });
         });
       });
     });
     if (err) {
     return res.status(500).json({ message: err.message, error: err });
      }
     res.send(result);
   }
 );
};

export let deleteMeasure = function (req, res) {
  let reqData = req.body.measureData;
  let lookupId = req.body._id
  lookupLstModel.updateOne(
    {
      _id: lookupId
    },

    {
      $set: { "measures": reqData },
    },
    {
      new: true,
      upsert: false,
    },
    function (err, result) {
      if (err) {
        return res.status(500).json({ message: err.message, error: err });
      }
      res.send(result);
    }
  );
};

export let addNewLanguage = function (req, res) {
  let language = req.body;
  lookupLstModel.updateOne({}, { $addToSet: { language: language } }, function (
    err,
    result
  ) {
    if (err) {
      return res.status(500).json({ message: err.message, error: err });
    }
    res.send(result);
  });
};

export let updateLanguage = async function (req, res) {
  let oldLang = req.body.oldRowData;
  let newLang = req.body.modifiedRowData;
  // backend will get working lang info which will be used to update db
  let workingLang = req.body.workingLang;

  // make sure that there's only one working language
  // new lang was set as working one, so the others should be non-working
  if (oldLang.isWorking !== newLang.isWorking && newLang.isWorking === true) {
    workingLang.isWorking = false;
    try {
      await new Promise((resolve, reject) => {
        lookupLstModel.findOneAndUpdate(
          { "language.isWorking": true },
          { $set: { "language.$": workingLang } },
          {
            new: true,
            upsert: false,
          },
          function (err, result) {
            if (err) {
              logg.info(err);
              return reject("Failed to set as non-working!");
            }
            return resolve(true);
          }
        );
      });
    } catch (err) {
      logg.info(err);
    }
  }

  // update language
  lookupLstModel.findOneAndUpdate(
    { "language.name": oldLang.name },
    { $set: { "language.$": newLang } },
    {
      new: true,
      upsert: false,
    },
    function (err, result) {
      if (err) {
        return res.status(500).json({ message: err.message, error: err });
      }
      res.send(result);
    }
  );
};

export let addNewTranslation = function (req, res) {
  let translation = req.body;
  lookupLstModel.findOneAndUpdate(
    {},
    { $push: { "translations.translation": translation } },
    { new: true, upsert: false },
    function (err, result) {
      if (err) {
        return res.status(500).json({ message: err.message, error: err });
      }
      res.send(result);
    }
  );
};

export let updateTranslation = function (req, res) {
  let oldTranslation = req.body.oldTranslation;
  let newTranslation = req.body.translation;
  lookupLstModel.findOneAndUpdate(
    {
      "translations.translation": {
        $elemMatch: oldTranslation,
      },
    },
    { $set: { "translations.translation.$": newTranslation } },
    { new: true, upsert: false },
    function (err, doc) {
      if (err) return res.send(500, { error: err });
      return res.send(doc);
    }
  );
};

export let retrieveMeasures = function (req, res) {
  let matchRef = { $match: { "entryStatus.EN": { $exists: 1 } } };
  let projects = {
    $project: { measures: { $arrayElemAt: ["$measures.EN", 0] } },
  };
  let qryDoc = [matchRef, projects];
  lookupLstModel.aggregate(qryDoc, function (err, docs) {
    if (err) {
      return logg.error("%o", err);
    } else {
      res.send(docs);
    }
  });
};

export let updateCountry = async function (req, res) {
  try {

    //update db
      const recordValue = lookupLstModel.find({});
      // console.log('ggg recordValue---------------', recordValue[0]['un_country_list']);
      // const newValue = recordValue.map(item => {
      //   return({
      //     ...item,
      //     isActive: true,
      //   })
      // });

      // // lookupLstModel.find().forEach(function(doc){
      // //   lookupLstModel.update({_id:doc._id}, {$set:{"un_country_list.record":newValue}});
      // // });
      // // console.log('ggg newValue---------------', newValue);

      // const countryList = await lookupLstModel.update({},
      //   {$set: {'un_country_list.record': newValue}}
      //   );
  

    logg.info("the data being dealt wiht is %o ", req.body["oldRowData"]);
    logg.info(" while the new data is %o ", req.body["modifiedRowData"]);
    let output = req.body["modifiedRowData"];
    let langPrefix = "EN";
    // will use un membership number
    let enS = req.body["oldRowData"]["row"]["en_Short"];
    let country: Country = new Country(
      output["unName"],
      output["m49Cde"],
      output["isoCde"],
      output["enS"],
      output["frS"],
      output["spS"],
      output["ruS"],
      output["chS"],
      output["arS"],
      output["unMem"],
      output["enF"],
      output["frF"],
      output["spF"],
      output["ruF"],
      output["chF"],
      output["arF"],
      output["isActive"]
    );

    await lookupLstModel.updateOne(
      { "un_country_list.record.en_Short": enS },
      { $set: { "un_country_list.record.$": country } }
    );
    let result = await getLookUpFunction(langPrefix);
    res.send(result["0"]["un_country_list"]["record"]);
  } catch (error) {
    logg.info("error", error.message);
  }
};

export let addNewBiometric = function (req, res) {
  let reqData = req.body;
  lookupLstModel.findOneAndUpdate(
    {},
    { $push: { biometricType: reqData } },
    function (err, result) {
      if (err) {
        return res.status(500).json({ message: err.message, error: err });
      }
      res.send(result);
    }
  );
};

export let updateBiometric = function (req, res) {
  let reqData = req.body;
  let newObject = reqData.newObject;

  lookupLstModel.findOneAndUpdate(
    {
      [`biometricType.${reqData.lang}.biometricTypeName`]: reqData.oldData.biometricTypeName,
    },
    {
      $set: { "biometricType.$": newObject },
    },
    {
      new: true,
      upsert: false,
    },
    function (err, result) {
      if (err) {
        return res.status(500).json({ message: err.message, error: err });
      }
      res.send(result);
    }
  );
};

export let deleteBiometric = function (req, res) {
  let reqData = req.body.genderData;
  let lookupId = req.body._id
  lookupLstModel.updateOne(
    {
      _id: lookupId
    },

    {
      $set: { "biometricType": reqData },
    },
    {
      new: true,
      upsert: false,
    },
    function (err, result) {
      if (err) {
        return res.status(500).json({ message: err.message, error: err });
      }
      res.send(result);
    }
  );
};

export let addNewCategoryType = function (req, res) {
  let reqData = req.body;
  lookupLstModel.findOneAndUpdate(
    {},
    { $push: { idCategory: reqData } },
    function (err, result) {
      if (err) {
        return res.status(500).json({ message: err.message, error: err });
      }
      res.send(result);
    }
  );
};

export let updateCategoryType = function (req, res) {
  let reqData = req.body;
  let newObject = reqData.newObject;

  lookupLstModel.findOneAndUpdate(
    {
      [`idCategory.${reqData.lang}.idCategoryName`]: reqData.oldData.idCategoryName,
    },
    {
      $set: { "idCategory.$": newObject },
    },
    {
      new: true,
      upsert: false,
    },
    function (err, result) {
      if (err) {
        return res.status(500).json({ message: err.message, error: err });
      }
      res.send(result);
    }
  );
};

export let deleteCategoryType = function (req, res) {
  let reqData = req.body.genderData;
  let lookupId = req.body._id
  lookupLstModel.updateOne(
    {
      _id: lookupId
    },

    {
      $set: { "idCategory": reqData },
    },
    {
      new: true,
      upsert: false,
    },
    function (err, result) {
      if (err) {
        return res.status(500).json({ message: err.message, error: err });
      }
      res.send(result);
    }
  );
};

export let addNewFeature = async function (req, res) {
  let feature = req.body;
  let langPrefix = "EN";
  let lookupLst = await getLookupAllList();
  let languagesArr = lookupLst[0].language.map(
      lang => JSON.parse(JSON.stringify(lang)).acronym
  );
  let newFeature = {};
  languagesArr.forEach((lang) => {
    newFeature[lang] = feature[`${lang.toLowerCase()}Feature`];
  });
  await lookupLstModel.updateOne({}, { $addToSet: { features: newFeature } });
  let result = await getLookUpFunction(langPrefix);
  res.send(result["0"]["features"]);
};

export let updateFeature = async function (req, res) {
  try {
    let { newFeature, oldFeature } = req.body;
    let langPrefix = "EN";
    let lookupLst = await getLookupAllList();
    let languagesArr = lookupLst[0].language.map(
        lang => JSON.parse(JSON.stringify(lang)).acronym
    );
    let updateFeatureObj = {};
    languagesArr.forEach((lang) => {
      updateFeatureObj[lang] = newFeature[`${lang.toLowerCase()}Feature`];
    });
    updateFeatureObj['isActive'] = newFeature['isActive'];

    await lookupLstModel.findOneAndUpdate(
      {
        features: {
          $elemMatch: oldFeature,
        },
      },
      { $set: { "features.$": updateFeatureObj } },
      { new: true, upsert: false }
    );
    let result = await getLookUpFunction(langPrefix);
    res.send(result["0"]["features"]);
  } catch (err) {
    res.send(500, { error: err });
  }
};

// export let addNewGender = async function (req, res) {
//   let gender = req.body;
//   let langPrefix = "EN";
//   let lookupLst = await getLookupAllList();
//   let languagesArr = lookupLst[0].language.map(
//       lang => JSON.parse(JSON.stringify(lang)).acronym
//   );
//   let newGender = {};
//   languagesArr.forEach((lang) => {
//     newGender[lang] = gender[`${lang.toLowerCase()}Gender`];
//   });
//   await lookupLstModel.updateOne({}, { $addToSet: { gender: newGender } });
//   let result = await getLookUpFunction(langPrefix);
//   res.send(result["0"]["gender"]);
// };

// export let updateGender = async function (req, res) {
//   try {
//     let { newGender, oldGender } = req.body;
//     let langPrefix = "EN";
//     let lookupLst = await getLookupAllList();
//     let languagesArr = lookupLst[0].language.map(
//         lang => JSON.parse(JSON.stringify(lang)).acronym
//     );
//     let updateGenderObj = {};
//     languagesArr.forEach((lang) => {
//       updateGenderObj[lang] = newGender[`${lang.toLowerCase()}Gender`];
//     });

//     await lookupLstModel.findOneAndUpdate(
//       {
//         gender: {
//           $elemMatch: oldGender,
//         },
//       },
//       { $set: { "gender.$": updateGenderObj } },
//       { new: true, upsert: false }
//     );
//     let result = await getLookUpFunction(langPrefix);
//     res.send(result["0"]["gender"]);
//   } catch (err) {
//     res.send(500, { error: err });
//   }
// };

export let addNewGender = function (req, res) {
  let reqData = req.body;
  lookupLstModel.findOneAndUpdate(
    {},
    { $push: { gender: reqData } },
    function (err, result) {
      if (err) {
        return res.status(500).json({ message: err.message, error: err });
      }
      res.send(result);
    }
  );
};

export let updateGender = function (req, res) {
  let reqData = req.body;
  let newObject = reqData.newObject;

  lookupLstModel.findOneAndUpdate(
    {
      [`gender.${reqData.lang}.genderName`]: reqData.oldData.genderName,
    },
    {
      $set: { "gender.$": newObject },
    },
    {
      new: true,
      upsert: false,
    },
    function (err, result) {
      if (err) {
        return res.status(500).json({ message: err.message, error: err });
      }
      res.send(result);
    }
  );
};

export let deleteGender = function (req, res) {
  let reqData = req.body.genderData;
  let lookupId = req.body._id
  lookupLstModel.updateOne(
    {
      _id: lookupId
    },

    {
      $set: { "gender": reqData },
    },
    {
      new: true,
      upsert: false,
    },
    function (err, result) {
      if (err) {
        return res.status(500).json({ message: err.message, error: err });
      }
      res.send(result);
    }
  );
};

export let addNewLivingStatus = function (req, res) {
  let reqData = req.body;
  lookupLstModel.findOneAndUpdate(
    {},
    { $push: { livingStatus: reqData } },
    function (err, result) {
      if (err) {
        return res.status(500).json({ message: err.message, error: err });
      }
      res.send(result);
    }
  );
};

export let updateLivingStatus = function (req, res) {
  let reqData = req.body;
  let newObject = reqData.newObject;

  lookupLstModel.findOneAndUpdate(
    {
      [`livingStatus.${reqData.lang}.livingStatusName`]: reqData.oldData.livingStatusName,
    },
    {
      $set: { "livingStatus.$": newObject },
    },
    {
      new: true,
      upsert: false,
    },
    function (err, result) {
      if (err) {
        return res.status(500).json({ message: err.message, error: err });
      }
      res.send(result);
    }
  );
};

export let addNewIdType = function (req, res) {
  let reqData = req.body;
  lookupLstModel.findOneAndUpdate(
    {},
    { $push: { idType: reqData } },
    function (err, result) {
      if (err) {
        return res.status(500).json({ message: err.message, error: err });
      }
      res.send(result);
    }
  );
};

export let updateIdType = function (req, res) {
  let reqData = req.body;
  let newObject = reqData.newObject;

  lookupLstModel.findOneAndUpdate(
    {
      [`idType.${reqData.lang}.idTypeName`]: reqData.oldData.idTypeName,
    },
    {
      $set: { "idType.$": newObject },
    },
    {
      new: true,
      upsert: false,
    },
    function (err, result) {
      if (err) {
        return res.status(500).json({ message: err.message, error: err });
      }
      res.send(result);
    }
  );
};

// export let addNewIdType = async function (req, res) {
//   let idType = req.body;
//   let langPrefix = "EN";
//   let lookupLst = await getLookupAllList();
//   let languagesArr = lookupLst[0].language.map(
//       lang => JSON.parse(JSON.stringify(lang)).acronym
//   );
//   let newOne = {};
//   languagesArr.forEach((lang) => {
//     newOne[lang] = idType[`${lang.toLowerCase()}IdType`];
//   });
//   await lookupLstModel.updateOne({}, { $addToSet: { idType: newOne } });
//   let result = await getLookUpFunction(langPrefix);
//   res.send(result["0"]["idType"]);
// };

// export let updateIdType = async function (req, res) {
//   try {
//     let { newIdType, oldIdType } = req.body;
//     let langPrefix = "EN";
//     let lookupLst = await getLookupAllList();
//     let languagesArr = lookupLst[0].language.map(
//         lang => JSON.parse(JSON.stringify(lang)).acronym
//     );
//     let updateObj = {};
//     languagesArr.forEach((lang) => {
//       updateObj[lang] = newIdType[`${lang.toLowerCase()}IdType`]
//     });

//     await lookupLstModel.findOneAndUpdate(
//       {
//         idType: {
//           $elemMatch: oldIdType,
//         },
//       },
//       { $set: { "idType.$": updateObj } },
//       { new: true, upsert: false }
//     );
//     let result = await getLookUpFunction(langPrefix);
//     res.send(result["0"]["idType"]);
//   } catch (err) {
//     res.send(500, { error: err });
//   }
// };

export const addNewCountry = function (req, res) {
  let unName = req.body.unName;
  let m49Cde = req.body.m49Cde;
  let isoCde = req.body.isoCde;
  let enShort = req.body.enShort;
  let frShort = req.body.frShort;
  let apShort = req.body.apShort;
  let ruShort = req.body.ruShort;
  let chShort = req.body.chShort;
  let arShort = req.body.arShort;
  let enRemark = req.body.enRemark;
  let mberShpNum = req.body.mberShpNum;
  let enformal = req.body.enformal;
  let frformal = req.body.frformal;
  let spformal = req.body.spformal;
  let ruformal = req.body.ruformal;
  let chformal = req.body.chformal;
  let arformal = req.body.arformal;

  let countryObj = {};
  countryObj["UN_name"] = unName;
  countryObj["M49_code"] = m49Cde;
  countryObj["ISO_code"] = isoCde;
  countryObj["en_Short"] = enShort;
  countryObj["fr_Short"] = frShort;
  countryObj["sp_Short"] = apShort;
  countryObj["ru_Short"] = ruShort;
  countryObj["ch_Short"] = chShort;
  countryObj["ar_Short"] = arShort;
  countryObj["en_remark"] = enRemark;
  countryObj["UN_Membership"] = mberShpNum;
  countryObj["en_Formal"] = enformal;
  countryObj["fr_Formal"] = frformal;
  countryObj["sp_Formal"] = spformal;
  countryObj["ru_Formal"] = ruformal;
  countryObj["ch_Formal"] = chformal;
  countryObj["ar_Formal"] = arformal;
  lookupLstModel.updateOne(
    {},
    { $push: { "un_country_list.record": countryObj } },
    function (err, result) {
      if (err) return res.status(500).json({ message: err.message, error: err });
      res.send(result);
    }
  );
};

export const getNextRefNumSeq = function (req, res) {
  const id = req.body.id;
  RefNumCounterModel.findOneAndUpdate(
    { _id: id },
    { $inc: { seq: 1 } },
    { new: true, upsert: false },
    function (err, result) {
      if (err) {
        res.status(500).json({ message: err.message, error: err });
      } else {
        res.send(result);
      }
    }
  );
};

export const addNewRegime = function (req, res) {
  lookupLstModel.findOneAndUpdate(
    {},
    { $push: { regime: req.body.newRegime } },
    { new: true, upsert: false },
    function (err, result) {
      if (err) {
        res.status(500).json({ message: err.message, error: err });
      } else {
        res.send(result);
      }
    }
  );
};

export const updateRegime = function (req, res) {
  lookupLstModel.findOneAndUpdate(
    {
      regime: {
        $elemMatch: req.body.regime,
      },
    },
    { $set: { "regime.$": req.body.newRegime } },
    { new: true, upsert: false },
    function (err, doc) {
      if (err) return res.send(500, { error: err });
      return res.send(doc);
    }
  );
};

export let deleteRegime = function (req, res) {
  let reqData = req.body.regimeData;
  let lookupId = req.body._id
  lookupLstModel.updateOne(
    {
      _id: lookupId
    },

    {
      $set: { "regime": reqData },
    },
    {
      new: true,
      upsert: false,
    },
    function (err, result) {
      if (err) {
        return res.status(500).json({ message: err.message, error: err });
      }
      res.send(result);
    }
  );
};

export let deleteCountry = function (req, res) {
  let reqData = req.body.countryRecordData;
  let lookupId = req.body._id
  lookupLstModel.updateOne(
    {
      _id: lookupId
    },
    {
      $set: { "un_country_list": reqData },
    },
    {
      new: true,
      upsert: false,
    },
    function (err, result) {
      if (err) {
        return res.status(500).json({ message: err.message, error: err });
      }
      res.send(result);
    }
  );
};


export let updteEntryStatus = function (req, res) {
  let newEntryStatus = req.body.entryStatus;
  const tmp = new lookupLstModel({
    idType: { Primary: "PRIMARY" },
    idCategory: { Low: "Low" },
    dobType: {
      Exact: "EXACT",
    },
    dobSubset: {
      Full: "FULL",

      Year: "YEAR",
    },
    biometricType: {
      photo: "PHOTO",

      height: "HEIGHT",

      weight: "WEIGHT",
    },

    livingStatus: ["Alive", "Deceased"],
    nameOrgSptType: {
      "First Name": "FIRST_NAME",

      "Second Name": "SECOND_NAME",

      "Third Name": "THIRD_NAME",
    },
    regime: ["Al-Qaida", "CAR", "CdI"],

    un_country_list: {
      record: [
        {
          M49_code: 4,
          ISO_code: "AFG",
          en_Short: "Afghanistan",
          fr_Short: "Afghanistan",
          sp_Short: "Afganistán",
          ru_Short: "Афганистан",
          ch_Short: "阿富汗",
          ar_Short: "أفغانستان",
          UN_Membership: 17125,
          en_Formal: "the Islamic Republic of Afghanistan",
          fr_Formal: "République islamique d'Afghanistan",
          sp_Formal: "República Islámica del Afganistán (la)",
          ru_Formal: "Исламская Республика Афганистан",
          ch_Formal: "阿富汗伊斯兰共和国",
          ar_Formal: "جمهورية أفغانستان الإسلامية",
        },
      ],
    },
    translations: {
      translation: [
        {
          en: "NARRATIVE SUMMARIES OF REASONS FOR LISTING",
          ch: "列名理由简述",
          fr: "Résumé des motifs ayant présidé aux inscriptions sur la liste",
          ar: "موجزات سردية لأسباب إدراج الأسماء في القائمة",
          ru: "Резюме с изложением оснований для включения в перечень",
          sp: "RESÚMENES DE LOS MOTIVOS DE INCLUSIÓN EN LA LISTA",
        },
      ],
    },
    docType1: ["Passport"],
  });
  /*
      tmp.entryStatus.push("ACTIVE");
      tmp.entryType.push("Individual");
      tmp.language.push("EN");
    //  tmp.set(  "Primary", "PRIMARY");
      tmp.save( function(err, result){
          if (err) return console.error(err);
          else
             return res.send(result);

      });
      */

  /*
  lookupLstModel.findOneAndUpdate({}, {
      entryStatus.push(newEntryStatus),
          function(err, docs) {
          if (err) return console.error(err);
          else {
          res.send(JSON.parse(JSON.stringify(docs)));
          logg.info('\n\nthis fires after the post find hook' + newEntryStatus + "\n\n" + JSON.stringify(docs));
          }
      });
} */
};
