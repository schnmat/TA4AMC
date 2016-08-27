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
                   
            if (currentTheatre.data.favoriteTheatre.id < 1) {
                speechOutput += 'Welcome to AMC Theatres, please tell me the name of your local AMC theatre so that I can find showtimes, or tell me your location by city and state and I can search for lcoal theatres to use.';
                reprompt = textHelper.completeHelp;
            } else {
                speechOutput += 'Welcome to AMC Theatres. What can I do for you?';
                reprompt = textHelper.nextHelp;
            }
            
            currentTheatre.save(function () { });
            response.ask(speechOutput, reprompt);
        });
    };
};
exports.register = registerEventHandlers;