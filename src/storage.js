// Alexa SDK for JavaScript v1.0.00
// Copyright (c) 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved. Use is subject to license terms.
'use strict';
var AWS = require("aws-sdk");

var storage = (function () {
    var dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

    /*
     * The Theatre class stores all game states for the user
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
        save: function (callback) {
            //save the game states in the session,
            //so next time we can save a read from dynamoDB
            this._session.attributes.currentGame = this.data;
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
        loadGame: function (session, callback) {
            if (session.attributes.currentGame) {
                console.log('get game from session=' + session.attributes.currentGame);
                callback(new Theatre(session, session.attributes.currentGame));
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
                var currentGame;
                if (err) {
                    console.log(err, err.stack);
                    currentGame = new Theatre(session);
                    session.attributes.currentGame = currentGame.data;
                    callback(currentGame);
                } else if (data.Item === undefined) {
                    currentGame = new Theatre(session);
                    session.attributes.currentGame = currentGame.data;
                    callback(currentGame);
                } else {
                    console.log('get game from dynamodb=' + data.Item.Data.S);
                    currentGame = new Theatre(session, JSON.parse(data.Item.Data.S));
                    session.attributes.currentGame = currentGame.data;
                    callback(currentGame);
                }
            });
        },
        newGame: function (session) {
            return new Theatre(session);
        }
    };
})();
module.exports = storage;