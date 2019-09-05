const mongo = require('mongodb');
const nconf = require('nconf');
const chalk = require('chalk');
const EventEmitter = require('events');
const zmq = require("zeromq");
const sock = zmq.socket("sub");
const eventHandler = new EventEmitter();
// load config file
nconf.argv().env().file({ file: __dirname + '/config.json' });
const updatePostPageViews = require('./pageviewupdater');

// connect to MongoDB
var dbo = null;
mongo.connect(nconf.get('mongodbURL'), {
    useNewUrlParser: true
}, (err, db) => {
    if (err) {
        console.log(chalk.red(err));
        process.exit(0);
    }
    dbo = db.db('codeforgeek');
    console.log(`${chalk.green('✓')} Connected to ${chalk.green('MongoDB')} database`);
    global.db = dbo;
    eventHandler.emit('ready');
});

eventHandler.on('ready', () => {
    // connect to queue
    sock.connect(nconf.get('socketSubConnection'));
    sock.subscribe(nconf.get('queue'));
    console.log(`${chalk.green('✓')} connected to message queue`);
});

sock.on('message', (topic, message) => {
    console.log(message)
    if(topic.toString() === nconf.get('queue') && message.toString() === 'updatepageview') {
        // start page view update process
        updatePostPageViews();
    }
});

