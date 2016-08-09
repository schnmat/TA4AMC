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
        tryMultipleRequests: function(requests, apiResponseCallback) {
            //AMC api to fetch information about the theatre and movies.
            var responses = [];
            var completed_requests = 0;
            
            for (var i = 0; i < requests.length; i++) {
                console.log('Making request ' + i + ': ' + requests[i]);
                var requestPath = '/v2/' + requests[i];
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
                            responses.push({ error: textHelper.getErrorMessage(apiResponseObject.errors[0].code), data: null });
                            completed_requests++;
                        } else {
                            responses.push({ error: null, data: apiResponseObject });
                            completed_requests++;
                        }
                    });

                    if (completed_requests == (requests.length - 1)) {
                        /**
                         * Loop through the gathered responses and return the first
                         * response that isn't an error.
                         * Or return the last error if no good responses were found.
                         */
                        var responseSent = false;
                        var sendResponse = { error: textHelper.getErrorMessage(0), data: null };
                        for(var index = 0; index < responses.length; index++) {
                            
                            if(responses[index].error == null) {
                                responseSent = true;
                                sendResponse = responses[index];
                                break;
                            }

                            if(responseSent == false && index == (responses.length - 1)) {
                                sendResponse = responses[index];
                            }
                        }
                        apiResponseCallback(sendResponse.error, sendResponse.data);
                    }
                }).on('error', function (e) {
                    console.log('Communications error: ' + e.message);
                    responses.push({ error: new Error(e.message), data: null });
                    completed_requests++;
                });
            }
        }
    }
})();
module.exports = apiHandlers;