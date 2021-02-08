import { logg } from "./config/winston";
import appRouter from "./src/routes/routes";
import securityRouter from "./src/routes/api/index";

const dotenv: any = require("dotenv").config({ path: __dirname + "/.env" });
const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");

let app = express();
let bodyParser = require("body-parser");
let session = require("express-session");

let originsWhitelist = [
  process.env.URL_LOCAL_FRONT,
  process.env.URL_PRODUCTION_FRONT,
];
let corsOptions = {
  origin: function (origin, callback) {
    let isWhitelisted = originsWhitelist.indexOf(origin) !== -1;
    callback(null, isWhitelisted);
  },
  credentials: true,
};

app.use(cors(corsOptions));

// parse application/json
app.use(bodyParser.json({ useNewUrlParser: true }));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true, useNewUrlParser: true }));

app.use(
  session({
    secret: "passport-tutorial",
    cookie: { maxAge: 60000 },
    resave: false,
    saveUninitialized: false,
  })
);

// "mongodb://127.0.0.1:27017,127.0.0.1:27018,127.0.0.1:27019/testdb?replicaSet=rs";
let tmpURI = process.env.MONGO_URI; 
(async () => {
  const conn = await mongoose.connect(tmpURI, {
    useNewUrlParser: true,
    useFindAndModify: false,
    useCreateIndex: true,
    useUnifiedTopology: true,
  });
  // const conn = await mongoose.connect(tmpURI, { replicaSet: 'rs' });

  app.use("/common", appRouter);
  app.use("/user", securityRouter);

  app.listen(process.env.NODE_PORT, function () {
    logg.info("Examples app listenings on port %s", process.env.NODE_PORT);
  });
})();
