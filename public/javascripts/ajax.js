$(function () {
  var updateBtn = $("#update");
  var outputType = $("#queryType");
  var findOrDelete = $("#fdType");
  var uploadBtn = $("#uploadForm");
  var submitUploadBtn = $("#submitUpload");
  var uploadBtn = $("#uploadBtn");
  
  //queries
  var messageQ = $("#message");
  var serviceQ = $("#service");
  var fileQ = $("#file");
  var monthQ = $("#month");
  var dayQ = $("#day");
  
  //stats for num of entires and num of log files
  var numEntries = 0;
  var numFiles = 0;
  var stats = $("#stats");

  var canvas = $("#canvas");

  var freqMax = $("#freqMax");
  var myBarChart;

  var data = {
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
  
  function updateStatsText() {
    stats.html("Currently we have " + numEntries + " log entries in " +
         numFiles + " log files.");
  }

  function updateStats() {
    var numUpdated = 0;
    
    $.getJSON("/count", function(v) {
        numEntries = v.count;
        numUpdated++;
        if (numUpdated >=2) {
          updateStatsText();
        }
    });
    $.getJSON("/storedFileCount", function(v) {
        numFiles = v.count;
        numUpdated++;
        if (numUpdated >=2) {
          updateStatsText();
        }
    });
  }
      
  updateStats();

  function showLogs(data){
      canvas.empty();
      canvas.html(data);
  }

  function visualizeLogs(data){
      var logs = $.parseJSON(data);
      if(logs.labels.length > 0){
        canvas.empty();
        var graph = $('<canvas/>', {
                      'class': 'chart',
                      id: 'graph'
                      }).prop({
                              width: 600,
                              height: 500
                              });
        
        canvas.html(graph);
        var ctx = $("#graph").get(0).getContext("2d");
        
        if (myBarChart) {
            myBarChart.destroy();
        }
        
        myBarChart = new Chart(ctx).Bar(logs, {});
      } else {
         showLogs("<p>No Logs Found</p>");
      }
  }

  function downloadLogs(data){
    if(data.length > 0){
      saveAs(new Blob([data], {type: "text/plain;charset=utf-8"}), "selected.log");
    } else {
      showLogs("<p>No Logs Found</p>");
    }
  }

  function getQuery() {
    updateStats();
    var query = { message: messageQ.val(),
                  service: serviceQ.val(),
                  file: fileQ.val(),
                  month: monthQ.val(),
                  day: dayQ.val(),
                  queryType: outputType.val(),
                  fdType: findOrDelete.val()};
      
      if(query.fdType === 'find'){
          if (query.queryType === 'visualize') {
              $.post("/doQuery", query)
              .done(function(data){
                    visualizeLogs(data);
                    })
          } else if (query.queryType === 'show') {
              $.post("/doQuery", query)
              .done(function(data){
                    showLogs(data);
                    })
          } else if (query.queryType === 'download') {
              $.post("/doQuery", query)
              .done(function(data) {
                    downloadLogs(data);
                    })
          }
      } else {
          $.post("/doQuery", query)
          .done(function(data){
            updateStats();
            showLogs(data);
          })
      }
  }
  
  uploadBtn.uploadFile({
                       url:"/uploadLog",
                       fileName:"theFile",
                       dragDrop: false,
                       uploadStr: "Upload Logs",
                       afterUploadAll: updateStats
                       });

  updateBtn.click(getQuery);
});
