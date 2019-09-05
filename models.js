function updatePostPageViews(data, callback) {
    global.db.collection('posts').update({
        slug: data.slug
    }, {
        $set: {
            pageviews: data.pageviews
        }
    }, (err, result) => {
        if (err) {
            console.log('error updating blog post with page views')
            return callback(true);
        }
        callback(false, 'data updated with latest page views');
    });
}

module.exports = updatePostPageViews;