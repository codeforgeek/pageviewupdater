const { google } = require('googleapis')
const nconf = require('nconf');
const updatePostPageViews = require('./models');
const async = require('async');
const scopes = 'https://www.googleapis.com/auth/analytics.readonly'
const jwt = new google.auth.JWT(nconf.get('client_email'), null, nconf.get('private_key'), scopes);
const view_id = nconf.get('view_id');
const zmq = require("zeromq");
const sock = zmq.socket("pub");

// connect to the socket
sock.bindSync(nconf.get('socketPubConnection'));

var queue = async.queue((task, callback) => {
    updatePostPageViews(task, (err, result) => {
        if(err) {
            console.log(err);
        }
        console.log(`updated ${task.slug} with page views ${task.pageviews}`);
        callback();
    });
}, 2);

// assign a callback
queue.drain(() => {
    console.log('all items have been processed');
    sock.send(['system','Page views are updated in the database']);
});

queue.error((err, task) => {
    console.error('task experienced an error');
});

async function getPopularData() {
    const response = await jwt.authorize()
    const result = await google.analytics('v3').data.ga.get({
      'auth': jwt,
      'ids': 'ga:' + view_id,
      'start-date': '1440daysAgo',
      'end-date': 'today',
      'dimensions': 'ga:pagePath',
      'sort': '-ga:pageviews',
      'metrics': 'ga:pageviews'
    });
    let data = result.data.rows;
    if(data.length > 0) {
        // there is some data here
        console.log(`Got around ${data.length} records!`);
        // when scripts runs ,  we need to club the old page views with new page views and update the record
        let pageviewRecords = {};
        for(let index=0; index< data.length; index++) {
            let slug = data[index][0].replace(/[0-9]{4}/,'');
            slug = slug.replace(/[0-9]{2}/,'');
            slug = slug.replace(/\//g,'');
            let pv = null;
            if(pageviewRecords[slug]) {
                pv = pageviewRecords[slug].pageview + parseInt(data[index][1]);
            } else {
                pv = parseInt(data[index][1]);
            }
            pageviewRecords[slug] = {
                pageview: pv
            };
        }
        Object.keys(pageviewRecords).forEach((singlePageViewRecord) => {
            queue.push({
                slug: singlePageViewRecord,
                pageviews: pageviewRecords[singlePageViewRecord].pageview
            });
        });
    }
  }

module.exports = getPopularData;