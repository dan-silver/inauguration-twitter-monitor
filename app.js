
var express = require('express')
//  , routes = require('./routes')
  , http = require('http')
  , path = require('path')
  , twitter = require('ntwitter')
  , moment = require('moment')
  , config = require('./config');
;
  var app = express();

var NUMBER_OF_SERIES = 2;

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
 /*   var formattedData = [];
    formattedData = graphData;
    for(var i =0;i<formattedData.length;i++) {
        formattedData[i].timestamp = formattedData[i].timestamp*60;
    }*/
    res.render('index', {graphData:graphData}); 
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

t.stream('statuses/filter', {'track':'inauguration'}, function(stream) {
    stream.on('data', function (data) { //tweet=data.text
        tweets[0].push({timestamp: Math.round(new Date().getTime()/1000/60), tweet: data.text});
        
    });
    stream.on('error', function(error, code) {
        console.log("My error: " + error + ": " + code);
    });
});
t.stream('statuses/filter', {'track':'obama'}, function(stream) {
    stream.on('data', function (data) { //tweet=data.text
        tweets[1].push({timestamp: Math.round(new Date().getTime()/1000/60), tweet: data.text});
        
    });
    stream.on('error', function(error, code) {
        console.log("My error: " + error + ": " + code);
    });
});
var tweets = [];
var graphData = [];
for (var i=0;i<NUMBER_OF_SERIES;i++) {
    graphData[i] = [];//[{timestamp, count},{timestamp, count},...]
    tweets[i] = [];
}

setInterval(function() {
    graphData.forEach(function(point, series) {
        for (var i=0;i<tweets[series].length;i++) {
                var found = 0;
                point.forEach(function(data) {
                    if (data.timestamp == tweets[series][i].timestamp) {
                        data.count++;
                        found = 1;
                        console.log('existing match for the same minute! total is ' + data.count);
                    }
                });
                if (found === 0) {
                    point.push({timestamp: tweets[series][i].timestamp, count: 1});
                }
        }
        console.log(tweets[series].length + ' tweets added');
        tweets[series] = [];
    });
    console.log(graphData)
},2000);

