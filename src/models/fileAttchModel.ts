import mongoose = require("mongoose");
import fileSchema from "../schemas/fileAttchSchema";

const FileAttchModel = mongoose.model(
  "FileAttchModel",
  fileSchema,
  "FileAttchmnt"
);
export default FileAttchModel;
