
var express = require('express')
  , http = require('http')
  , path = require('path')
  , twitter = require('ntwitter')
  , config = require('./config');
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

t.stream('statuses/filter', {'track':'obama, inauguration'}, function(stream) {
    stream.on('data', function (data) { //tweet=data.text
        console.log("0:"+data.text);
        tweets.push({timestamp: Math.round(new Date().getTime()/1000/60), tweet: data.text});
    });
    stream.on('error', function(error, code) {
        console.log("My error: " + error + ": " + code);
    });
});

var tweets = [];
var graphData = [];//[{timestamp, count},{timestamp, count},...]

setInterval(function() {
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
     //   console.log(tweets[series].length + ' tweets added');
        tweets = [];
 //   console.log(graphData)
},2000);

