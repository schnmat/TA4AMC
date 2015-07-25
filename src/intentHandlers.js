// Alexa SDK for JavaScript v1.0.00
// Copyright (c) 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved. Use is subject to license terms.
'use strict';
var textHelper = require('./textHelper'),
    storage = require('./apiHandlers'),
    storage = require('./storage');

var registerIntentHandlers = function (intentHandlers, skillContext) {
    intentHandlers.NewTheatreIntent = function (intent, session, response) {
        //reset scores for all existing players
        storage.loadGame(session, function (currentGame) {
            if (currentGame.data.players.length === 0) {
                response.ask('Welcome to AMC Theatres. What is your zip code?',
                    'Please tell me your zip code so that I can find showtimes in your area.');
                return;
            }
            currentGame.data.theatre["zipCode"] = 0;
            currentGame.data.theatre["favoriteTheatre"] = 0;
            currentGame.save(function () {
                var speechOutput = 'Zip code ' + currentGame.data.theatre["zipCode"] + ' saved.';
                if (skillContext.needMoreHelp) {
                    speechOutput += '. You can tell me your favorite theatre, ask what\'s playing right now, or get showtimes for a movie. What would you like?';
                    response.ask(speechOutput);
                } else {
                    response.tell(speechOutput);
                }
            });
        });
    };

    intentHandlers.AddPlayerIntent = function (intent, session, response) {
        //add a player to the current game,
        //terminate or continue the conversation based on whether the intent
        //is from a one shot command or not.
        var newPlayerName = textHelper.getPlayerName(intent.slots.PlayerName.value);
        if (!newPlayerName) {
            response.ask('OK. Who do you want to add?');
            return;
        }
        storage.loadGame(session, function (currentGame) {
            var speechOutput,
                reprompt;
            if (currentGame.data.scores[newPlayerName] !== undefined) {
                speechOutput = newPlayerName + ' has already joined the game.';
                if (skillContext.needMoreHelp) {
                    response.ask(speechOutput + ' What else?');
                } else {
                    response.tell(speechOutput);
                }
                return;
            }
            speechOutput = newPlayerName + ' has joined your game. ';
            currentGame.data.players.push(newPlayerName);
            currentGame.data.scores[newPlayerName] = 0;
            if (skillContext.needMoreHelp) {
                if (currentGame.data.players.length == 1) {
                    speechOutput += 'You can say, I am Done Adding Players. Now who\'s your next player?';
                    reprompt = textHelper.nextHelp;
                } else {
                    speechOutput += 'Who is your next player?';
                    reprompt = textHelper.nextHelp;
                }
            }
            currentGame.save(function () {
                if (reprompt) {
                    response.ask(speechOutput, reprompt);
                } else {
                    response.tell(speechOutput);
                }
            });
        });
    };

    intentHandlers.SetZipCodeIntent = function (intent, session, response) {
        //give a player points, ask additional question if slot values are missing.
        var zipCode = intent.slots.zipCode.value;
        if (!zipCode) {
            response.ask('sorry, I did not hear your zip code, please say again?');
            return;
        }
        zipCode = parseInt(zipCode);
        if (isNaN(zipCode)) {
            console.log('Invalid zip code = ' + zipCode);
            response.ask('sorry, I did not hear your zip code, please say again?');
            return;
        }
        storage.loadGame(session, function (currentGame) {
            var speechOutput = '';
            currentGame.data.theatre["zipCode"] = zipCode;
            speechOutput += 'Thank you, saving zip code, ' + zipCode + '. ';
            currentGame.save(function () {
                response.tell(speechOutput);
            });
        });
    };

    intentHandlers.GetZipCodeIntent = function (intent, session, response) {
        //tells the scores in the leaderboard and send the result in card.
        storage.loadGame(session, function (currentGame) {
            var speechOutput = '';

            speechOutput += 'I have your zip code saved as ' + currentGame.data.theatre["zipCode"] +'.';
            response.tellWithCard(speechOutput, "AMC Zip Code Request", speechOutput);
        });
    };

    intentHandlers.ResetPlayersIntent = function (intent, session, response) {
        //remove all players
        storage.newGame(session).save(function () {
            response.ask('New game started without players, who do you want to add first?');
        });
    };

    intentHandlers.HelpIntent = function (intent, session, response) {
        var speechOutput = textHelper.completeHelp;
        if (skillContext.needMoreHelp) {
            response.ask(textHelper.completeHelp + ' So, how can I help?');
        } else {
            response.tell(textHelper.completeHelp);
        }
    };

    intentHandlers.ExitIntent = function (intent, session, response) {
        if (skillContext.needMoreHelp) {
            response.tell('Okay.  Whenever you\'re ready, you can start giving points to the players in your game.');
        } else {
            response.tell('');
        }
    };
};
exports.register = registerIntentHandlers;