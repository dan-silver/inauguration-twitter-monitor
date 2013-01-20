var express = require('express')
  , http = require('http')
  , path = require('path')
  , twitter = require('ntwitter')
  , db = require('./db')
  , request = require('request');

if (!process.env.database) {
    var config = require('./config');
}
  
  var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(require('stylus').middleware(__dirname + '/public'));
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', function(req,res) {
    res.render('index', {graphData:cachedDataFromDb}); 
});

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

var t = new twitter({
	consumer_key: process.env.consumer_key || config.consumer_key,
	consumer_secret: process.env.consumer_secret || config.consumer_secret,
	access_token_key: process.env.access_token_key || config.access_token_key,
	access_token_secret: process.env.access_token_secret || config.access_token_secret
});

t.stream('statuses/filter', {track:'obama, inauguration, barackobama, obamainaugural, Obama2012', stall_warnings: true}, function(stream) {
    stream.on('data', function (data) { //tweet=data.text
        if (data.warning) {
            console.log(data.warning);
        } else {
            tweets.push({timestamp: Math.round(new Date().getTime()/1000/60)});
        }
    });
    stream.on('error', function(error, code) {
        console.log("My error: " + error + ": " + code);
    });
});

var tweets = []; //[{tweet, timestamp}, ...]
var graphData = []; //[{timestamp, count},{timestamp, count},...]
var cachedDataFromDb = []; //[{timestamp, count},{timestamp, count},...]

setInterval(function() { //Every 10 seconds update the count of tweets per minute
    for (var i=0;i<tweets.length;i++) {
            var found = 0;
            graphData.forEach(function(data) {
                if (data.timestamp == tweets[i].timestamp) {
                    data.count++;
                    found = 1;
                }
            });
            if (found === 0) {
                graphData.push({timestamp: tweets[i].timestamp, count: 1});
            }
    }
    tweets = [];
},10*1000);

setInterval(function() {
    for (var i=0;i<graphData.length;i++) {
        updateDatabase(graphData[i].timestamp, graphData[i].count, i);
    }
}, 30*1000); //add new tweets to db every 30 seconds

function updateDatabase(timestamp, count, i) {
    db.tweetData.find({where: {timestamp: timestamp}}).success(function(row) {
        if (row) {
            row.tweetCount+=count;
            row.save().success(function() {
                graphData.splice(i,1); //remove element once saved to the db
            });
        } else {
            db.tweetData.create({timestamp: graphData[i].timestamp, tweetCount: graphData[i].count}).success(function() {
                graphData.splice(i,1); //remove element once saved to the db
            });
        }
    });
}
var cachedDataFromDb = [];
function getData() { //Fetch tweet count data from database
    var dataBuffer = [];
    db.tweetData.findAll({order: 'timestamp ASC', where: ["timestamp > ?", Math.round(new Date().getTime()/1000/60)-60*2]}).success(function(allData) {
        allData.forEach(function(p) {
            dataBuffer.push({timestamp:p.timestamp,count:p.tweetCount});
        });
        dataBuffer.splice(dataBuffer.length-1,2); //remove the recent minutes since they're still being populated with tweets
        cachedDataFromDb = dataBuffer;
    });
}
getData();
setInterval(getData, 60*1000);

//keep the app alive!
setInterval(function() {
    request('http://twitter-inauguration-monitor.herokuapp.com/', function (error, response, body) {
      if (!error && response.statusCode == 200) {
        console.log(body) // Print the google web page.
      }
    })
}, 1000*60*10);