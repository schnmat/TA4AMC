// Alexa SDK for JavaScript v1.0.00
// Copyright (c) 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved. Use is subject to license terms.
'use strict';
var storage = require('./storage'),
    helperFunctions = require('./helperFunctions'),
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
        storage.loadTheatre(session, function (currentTheatre) {
            var speechOutput = '',
                reprompt;
                            
            if (currentTheatre.data.location.zipCode < 1) {
                speechOutput += 'Welcome to AMC Theatres, Please tell me your location.';
                reprompt = 'Please tell me your location, either by city and state, or by zip code, so that I can find showtimes in your local theatre.';
            } else if (currentTheatre.data.favoriteTheatre.id < 1) {
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