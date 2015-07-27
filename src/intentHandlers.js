// Alexa SDK for JavaScript v1.0.00
// Copyright (c) 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved. Use is subject to license terms.
'use strict';
var textHelper = require('./textHelper'),
    helperFunctions = require('./helperFunctions'),
    api = require('./apiHandlers'),
    storage = require('./storage');

var registerIntentHandlers = function (intentHandlers, skillContext) {
    intentHandlers.NewTheatreIntent = function (intent, session, response) {
        //reset scores for all existing players
        storage.loadTheatre(session, function (currentTheatre) {
            if (currentTheatre.data.players.length === 0) {
                response.ask('Welcome to AMC Theatres. What is your zip code?',
                    'Please tell me your zip code so that I can find showtimes in your area.');
                return;
            }
            
            helperFunctions.checkSessionVariables;
            
            currentTheatre.save(function () {
                var speechOutput = 'Zip code ' + currentTheatre.data.location.zipCode + ' saved.';
                if (skillContext.needMoreHelp) {
                    speechOutput += '. You can tell me your favorite theatre, ask what\'s playing right now, or get showtimes for a movie. What would you like?';
                    response.ask(speechOutput);
                } else {
                    response.tell(speechOutput);
                }
            });
        });
    };

    intentHandlers.SetZipCodeIntent = function (intent, session, response) {
        //give a player points, ask additional question if slot values are missing.
        var zipCode = intent.slots.zipCode.value;
        var speechOutput = '';
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
 
        storage.loadTheatre(session, function (currentTheatre) {
            helperFunctions.checkSessionVariables(currentTheatre);
            
            currentTheatre.data.location.zipCode = zipCode;
            speechOutput += 'Thank you, saving zip code, ' + zipCode + '. ';

            api.fetchLocation('address=' + zipCode, function apiResponseCallback(err, apiResponse) {
                if (err) {
                    speechOutput = 'Sorry, the Google Maps API service is experiencing a problem. Please try again later.';
                } else {
                    var city = apiResponse.results[0].address_components[1].long_name,
                        state = apiResponse.results[0].address_components[2].long_name;
                        //speechOutput += ' - ' + 'state=' + state.replace(' ', '-') + '&city=' + city.replace(' ', '-');
                    currentTheatre.data.location.city = city;
                    currentTheatre.data.location.state= state;
                }
                
                //Note: City and State needs to have spaces replaced with dashes.
                api.makeRequest('theatres?state=' + state.replace(' ', '-') + '&city=' + city.replace(' ', '-'), function apiResponseCallback(err, apiResponse) {
                    if (err) {
                        speechOutput = 'Sorry, the AMC API service is experiencing a problem. Please try again later.';
                    } else {
                        var theatres = apiResponse._embedded.theatres;
                        //speechOutput += ' - ' + apiResponse._embedded.theatres[0].name + ' - ';

                        currentTheatre.data.localTheatres = [];
                        
                        if(theatres.length < 1) {
                            speechOutput += 'Unfortunately it doesn\'t look like there are any AMC theatres in your city. If the theatre that you visit is in another city, please set your zip code to that city.';
                        } else {
                            theatres.forEach(function(element) {
                                currentTheatre.data.localTheatres.push({'id': element.id, 'name': element.name});                          
                            }, this);
                            if(theatres.length === 1) {
                                currentTheatre.data.favoriteTheatre = {'id': currentTheatre.data.localTheatres[0].id, 'name': currentTheatre.data.localTheatres[0].name};
                                speechOutput += 'I found one theatre in your city. ' + currentTheatre.data.localTheatres[0].name + '. ';
                            } else {
                                speechOutput += 'Here are the theatres I found in your city. ';
                                for(var i = 0, l = currentTheatre.data.localTheatres.length; i < l; i++) {
                                    if(i == (l - 1)) {
                                        speechOutput += 'and ' + currentTheatre.data.localTheatres[i].name + '. ';
                                    } else {
                                        speechOutput += currentTheatre.data.localTheatres[i].name + ', ';
                                    }
                                }
                            }
                        }
                    }
                    
                    currentTheatre.save(function () {
                        response.tellWithCard(speechOutput, 'AMC Zip Code Request', speechOutput);
                    });
                });
            });
        });
    };

    intentHandlers.SetFavoriteTheatreIntent = function (intent, session, response) {
        //give a player points, ask additional question if slot values are missing.
        var favoriteTheatre = intent.slots.favoriteTheatre.value;
        if (!favoriteTheatre) {
            response.ask('sorry, I did not hear you say a theatre, please say again?');
            return;
        }

        helperFunctions.checkSessionVariables;

        storage.loadTheatre(session, function (currentTheatre) {
            var speechOutput = '';
            currentTheatre.data.localTheatres.forEach(function(element) {
                if(element.name.toLowerCase() == favoriteTheatre.toLowerCase()) {
                    currentTheatre.data.favoriteTheatre.id = element.id;
                    currentTheatre.data.favoriteTheatre.name = element.name;            
                    speechOutput += 'Thank you, saving your favorit theatre, ' + element.name + '. ';
                }
            }, this);

            currentTheatre.save(function () {
                response.tell(speechOutput);
            });
        });
    };

    intentHandlers.GetZipCodeIntent = function (intent, session, response) {
        //tells the scores in the leaderboard and send the result in card.
        storage.loadTheatre(session, function (currentTheatre) {
            var speechOutput = '';

            speechOutput += 'The zip code that I have saved is, ' + currentTheatre.data.location.zipCode +'.';
            response.tellWithCard(speechOutput, 'AMC Zip Code Request', speechOutput);
        });
    };

    intentHandlers.GetMovieShowtimesIntent = function (intent, session, response) {
        var speechOutput;
        var movieNameSlot = intent.slots.movieName;
        
        // slots can be missing, or slots can be provided but with empty value.
        // must test for both.
        if (!movieNameSlot || !movieNameSlot.value) {
            speechOutput = 'I\'m sorry, I don\'t think I heard you correctly. What movie where you looking for?';
            var repromptText = 'What was that movie again?';
            response.ask(speechOutput, repromptText);
            return;
        } else {
            session.attributes.movieName = movieNameSlot.value;
            api.makeRequest('movies?name=' + session.attributes.movieName, function apiResponseCallback(err, apiResponse) {
                var speechOutput;
                var cardOutput;
                
                if (err) {
                    speechOutput = 'Sorry, the AMC API service is experiencing a problem. Please try again later.';
                    cardOutput = speechOutput + ' ' + err;
                } else {
                    var movies = new Array();
                    movies = apiResponse._embedded.movies;
                    
                    if(movies.length < 1) {
                        speechOutput = 'Sorry, I couldn\'t find the movie you were looking for.';
                    } else {
                        //TODO Find showtimes using user's favorite theatre. 
                        speechOutput = 'Found movie, ' + movies[0].id + ', ' + movies[0].name;
                        cardOutput = speechOutput;
                        response.tellWithCard(speechOutput, 'AMC', cardOutput);
                    }
                }
            });
        }
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