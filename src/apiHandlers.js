/*
 * Uses the AMC API, documented: http://developers.amctheatres.com/GettingStarted/Authentication
 */
'use strict';
var https = require('https'),
    textHelper = require('./textHelper');

var apiHandlers = (function () {
    return {
        makeRequest: function(request, apiResponseCallback) {
            //AMC api to fetch information about the theatre and movies.
            var requestPath = '/v2/' + request;
            var options = {
              host: 'api.amctheatres.com',
              path: requestPath,
              headers: { 'X-AMC-Vendor-Key': '[YOUR API KEY HERE]' },
              agent: false
            };
            
            https.get(options, function (res) {
                var apiResponseString = '';
        
                res.on('data', function (data) {
                    apiResponseString += data;
                });
        
                res.on('end', function () {
                    var apiResponseObject = JSON.parse(apiResponseString);
        
                    if (apiResponseObject.errors) {
                        console.log('AMC API error: (' + apiResponseObject.errors[0].code + ') ' + apiResponseObject.errors[0].exceptionMessage);
                        apiResponseCallback(textHelper.getErrorMessage(apiResponseObject.errors[0].code));
                    } else {
                        apiResponseCallback(null, apiResponseObject);
                    }
                });
            }).on('error', function (e) {
                console.log('Communications error: ' + e.message);
                apiResponseCallback(new Error(e.message));
            });
        },
        fetchLocation: function(request, apiResponseCallback) {
            //Google Maps api to get the city and state from a zip code.
            var requestPath = '/maps/api/geocode/json?' + request;
            var options = {
              host: 'maps.googleapis.com',
              path: requestPath,
              agent: false
            };
            
            https.get(options, function (res) {
                var apiResponseString = '';
        
                res.on('data', function (data) {
                    apiResponseString += data;
                });
        
                res.on('end', function () {
                    var apiResponseObject = JSON.parse(apiResponseString);
        
                    if (apiResponseObject.error_message) {
                        console.log('Google Maps API error: ' + apiResponseObject.error_message);
                        apiResponseCallback(textHelper.errors.googleAPIUnavailable);
                    } else {
                        apiResponseCallback(null, apiResponseObject);
                    }
                });
            }).on('error', function (e) {
                console.log('Communications error: ' + e.message);
                apiResponseCallback(new Error(e.message));
            });
        }
    }
})();
module.exports = apiHandlers;