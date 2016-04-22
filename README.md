# LogAnalyzer

* Node.js Web application that parses uploaded UNIX based log files
  * these files can then be found or deleted by any or all of these parameters
    * message
    * service
    * file
    * month
    * day
  * once found the files can be downloaded or displayed as a list or as a graph
  * stores log files in a MongoDB database
  * upload and view logs without reloading the page by using jQuery and Ajax
  
###Usage
  * starting the database
  
  ```
  sudo mongodb-osx-x86_64-3.2.4/bin/mongod
  ```
  
  * starting the server
  
  ```
  bin/www
  ```
  
