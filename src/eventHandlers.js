// Alexa SDK for JavaScript v1.0.00
// Copyright (c) 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved. Use is subject to license terms.
'use strict';
var storage = require('./storage'),
    textHelper = require('./apiHandlers'),
    textHelper = require('./textHelper');

var registerEventHandlers = function (eventHandlers, skillContext) {
    eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
        //if user said a one shot command that triggered an intent event,
        //it will start a new session, and then we should avoid speaking too many words.
        skillContext.needMoreHelp = false;
    };

    eventHandlers.onLaunch = function (launchRequest, session, response) {
        //Speak welcome message and ask user questions
        //based on whether there are players or not.
        storage.loadGame(session, function (currentGame) {
            var speechOutput = '',
                reprompt;
                
            //Check if the dynamoDB properties exist, if not, create them:
            if(!currentGame.data.hasOwnProperty('localTheatres')) {
                currentGame.data.theatre = [];
            }
            if(!currentGame.data.hasOwnProperty('theatre')) {
                currentGame.data.theatre = {};
            }
            if(!currentGame.data.theatre.hasOwnProperty('zipCode')) {
                currentGame.data.theatre["zipCode"] = 0;
            }
            if(!currentGame.data.theatre.hasOwnProperty('favoriteTheatre')) {
                currentGame.data.theatre["favoriteTheatre"] = 0;
            }
                
            if (currentGame.data.hasOwnProperty('theatre') && currentGame.data.theatre.hasOwnProperty('zipCode') && currentGame.data.theatre["zipCode"] < 1) {
                speechOutput += 'Welcome to AMC Theatres, Please tell me your zip code.';
                reprompt = "Please tell me your zip code so that I can find showtimes for your local theatres.";
            } else if (currentGame.data.hasOwnProperty('theatre') && currentGame.data.theatre.hasOwnProperty('favoriteTheatre') && currentGame.data.theatre["favoriteTheatre"] < 1) {
                speechOutput += 'Welcome to AMC Theatres, I don\'t have a theatre set as your favorite yet.';
                reprompt = textHelper.completeHelp;
            } else {
                speechOutput += 'Welcome to AMC Theatres. What can I do for you?';
                reprompt = textHelper.nextHelp;
            }
            response.ask(speechOutput, reprompt);
        });
    };
};
exports.register = registerEventHandlers;