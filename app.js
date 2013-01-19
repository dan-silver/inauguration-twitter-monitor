var express = require('express')
  , http = require('http')
  , path = require('path')
  , twitter = require('ntwitter')
  , db = require('./db')
  , config = require('./config');
  
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
	consumer_key: config.consumer_key,
	consumer_secret: config.consumer_secret,
	access_token_key: config.access_token_key,
	access_token_secret: config.access_token_secret
});

t.stream('statuses/filter', {'track':'obama, inauguration, barackobama, obamainaugural, Obama2012'}, function(stream) {
    stream.on('data', function (data) { //tweet=data.text
        console.log(data.text);
        tweets.push({timestamp: Math.round(new Date().getTime()/1000/60), tweet: data.text});
    });
    stream.on('error', function(error, code) {
        console.log("My error: " + error + ": " + code);
    });
});

var tweets = []; //[{tweet, timestamp}, ...]
var graphData = []; //[{timestamp, count},{timestamp, count},...]
var cachedDataFromDb = []; //[{timestamp, count},{timestamp, count},...]

setInterval(function() { //Every 10 seconds, add tweets to running count of tweets per minute
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
    if (graphData.length === 0) return;
    db.tweetData.find({where: {timestamp:graphData[0].timestamp}}).success(function(row) {
        if (row) {
            row.tweetCount+=graphData[0].count;
            row.save().success(function() {
                graphData.splice(0,1); //remove element once saved to the db
            });
        } else {
            db.tweetData.create({timestamp: graphData[0].timestamp, tweetCount: graphData[0].count}).success(function() {
                graphData.splice(0,1); //remove element once saved to the db
            });
        }
    });
}, 60*1000); //add new tweets to db every minute


function getData() { //Fetch tweet count data from database
    var dataBuffer = [];
    db.tweetData.findAll({order: 'timestamp ASC'}).success(function(allData) {
        allData.forEach(function(p) {
            dataBuffer.push({timestamp:p.timestamp,count:p.tweetCount});
        });
        cachedDataFromDb = dataBuffer;
    });
}
getData();
setInterval(getData, 60*1000);