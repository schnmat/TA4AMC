// Alexa SDK for JavaScript v1.0.00
// Copyright (c) 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved. Use is subject to license terms.
'use strict';
var AWS = require("aws-sdk");

var storage = (function () {
    var dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

    /*
     * The Theatre class stores all theatre states for the user
     */
    function Theatre(session, data) {
        if (data) {
            this.data = data;
        } else {
            this.data = {
                localTheatres: [],
                theatre: {}
            };
        }
        this._session = session;
    }

    Theatre.prototype = {
        isEmptyTheatre: function () {
            //check if any one had non-zero score,
            //it can be used as an indication of whether the theatre has just started
            var allEmpty = true;
            var theatreData = this.data;
            theatreData.localTheatres.forEach(function (theatre) {
                if (theatreData.theatre[theatre] !== 0) {
                    allEmpty = false;
                }
            });
            return allEmpty;
        },
        save: function (callback) {
            //save the theatre states in the session,
            //so next time we can save a read from dynamoDB
            this._session.attributes.currentTheatre = this.data;
            dynamodb.putItem({
                TableName: 'AMCUserData',
                Item: {
                    CustomerId: {
                        S: this._session.user.userId
                    },
                    Data: {
                        S: JSON.stringify(this.data)
                    }
                }
            }, function (err, data) {
                if (err) {
                    console.log(err, err.stack);
                }
                if (callback) {
                    callback();
                }
            });
        }
    };

    return {
        loadTheatre: function (session, callback) {
            if (session.attributes.currentTheatre) {
                console.log('get data from session=' + session.attributes.currentTheatre);
                callback(new Theatre(session, session.attributes.currentTheatre));
                return;
            }
            dynamodb.getItem({
                TableName: 'AMCUserData',
                Key: {
                    CustomerId: {
                        S: session.user.userId
                    }
                }
            }, function (err, data) {
                var currentTheatre;
                if (err) {
                    console.log(err, err.stack);
                    currentTheatre = new Theatre(session);
                    session.attributes.currentTheatre = currentTheatre.data;
                    callback(currentTheatre);
                } else if (data.Item === undefined) {
                    currentTheatre = new Theatre(session);
                    session.attributes.currentTheatre = currentTheatre.data;
                    callback(currentTheatre);
                } else {
                    console.log('get data from dynamodb=' + data.Item.Data.S);
                    currentTheatre = new Theatre(session, JSON.parse(data.Item.Data.S));
                    session.attributes.currentTheatre = currentTheatre.data;
                    callback(currentTheatre);
                }
            });
        },
        newTheatre: function (session) {
            return new Theatre(session);
        }
    };
})();
module.exports = storage;