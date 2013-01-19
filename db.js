//var mysql = require('mysql'),
    var Sequelize = require("sequelize"),
	sequelize,
	db = {};
if (!process.env.database) {
	var config = require('./config');
	sequelize = new Sequelize(config.database, config.user, config.password, {
		host: config.host,
		port: config.dbPort
	})
} else {
	sequelize = new Sequelize(process.env.database, process.env.user,  process.env.password, {
		host: process.env.host,
		port: process.env.dbPort
	})
}

db.tweetData = sequelize.define('tweetData', {
	timestamp: Sequelize.INTEGER,
	tweetCount: Sequelize.INTEGER
})
db.tweetData.sync();
module.exports = db;