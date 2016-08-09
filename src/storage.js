// Alexa SDK for JavaScript v1.0.00
// Copyright (c) 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved. Use is subject to license terms.
'use strict';
var AWS = require("aws-sdk"),
    helperUtil = require('./helperFunctions');

var storage = (function () {
    var dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

    /*
     * The Theatre class stores all theatre states for the user
     */
    function Theatre(session, data) {
        if (data) {
            helperUtil.checkSessionVariables(data); // Verify all properties exist
            this.data = data;
        } else {
            this.data = {
                localTheatres: new Array(),
                location: { 'zipCode': 0,
                            'city': '',
                            'state': '',
                            'utcOffset': '-5.00' },
                favoriteTheatre: { 'id': 0,
                                   'name': '' }
            };
        }
        this._session = session;
    }

    Theatre.prototype = {
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
                console.log('get theatre from session=' + session.attributes.currentTheatre);
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
                    console.log('get Theatre from dynamodb=' + data.Item.Data.S);
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