// https://medium.freecodecamp.org/node-js-child-processes-everything-you-need-to-know-e69498fe970a
// http://4dev.tech/2016/02/how-to-execute-a-jar-file-with-node-js-child-processes/
// var exec = require('child_process').exec;
var http = require('http');
var fs = require('fs');
var spawn = require('child_process').spawn;
var stream = require('stream');
// var spawn = require('child_process');
import {logg} from  './config/winston';
const { fork } = require('child_process');
//const forked = fork('child.js');
// https://stackoverflow.com/questions/44986830/nodejs-script-with-child-process-spawn-on-windows-why-i-need-shell-true-for

// read from property/configuartion file
// module.exports = childProcess;

export let downloadFile =   function(req, res){ // think about how to pass in various parameters 
  let consolJar = process.env.USERPROFILE + process.env.CONSOLIDATED_JAR_LOCATION;
  let consolXMLLoc = process.env.USERPROFILE + process.env.CONSOLIDATED_XML_DESTINATION
  logg.info('the env var for jar is %s',consolJar);  
  logg.info('the env var for xml location  is %s',consolXMLLoc); //  111144 111107
  logg.info('the query ids is %o', req.query.ids);
  logg.info('the state is %s', req.query.state);
  logg.info('the lang is %s', req.query.lang)
  logg.info('the state %s', req.query.state);
  let ids = req.query.ids;
  let state = req.query.state;  
  let lang = req.query.lang;
  let childProcArr = [];
  childProcArr.push(consolJar);

  if (ids != null && ids !== undefined)
  {
    childProcArr.push('false'); // if ids are passed in, then this is NOT A consolidated rpt being requested
    childProcArr.push(parseInt(state));
    childProcArr.push(lang);
    let idArr = ids.split(',');
    idArr.forEach(function(idAr){ // [consolJar, 'false', '3', '6908611', '111144']
      logg.info('the idAr is %s', idAr);
      childProcArr.push(parseInt(idAr));
    })
  } else{
    logg.info('No ids, so we are retrieving a consolidated report');
    childProcArr.push('true');  // this is a request for a consolidated report
    childProcArr.push(parseInt(state));
    childProcArr.push(lang);
  }
  
 
  logg.info('the array has %o', childProcArr );

  // need to push things into the array based on request parameters
  // http://localhost:3000/api/downloadFile?state=3&lang=EN // for consolidated
  // http://localhost:3000/api/downloadFile?state=3&lang=EN&ids=6908611,111144  // for regualr download
    
   //   let childProcess = spawn('java -jar ', childProcArr ,{shell: true, stdio: 'inherit'})
  let childProcess = spawn('java -jar ', childProcArr, {shell: true,  stdio: 'pipe'});
  let tmpRef = '';
   
    childProcess.stdout.on('data', function (data) {  
      //  process.stdout.write(data.toString());
      // process.stdout.write(childProcess.stdout);
      tmpRef += data.toString();
      logg.info('should execute ONLU after the spawn is finished.');
    });
      
    childProcess.on('close', function (code) {  
      logg.info('lets see the data %o', tmpRef);
      
      var fileContents = Buffer.from(tmpRef);  //defaults to UTF-8
      // var fileContents = Buffer.from(tmpRef, "base64"); 
      var readStream = new stream.PassThrough();
      readStream.end(fileContents);
      let filenm = 'download.xml';
      if(!ids)
        filenm = 'consolidatedRpt.xml';
      res.set('Content-disposition', 'attachment; filename=' + filenm);
      res.set('Content-Type', 'text/plain');
      readStream.pipe(res);
    });

 
};

