var RSVP = require('rsvp'),
    utils = require('./lib'),
    GoogleSpreadsheet = require("google-spreadsheet"),
    config = require('./config.js'),
    doc = new GoogleSpreadsheet(config['google_spreadsheet_key']),
    process = require('process');

RSVP.hash({
        currentItems: utils.getWishlistFromAmazon(config['amazon_wishlist_id']),
        previousItems: utils.getPreviousWishlist(),
        spreadsheetAuthenticated: utils.authenticateServiceAccount(doc, {
            private_key: config['google_private_key'],
            client_email: config['google_client_email']
        })
    })
    .then(function(wishlist){
        var itemsAdded = utils.getDifference(wishlist.previousItems, wishlist.currentItems);

        console.log(`Found ${itemsAdded.length} new items.`);
        console.log('Row contents to add: ', itemsAdded
          .map(function(item){
            return { image: item.picture, title: item.name, link: item.link };
          } ));

        rowAddPromises = itemsAdded.map(function(rowObj){
            return utils.addRowsToDriveSpreadsheet(doc, 0, {
                Cover: '=IMAGE("' + rowObj.picture + '")',
                Title: '=HYPERLINK("' + rowObj.link + '", "' + rowObj.name + '")'
            });
        });

        rowAddPromises.push(utils.savePreviousWishlist(wishlist.currentItems));

        return RSVP.all(rowAddPromises);
    }, function(err){
        console.log(err);
        process.exit();
    })
    .then(function(){
        console.log('Success adding rows to spreadsheet!');
    }, function(err){
        console.log(err.stack || err.message || err);
        process.exit();
    });
