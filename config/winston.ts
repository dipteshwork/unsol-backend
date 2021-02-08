"use strict";
import { createLogger, format, transports } from "winston";
import fs from "fs";
import path from "path";

export let env = process.env.NODE_ENV || "development";
export let logDir = `${__dirname}/../logs`;

// Create the log directory if it does not exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

export let filename = path.join(logDir, "results.log");

export let logg = createLogger({
  // change level if in dev environment versus production
  level: env === "development" ? "debug" : "info",

  format: format.combine(
    format.json(),
    format.splat(),
    format.simple(),

    format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
  ),
  transports: [
    new transports.Console({
      level: "info",
      format: format.combine(
        format.colorize(),
        format.printf(
          (info) => `${info.timestamp} ${info.level}: ${info.message}`
        )
      ),
    }),
    new transports.File({ filename }),
  ],
});
