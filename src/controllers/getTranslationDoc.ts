var path = require("path");
var mime = require("mime");
var fs = require("fs");

export let downloadFile = function (req, res) {
  var file = path.join(__dirname + "/../static/TranslatedTemplate.docx"); //  '../src/static/TranslatedTemplate.docx';// path.join(__dirname, '../src/static/TranslatedTemplate.docx');

  var filename = path.basename(file);
  var mimetype = mime.lookup(file);

  res.setHeader("Content-disposition", "attachment; filename=" + filename);
  res.setHeader("Content-type", mimetype);

  var filestream = fs.createReadStream(file);
  filestream.pipe(res);
};
