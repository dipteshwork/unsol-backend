// const azureJWT = require("azure-jwt-verify");

const azureJWT = require("../utils/azure-jwt-verify")
// const jwt = require("jsonwebtoken");
// const config = require("../config/auth.config.js");

const azureJWTConfig = {
  JWK_URI: process.env.AZURE_JWK_URI,
  ISS: process.env.AZURE_ISS,
  AUD: process.env.AZURE_AUD,
};

// module.exports = (req, res, next) => {
//   try {
//     const jwtToken = req.headers.authorization.split(" ")[1];
//     azureJWT.verify(jwtToken, azureJWTConfig).then(
//       function (decoded) {
//         res.locals.userRole = decoded;
//         next();
//       },
//       function (error) {
//         res.status(401).json({ message: "Auth failed" });
//       }
//     );
//   } catch (error) {
//     res.status(401).json({ message: "Auth failed", error: error });
//   }
// };

// export const verifyToken = (req, res, next) => {
//   let token = req.headers["x-access-token"];

//   if (!token) {
//     return res.status(403).send({ message: "No token provided!" });
//   }

//   jwt.verify(token, config.secret, (err, decoded) => {
//     if (err) {
//       return res.status(401).send({ message: "Unauthorized!" });
//     }
//     // req.email = decoded.email;
//     next();
//   });
// };

export const verifyAzureToken = function (token) {
  return new Promise((resolve, reject) => {
    azureJWT.verify(token, azureJWTConfig).then(
      function (decoded) {
        return resolve(decoded);
      },
      function (err) {
        console.log(err);
        return reject(err);
      }
    );
  });
};
