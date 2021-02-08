import RolesModel from "../models/rolesModel";
import UsersModel from "../models/usersModel";
import NotiEmailModel from "../models/notiEmailModel";
import ReceiverModel from "../models/receiverModel";
import { verifyAzureToken } from "../middleware/check-auth";

export const getJWTToken = function (req, res) {
  const { email, token } = req.body;

  verifyAzureToken(token).then(decoded => {
    res.send(decoded);
  }).catch(err => {
    res.status(400).json({ message: err.message, error: err });
  });
};

// Roles
export const retrieveRoles = function (req, res) {
  let filterValue = req.params["filterValue"];
  RolesModel.findOne({}, { _id: 0, __v: 0 }, function (err, doc) {
    if (err) {
      res.status(400).json({ message: err.message, error: err });
    } else {
      doc = JSON.parse(JSON.stringify(doc));
      let roles = doc.roles;
      if (filterValue) {
        roles = roles.filter(
          (item) =>
            (item.roleName.toLowerCase().indexOf(filterValue) > -1) ||
            (item.roleDescription.toLowerCase().indexOf(filterValue) > -1)
        );
      }
      res.send(roles);
    }
  });
};

export const retrieveRole = function (req, res) {
  let roleNm = "AdministratorAssistant";

  RolesModel.find({ "roles.roleName": roleNm }, { _id: 0, __v: 0 }, function (
    err,
    docs
  ) {
    if (err) {
      res.status(400).json({ message: err.message, error: err });
    } else {
      res.send(JSON.parse(JSON.stringify(docs)));
    }
  });
};

export const insertRole = function (req, res) {
  RolesModel.findOneAndUpdate(
    {},
    {
      $push: {
        roles: req.body,
      },
    },
    { new: true, upsert: true },

    function (err, result) {
      if (err) {
        res.status(400).json({ message: err.message, error: err });
      }
      {
        res.send(result.roles);
      }
    }
  );
};

export const updateRole = async function (req, res) {
  let oldRowNm = req.body.oldRowData.rowData.roleName;
  let newRowData = req.body.modifiedRowData;
  let rolesArr = (await RolesModel.find())[0]["roles"];

  const roleWeightArr = rolesArr.map((roleItem) => {
    return roleItem.roleWeight;
  });
  const duplicateArr = roleWeightArr.filter(
    (role) => role == newRowData.roleWeight
  );

  if (duplicateArr.length > 0) {
    res.status(400).json({ message: "Weight is already exist." });
  } else {
    RolesModel.findOneAndUpdate(
      { "roles.roleName": oldRowNm },
      {
        $set: {
          "roles.$.roleName": newRowData.roleNm,
          "roles.$.roleDescription": newRowData.roleDescr,
          "roles.$.roleWeight": newRowData.roleWeight,
        },
      },
      { new: true },
      function (err, doc) {
        if (err) {
          res.status(400).json({ message: err.message, error: err });
        } else {
          res.send(doc.roles);
        }
      }
    );
  }
};

export const deleteRole = async function (req, res) {
  let rolesArr = (await RolesModel.find())[0]["roles"];
  const newRoles = rolesArr.filter(role => role.roleName !== req.body.name)

  RolesModel.findOneAndUpdate(
      {},
      {
        $set: {
          roles: newRoles,
        },
      },
      { new: true },

      function (err, result) {
        if (err) {
          res.status(400).json({ message: err.message, error: err });
        }
        {
          res.send(result.roles);
        }
      }
  );
};


// NotificationEmail
export const retrieveNotificationEmail = function (req, res) {
  let filterValue = req.params["filterValue"];
  NotiEmailModel.find({}, { _id: 0, __v: 0 }, function (err, docs) {
    if (err) {
      res.status(400).json({ message: err.message, error: err });
    } else {
      docs = JSON.parse(JSON.stringify(docs));
      if (filterValue) {
        docs = docs.filter(
          (item) => (item.emailType.toLowerCase().indexOf(filterValue) > -1) ||
            (item.emailTitle.toLowerCase().indexOf(filterValue) > -1) ||
            (item.emailDescription.toLowerCase().indexOf(filterValue) > -1)
        )
      }
      res.send(docs);
    }
  });
};

export const insertNotificationEmail = async function (req, res) {
  let notiEmail = new NotiEmailModel({
    emailType: req.body.emailType,
    emailTitle: req.body.emailTitle,
    emailDescription: req.body.emailDescription,
  });
  let result = await notiEmail.save();
  res.send(result);
};

export const deleteNotificationEmail = async function (req, res) {
  NotiEmailModel.findOneAndDelete(
      { emailTitle: req.body.emailTitle },
      function (err, result) {
        if (err) {
          res.status(400).json({ message: err.message, error: err });
        } else {
          res.send(result);
        }
      }
  );
};

export const updateNotificationEmail = async function (req, res) {
  let origUserEmailType = req.body.oldRowData.rowData.emailType;
  NotiEmailModel.collection.findAndModify(
    { emailType: origUserEmailType },
    [],
    {
      $set: {
        emailTitle: req.body.emailTitle,
        emailDescription: req.body.emailDescription,
      },
    },
    { new: true },
    function (err, docs) {
      if (err) {
        res.status(400).json({ message: err.message, error: err });
      } else {
        res.send(JSON.parse(JSON.stringify(docs)));
      }
    }
  );
};

export const retrieveNotificationReceivers = function (req, res) {
  let filterValue = req.params["filterValue"];
  let matchRef = {};
  if (filterValue) {
    matchRef = {
      $or: [
        {roles: {$regex: new RegExp(filterValue, 'i')}},
        {userEmail: {$regex: new RegExp(filterValue, 'i')}},
        {userName: {$regex: new RegExp(filterValue, 'i')}},
        {langs: {$regex: new RegExp(filterValue, 'i')}},
        {regimes: {$regex: new RegExp(filterValue, 'i')}}
      ]
    }
  };
  let qrydoc = [
    {
      $match: matchRef
    },
  ];
  ReceiverModel.aggregate(qrydoc, function (err, docs) {
    if (err) {
      res.status(400).json({message: err.message, error: err});
    } else {
      res.send(docs);
    }
  });
};

export const insertNotificationReceiver = async function (req, res) {
  let receiver = new ReceiverModel({
    roles: req.body.roles,
    userEmail: req.body.userEmail,
    userName: req.body.userName,
    langs: req.body.langs,
    regimes: req.body.regimes,
  });

  let result = await receiver.save();
  res.send(result);
};

export const deleteNotificationReceiver = async function (req, res) {
  ReceiverModel.findOneAndDelete(
      { userEmail: req.body.userEmail },
      function (err, result) {
        if (err) {
          res.status(400).json({ message: err.message, error: err });
        } else {
          res.send(result);
        }
      }
  );
};


export const updateNotificationReceiver = async function (req, res) {
  const newReceiver = req.body;

  ReceiverModel.findOneAndUpdate(
    { userEmail: newReceiver.userEmail },
    {
      $set: {
        roles: newReceiver.roles,
        langs: newReceiver.langs,
        regimes: newReceiver.regimes,
      },
    },
    { new: true, upsert: true },
    function (err, result) {
      if (err) {
        res.status(400).json({ message: err.message, error: err });
      } else {
        res.send(result);
      }
    }
  );
};

export const loginAuthentication = function (req, res) {};

// Users
export const lookupUser = function (req, res) {
  UsersModel.find(
    { userEmail: req.body.userEmail },
    { _id: 0, __v: 0 },
    function (err, docs) {
      if (err) {
        res.status(400).json({ message: err.message, error: err });
      } else {
        if (docs == null || docs.length == 0) {
          res.send([
            { resultErr: "User not found in the Authorization database" },
          ]);
        } else {
          res.send(docs);
        }
      }
    }
  );
};

export const retrieveUsers = function (req, res) {
  let filterValue = req.params["filterValue"];
  let matchRef = {};
  if (filterValue) {
    matchRef = {
      $or: [
        {userEmail: {$regex: new RegExp(filterValue, 'i')}},
        {roles: {$regex: new RegExp(filterValue, 'i')}}
      ]
    }
  };
  let qrydoc = [
    {
      $match: matchRef
    },
  ];
  UsersModel.aggregate(qrydoc, function (err, docs) {
    if (err) {
      res.status(400).json({message: err.message, error: err});
    } else {
      res.send(docs);
    }
  });
};

// here we need to get the user and associated role for Authorization
export const retrieveUser = function (userEmail) {
  return new Promise((resolve, reject) => {
    UsersModel.find({ userEmail: userEmail }, { _id: 0, __v: 0 }, function (
      err,
      docs
    ) {
      if (err) {
        reject(err);
      } else {
        resolve(JSON.parse(JSON.stringify(docs)));
      }
    });
  });
};

export const insertUser = async function (req, res) {
  let user = new UsersModel({
    userEmail: req.body.userEmail,
    userName: req.body.userName,
    preferLanguage: req.body.preferLanguage,
    langs: req.body.langs,
    roles: req.body.roles,
    isActive: req.body.isActive,
    activationHistory: {
      isActive: req.body.isActive,
      userUpdatedOn: new Date(),
    },
  });
  let result = await user.save();
  res.send(result);
};

export const updateUser = function (req, res) {
  let origUserEmail = req.body.oldRowData.rowData.userEmail;
  let isActive = req.body.isActive;

  UsersModel.findOneAndUpdate(
    { userEmail: origUserEmail },
    {
      $set: {
        roles: req.body.roles,
        userEmail: req.body.userEmail,
        preferLanguage: req.body.preferLanguage,
        langs: req.body.langs,
        isActive: isActive
      },
      $push: {
        activationHistory: {
          $each: [{ isActive: isActive, userUpdatedOn: new Date() }],
          $position: 0,
        },
      },
    },
    { new: true, upsert: true },
    function (err, result) {
      if (err) {
        res.status(400).json({ message: err.message, error: err });
      } else {
        res.send(result);
      }
    }
  );
};

export const deleteUser = function (req, res) {
  UsersModel.findOneAndDelete(
    { userEmail: req.body.userEmail },
    function (err, result) {
      if (err) {
        res.status(400).json({ message: err.message, error: err });
      } else {
        res.send(result);
      }
    }
  );
};
