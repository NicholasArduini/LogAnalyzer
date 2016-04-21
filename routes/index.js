var express = require('express');
var router = express.Router();
var ObjectId = require('mongodb').ObjectID;
var mc = require('mongodb').MongoClient;

var multer = require('multer');
var storage = multer.memoryStorage();
var upload = multer({ storage: storage });

var db, logsCollection

var connectCallback = function(err, returnedDB) {
    if (err) {
        throw err;
    }
    
    db = returnedDB;
    logsCollection = db.collection("logs");
}

mc.connect('mongodb://localhost/syslogs-demo', connectCallback);

router.get('/count', function(req, res) {

    function reportCount(err, count) {
      if (err) {
          res.sendStatus(500);
      } else {
          res.send({count: count});
      }
    }
    
    logsCollection.count({}, reportCount);
});

router.get('/storedFileCount', function(req, res) {

    function reportStoredFiles(err, files) {
      if (err) {
          res.sendStatus(500);
      } else {
          res.send({count: files.length});
      }
    }
    
    logsCollection.distinct("file", reportStoredFiles);
    
});


router.get('/', function(req, res) {
           res.render('index', {title: 'COMP 2406 Log Analysis & Visualization',
                      numFiles: 0,
                      numEntries: 0});
           });


//check if the given argument exists in order to be used
var argExists = function(arg){
    return arg && arg != '';
}

// uses query object to retrieve logs from server
// returns an array of log objects
function getLogs(query, returnQuery, findBool) {
    var logs = [];
    
    var toArrayCallback = function(err, data) {
        
        if(data){
            //add the log objects to an array
            for (var i in data){
                logs[i] = data[i];
            }
        }
        returnQuery(logs);
    }
    
    //query the result
    try {
        var queryObject = {}
        
        //build the query object
        if(query.month != ""){ queryObject.month = {$regex: query.month}; }
        if(query.day != ""){ queryObject.day = {$regex: query.day}; }
        if(query.message != ""){ queryObject.message = {$regex: query.message}; }
        if(query.service != ""){ queryObject.service = {$regex: query.service}; }
        if(query.file != ""){ queryObject.file = {$regex: query.file}; }
        
        //if the user has selected to find the logs return the query
        if(findBool){
            logsCollection.find(queryObject).toArray(toArrayCallback);
        } else { //else remove the query logs
            logsCollection.remove(queryObject);
            returnQuery(logs);
        }
    }
    catch(err) {
        console.error("Error...");
        process.exit(1);
    }
}

//return log entires as a string to be downloaded
function entriesToHTML(theLogs) {
    var returnString = "<p>No Logs Found</p>";
    if(theLogs.length > 0){
      returnString = "<nav><ul>";
      for(i in theLogs){
          if(theLogs[i]){
              returnString += "<p>" + theLogs[i].file + " " + 
              theLogs[i].month + " " + theLogs[i].day + " " + 
              theLogs[i].time + " " + theLogs[i].host + " " + 
              theLogs[i].service + ": " + theLogs[i].message + "</p>";
          }
      }
      returnString += "</ul></nav>";
    }
    
    return returnString;
}

//return log entires as a html string to be show
function entriesToLines(theLogs) {
    var returnString = "";
    for(i in theLogs){
        if(theLogs[i]){
            returnString += theLogs[i].month + " " + theLogs[i].day + " " +
            theLogs[i].time + " " + theLogs[i].host + " " + 
            theLogs[i].service + ": " + theLogs[i].message + "\n";
        }
    }
    
    return returnString;
}

//return the log stats necessary for the data passed to visualize.jade
function analyzeSelected(theLogs) {
    var labelData = {};
    
    var dateCount = {};
    var labels;
    var data = [];
    
    var graphData = {
    labels: [],
    datasets: [
               {
               label: "Log Frequencies",
               fillColor: "rgba(151,187,205,0.5)",
               strokeColor: "rgba(151,187,205,0.8)",
               highlightFill: "rgba(151,187,205,0.75)",
               highlightStroke: "rgba(151,187,205,1)",
               data: []
               }
               ]
    };
    
    theLogs.forEach(function(entry) {
                    var theDate = entry.month + ' ' + entry.day;
                    
                    if (dateCount[theDate]) {
                    dateCount[theDate]++;
                    } else {
                    dateCount[theDate] = 1;
                    }
                    });
    
    labels = Object.keys(dateCount).sort(function(a,b) {
      var aArr = a.split(' ');
      var bArr = b.split(' ');
      var months = {'Jan' : 1, 'Feb' : 2,
                    'Mar' : 3, 'Apr' : 4,
                    'May' : 5, 'Jun' : 6, 
                    'Jul' : 7, 'Aug' : 8,
                    'Sep' : 9, 'Oct' : 10, 
                    'Nov' : 11, 'Dec' : 12
                    }
      if(months[aArr[1]] > months[bArr[1]]){
        return 1;
      } else if(months[aArr[1]] > months[bArr[1]]){
        return -1;
      } else {
        return aArr[1]-bArr[1];
      }
     });
    
    labels.forEach(function(d) {
                   data.push(dateCount[d]);
                   });
    
    graphData.labels = labels;
    graphData.datasets[0].data = data;
    
    return JSON.stringify(graphData);
}

function uploadLog(req, res) {
    var theFile = req.file;
    var filename = theFile.originalname;
    
    if (req.file) {
        var entry = [];
        
        var rawContents = theFile.buffer.toString('utf8');
        var lines = rawContents.split('\n');
        
        //parse entry objects
        for(var i = 0; i < lines.length; ++i){
            if(lines[i] != ""){
                //remove lines where the space between month and date is double
                var lineArray = lines[i].replace("  "," ").split(" ");
                var e = {};
                
                e.file = filename;
                e.month = lineArray[0];
                e.day = lineArray[1];
                e.time = lineArray[2];
                e.host = lineArray[3];
                e.service = lineArray[4].slice(0, -1);
                e.message = lineArray.slice(5).join(" ");
                
                entry[i] = e;
            }
        }
        
        var reportInserted = function(err, result) {
            if (err) {
                throw err;
            }
        }
        
        logsCollection.insert(entry, reportInserted);
        res.json({"Message" : "Upload succeeded"});
        
    } else {
        res.redirect("/error");
        res.json({"Message" : "Upload not succeeded"});
    }
}

function doQuery(req, res) {
    
    var query = { message: req.body.message,
		  service: req.body.service,
		  file: req.body.file,
		  month: req.body.month,
		  day: req.body.day,
    queryType: req.body.queryType,
        fdType: req.body.fdType };
    
    console.log(query);
    
    function returnQuery(theLogs) {
        
        if(query.fdType === 'find'){
            if (query.queryType === 'visualize') {
                res.json(analyzeSelected(theLogs));
            } else if (query.queryType === 'show') {
                res.json(entriesToHTML(theLogs));
            } else if (query.queryType === 'download') {
                res.type('text/plain');
                res.send(entriesToLines(theLogs));
            } else {
                res.json(JSON.stringify(theLogs));
            }
        } else if(query.fdType === 'delete'){
            var deleteMessage = '<p>Logs Deleted</p>';
            
            res.json(deleteMessage);
        }
    }
    
    if(query.fdType === 'find'){
        getLogs(query, returnQuery, true);
    } else if(query.fdType === 'delete'){
        getLogs(query, returnQuery, false);
    }
}

router.post('/doQuery', doQuery);
router.post('/uploadLog', upload.single('theFile'), uploadLog);


module.exports = router;
