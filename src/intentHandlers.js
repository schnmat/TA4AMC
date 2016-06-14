// Alexa SDK for JavaScript v1.0.00
// Copyright (c) 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved. Use is subject to license terms.
'use strict';
var textHelper = require('./textHelper'),
    helperFunctions = require('./helperFunctions'),
    numberFunctions = require('./numberFunctions'),
    api = require('./apiHandlers'),
    dateUtil = require('./alexaDateUtil'),
    locationFinder = require('./locationFinder'),
    storage = require('./storage');

var registerIntentHandlers = function (intentHandlers, skillContext) {
    

    /**
     * This is the intent that is launched when the user first opens the skill.
     * If there is no data for the user, they're prompted to set their location
     * so that they can find theatres in their hometown and see movies that
     * are playing.
     */
    intentHandlers.NewTheatreIntent = function (intent, session, response) {
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

    /**
     * Sets the users location based on a zip code that they've input.
     * Once their location is found and saved. The API is called to get
     * the theatres in their town. If there's only one theatre in their
     * town, it's automatically set as their favorite theatre to be used
     * as the default for showtimes.
     */
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
                        speechOutput = textHelper.errors.apiUnavailable;
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

    /**
     * Selects one of the theatres that have been found at the user's location
     * and saves it as the favorite to be used by default for showtimes.
     */
    intentHandlers.SetFavoriteTheatreIntent = function (intent, session, response) {
        var favoriteTheatreSlot = intent.slots.favoriteTheatre, favoriteTheatre;
        if (!favoriteTheatreSlot || !favoriteTheatreSlot.value) {
            response.ask('sorry, I didn\'t hear you say a theatre, please say again?');
            return;
        } else {
            favoriteTheatre = favoriteTheatreSlot.value;
        }

        storage.loadTheatre(session, function (currentTheatre) {
            var speechOutput = 'I\'m sorry, I couldn\'t find any theatres with that name.';
            helperFunctions.checkSessionVariables(currentTheatre);

            currentTheatre.data.localTheatres.forEach(function(element) {
                favoriteTheatre = numberFunctions.parseNumbersInString(favoriteTheatre);
                var checkName = element.name.replace('AMC ', '').toLowerCase();
                if(element.name.toLowerCase() == favoriteTheatre.toLowerCase() || checkName == favoriteTheatre.toLowerCase()) {
                    currentTheatre.data.favoriteTheatre = {'id':element.id,'name':element.name};            
                    speechOutput = 'Thank you, saving your favorite theatre, ' + element.name + '. ';
                }
            }, this);

            currentTheatre.save(function () {
                response.tellWithCard(speechOutput, 'AMC Favorite Theatre Request', speechOutput);
            });
        });
    };
    
    /**
     * Simply allows the user to ask what theatre has been saved
     * as their favorite theatre to check and make sure that it's correct.
     */
    intentHandlers.GetFavoriteTheatreIntent = function (intent, session, response) {
        storage.loadTheatre(session, function (currentTheatre) {
            var speechOutput = '';
            helperFunctions.checkSessionVariables(currentTheatre);

            speechOutput += 'The theatre that I have saved as your favorite is, ' + currentTheatre.data.favoriteTheatre +'.';
            response.tellWithCard(speechOutput, 'AMC Favorite Theatre Request', speechOutput);
        });
    };
    
    /**
     * Allows the user to ask what zip code has been saved
     * to check and make sure that it's correct.
     */
    intentHandlers.GetZipCodeIntent = function (intent, session, response) {
        storage.loadTheatre(session, function (currentTheatre) {
            var speechOutput = '';
            helperFunctions.checkSessionVariables(currentTheatre);

            speechOutput += 'The zip code that I have saved is, ' + currentTheatre.data.location.zipCode +'.';
            response.tellWithCard(speechOutput, 'AMC Zip Code Request', speechOutput);
        });
    };

    /**
     * Allows the user to recall what theatres have been found in
     * their hometown. If they want to look for showtimes in another
     * theatre, or change their favorite theatre.
     */
    intentHandlers.ListLocalTheatresIntent = function (intent, session, response) {
        storage.loadTheatre(session, function (currentTheatre) {
            var speechOutput = '';
            helperFunctions.checkSessionVariables(currentTheatre);
                    
            if(currentTheatre.data.localTheatres.length < 1) {
                speechOutput = 'Unfortunately it doesn\'t look like there are any AMC theatres in your city. If the theatre that you visit is in another city, please set your zip code to that city.';
            } else {
                speechOutput += 'Here are the theatres I found in your city. ';
                for(var i = 0, l = currentTheatre.data.localTheatres.length; i < l; i++) {
                    if(i == (l - 1)) {
                        speechOutput += 'and ' + currentTheatre.data.localTheatres[i].name + '. ';
                    } else {
                        speechOutput += currentTheatre.data.localTheatres[i].name + ', ';
                    }
                }
                response.tellWithCard(speechOutput, 'AMC Theatres Near You', speechOutput);
            }
        });
    };
    
    /**
     * Get a list of movies that are playing at their favorite theatre today.
     * If no favorite theatre is set, the default API call is made that
     * lists the movies that are playing at all theatres.
     */
    intentHandlers.NowPlayingIntent = function (intent, session, response) {
        storage.loadTheatre(session, function (currentTheatre) {
            var speechOutput = '';
            helperFunctions.checkSessionVariables(currentTheatre);
                    
            if(currentTheatre.data.favoriteTheatre.id != null && currentTheatre.data.favoriteTheatre.id > 0) {
                speechOutput += 'Now playing in ' + currentTheatre.data.favoriteTheatre.name + '. ';
                
                var callString = 'theatres/' + currentTheatre.data.favoriteTheatre.id + '/showtimes/' + dateUtil.getTodaysDate("-05:00");
                api.makeRequest(callString, function apiResponseCallback(err, apiResponse) {
                    if (err) {
                        speechOutput = textHelper.errors.apiUnavailable;
                    } else {
                        var movies = apiResponse._embedded.showtimes;
                        for(var i = 0, l = movies.length; i < l; i++) {
                            if(i == (l - 1)) {
                                speechOutput += 'and ' + movies[i].movieName + '. ';
                            } else {
                                speechOutput += movies[i].movieName + ', ';
                            }
                        }
                    }
                    response.tellWithCard(speechOutput, 'AMC Movies Now Playing', speechOutput);
                });                
            } else {
                speechOutput += 'Now playing in a theatre near you.';
                
                api.makeRequest('movies/views/now-playing', function apiResponseCallback(err, apiResponse) {
                    if (err) {
                        speechOutput = textHelper.errors.apiUnavailable;
                    } else {
                        var movies = apiResponse._embedded.movies;
                        for(var i = 0, l = movies.length; i < l; i++) {
                            if(i == (l - 1)) {
                                speechOutput += 'and ' + movies[i].name + '. ';
                            } else {
                                speechOutput += movies[i].name + ', ';
                            }
                        }
                    }
                    response.tellWithCard(speechOutput, 'AMC Movies Now Playing', speechOutput);
                });                                   
            }
        });
    };

    /**
     * The same as the "Now Playing"" Intent, but gets a list of movies
     * that are playing tomorrow.
     * Again, if no favorite theatre is found, it defaults to all movies
     * playing across all AMC theatres.
     */
    intentHandlers.PlayingTomorrowIntent = function (intent, session, response) {
        storage.loadTheatre(session, function (currentTheatre) {
            var speechOutput = '';
            helperFunctions.checkSessionVariables(currentTheatre);
                    
            if(currentTheatre.data.favoriteTheatre.id != null && currentTheatre.data.favoriteTheatre.id > 0) {
                speechOutput += 'Playing tomorrow in ' + currentTheatre.data.favoriteTheatre.name + '. ';
                
                var callString = 'theatres/' + currentTheatre.data.favoriteTheatre.id + '/showtimes/' + dateUtil.getTomorrowsDate("-05:00");
                api.makeRequest(callString, function apiResponseCallback(err, apiResponse) {
                    if (err) {
                        speechOutput = textHelper.errors.apiUnavailable;
                    } else {
                        var movies = apiResponse._embedded.showtimes;
                        for(var i = 0, l = movies.length; i < l; i++) {
                            if(i == (l - 1)) {
                                speechOutput += 'and ' + movies[i].movieName + '. ';
                            } else {
                                speechOutput += movies[i].movieName + ', ';
                            }
                        }
                    }
                    response.tellWithCard(speechOutput, 'AMC Movies Playing Tomorrow', speechOutput);
                });                
            } else {
                speechOutput += 'Now playing in a theatre near you.';
                
                api.makeRequest('movies/views/now-playing', function apiResponseCallback(err, apiResponse) {
                    if (err) {
                        speechOutput = textHelper.errors.apiUnavailable;
                    } else {
                        var movies = apiResponse._embedded.movies;
                        for(var i = 0, l = movies.length; i < l; i++) {
                            if(i == (l - 1)) {
                                speechOutput += 'and ' + movies[i].name + '. ';
                            } else {
                                speechOutput += movies[i].name + ', ';
                            }
                        }
                    }
                    response.tellWithCard(speechOutput, 'AMC Movies Playing Tomorrow', speechOutput);
                });                                   
            }
        });
    };
    
    /**
     * Returns movies that are soon to be released.
     * Unfortunately there are no API functions to request future
     * movies coming to a specific theatre. 
     */
    intentHandlers.ComingSoonIntent = function (intent, session, response) {
        storage.loadTheatre(session, function (currentTheatre) {
            helperFunctions.checkSessionVariables(currentTheatre);
            var speechOutput = currentTheatre.data.favoriteTheatre.name != null ? 'Coming soon to ' + currentTheatre.data.favoriteTheatre.name +'. ' : 'Coming soon to a theatre near you.';
            
            api.makeRequest('movies/views/coming-soon', function apiResponseCallback(err, apiResponse) {
                if (err) {
                    speechOutput = textHelper.errors.apiUnavailable;
                } else {
                    var movies = apiResponse._embedded.movies;
                    for(var i = 0, l = movies.length; i < l; i++) {
                        if(i == (l - 1)) {
                            speechOutput += 'and ' + movies[i].name + '. ';
                        } else {
                            speechOutput += movies[i].name + ', ';
                        }
                    }
                }    
                response.tellWithCard(speechOutput, 'AMC Movies Coming Soon', speechOutput);
            });
        });
    };

    /**
     * Get's all the showtimes of a movie for today's date.
     */
    intentHandlers.GetMovieShowtimesIntent = function (intent, session, response) {
        storage.loadTheatre(session, function (currentTheatre) {
            var speechOutput = '', cardOutput = '';
            var movieNameSlot = intent.slots.movieName, movieName;
            helperFunctions.checkSessionVariables(currentTheatre);

            // slots can be missing, or slots can be provided but with empty value.
            // must test for both.
            if (!movieNameSlot || !movieNameSlot.value) {
                speechOutput = 'I\'m sorry, I don\'t think I heard you correctly. What movie where you looking for?';
                response.ask(speechOutput, 'What was that movie again?');
                return;
            } else {
                movieName = helperFunctions.replaceAll(movieNameSlot.value, ' ', '-');

                var callString = 'theatres/' + currentTheatre.data.favoriteTheatre.id + '/showtimes/' + dateUtil.getTodaysDate("-05:00") + '/?movie=' + movieName;            
                api.makeRequest(callString, function apiResponseCallback(err, apiResponse) {
                     
                    if (err) { // If there's an error finding the movie, try again, this time parseing the movie name for numbers.
                        movieName = numberFunctions.parseNumbersInString(movieName);
                        callString = 'theatres/' + currentTheatre.data.favoriteTheatre.id + '/showtimes/' + dateUtil.getTodaysDate("-05:00") + '/?movie=' + movieName;
                        api.makeRequest(callString, function apiResponseCallback(err, apiResponse) {

                            if (err) {
                                speechOutput = textHelper.errors.apiUnavailable;
                                cardOutput = speechOutput + ' ' + err;
                            } else {
                                var movies = new Array();
                                movies = apiResponse._embedded.showtimes;
                                
                                if(movies.length < 1) {
                                    speechOutput = textHelper.errors.movieNotFound;
                                } else {
                                    speechOutput += movies[0].movieName + ' is playing today at ';
                                    
                                    for(var i = 0, l = movies.length; i < l; i++) {
                                        if(i == (l - 1)) {
                                            speechOutput += 'and ' + dateUtil.getFormattedTimeAmPm(new Date(movies[i].showDateTimeUtc.toString())) + '. ';
                                        } else {
                                            speechOutput += dateUtil.getFormattedTimeAmPm(new Date(movies[i].showDateTimeUtc.toString())) + ', ';
                                        }
                                    }
                                }
                                cardOutput = speechOutput + ' ' + callString;
                            }
                            response.tellWithCard(speechOutput, 'AMC Movie Showtimes', cardOutput);
                        });
                    } else {
                        var movies = new Array();
                        movies = apiResponse._embedded.showtimes;
                        
                        if(movies.length < 1) {
                            speechOutput = textHelper.errors.movieNotFound;
                        } else {
                            speechOutput += movies[0].movieName + ' is playing today at ';
                            
                            for(var i = 0, l = movies.length; i < l; i++) {
                                if(i == (l - 1)) {
                                    speechOutput += 'and ' + dateUtil.getFormattedTimeAmPm(new Date(movies[i].showDateTimeUtc.toString())) + '. ';
                                } else {
                                    speechOutput += dateUtil.getFormattedTimeAmPm(new Date(movies[i].showDateTimeUtc.toString())) + ', ';
                                }
                            }
                        }
                        cardOutput = speechOutput;
                        response.tellWithCard(speechOutput, 'AMC Movie Showtimes', cardOutput);
                    }
                });
            }
        });
    };

    /**
     * Returns more details about a movie.
     */
    intentHandlers.GetMovieDetailsIntent = function (intent, session, response) {
        var speechOutput;
        var movieNameSlot = intent.slots.movieName, movieName;
        
        // slots can be missing, or slots can be provided but with empty value.
        // must test for both.
        if (!movieNameSlot || !movieNameSlot.value) {
            speechOutput = 'I\'m sorry, I don\'t think I heard you correctly. What movie where you looking for?';
            var repromptText = 'What was that movie again?';
            response.ask(speechOutput, repromptText);
            return;
        } else {
            movieName = helperFunctions.replaceAll(movieNameSlot.value, ' ', '-');
            
            api.makeRequest('movies?name=' + movieName, function apiResponseCallback(err, apiResponse) {
                var speechOutput;
                var cardOutput;
                
                if (err) { // If there's an error finding the movie, try again, this time parseing the movie name for numbers.
                    movieName = numberFunctions.parseNumbersInString(movieName);
                    callString = 'theatres/' + currentTheatre.data.favoriteTheatre.id + '/showtimes/' + dateUtil.getTodaysDate("-05:00") + '/?movie=' + movieName;
                    api.makeRequest(callString, function apiResponseCallback(err, apiResponse) {

                        if (err) {
                            speechOutput = textHelper.errors.apiUnavailable;
                            cardOutput = speechOutput + ' ' + err;
                        } else {
                            var movies = new Array();
                            movies = apiResponse._embedded.movies;
                            
                            if(movies.length < 1) {
                                speechOutput = textHelper.errors.movieNotFound;
                            } else {
                                var movie = movies[0];
                                //TODO Find showtimes using user's favorite theatre. 
                                speechOutput = movie.name + ', is a' + helperFunctions.parseMovieGenre(movie.genre) + ' movie, rated ' + movie.mpaaRating + ', and running ' + movie.runTime + ' minutes long. The description reads: ' + movie.synopsis + ' The movie is directed by: ' + movie.directors + ' and stars: ' + movie.starringActors + '.';
                                var threedee = false;
                                for(var i = 0, l = movie.attributes.length; i < l; i++) {
                                    if(movie.attributes[i].code === 'THREED') {
                                        threedee = true;
                                    }
                                }
                                if(threedee == true) {
                                    speechOutput += ' This movie is available in 3-D.';
                                } else {
                                    speechOutput += ' There are no 3-D showings available for this movie.';
                                }
                                cardOutput = speechOutput;
                                response.tellWithCard(speechOutput, 'AMC', cardOutput);
                            }
                        }
                        response.tellWithCard(speechOutput, 'AMC Movie Details', cardOutput);
                    });
                } else {
                    var movies = new Array();
                    movies = apiResponse._embedded.movies;
                    
                    if(movies.length < 1) {
                        speechOutput = textHelper.errors.movieNotFound;
                    } else {
                        var movie = movies[0];
                        //TODO Find showtimes using user's favorite theatre. 
                        speechOutput = movie.name + ', is a' + helperFunctions.parseMovieGenre(movie.genre) + ' movie, rated ' + movie.mpaaRating + ', and running ' + movie.runTime + ' minutes long. The description reads: ' + movie.synopsis + ' The movie is directed by: ' + movie.directors + ' and stars: ' + movie.starringActors + '.';
                        var threedee = false;
                        for(var i = 0, l = movie.attributes.length; i < l; i++) {
                            if(movie.attributes[i].code === 'THREED') {
                                threedee = true;
                            }
                        }
                        if(threedee == true) {
                            speechOutput += ' This movie is available in 3-D.';
                        } else {
                            speechOutput += ' There are no 3-D showings available for this movie.';
                        }
                        cardOutput = speechOutput;
                        response.tellWithCard(speechOutput, 'AMC Movie Details', cardOutput);
                    }
                }
            });
        }
    };

    /**
     * If the user asks for help, list a short guide on the functions
     * of the skill.
     * If this is the beginning of a session, needMoreHelp will be true.
     */
    intentHandlers.HelpIntent = function (intent, session, response) {
        var speechOutput = textHelper.completeHelp;
        if (skillContext.needMoreHelp) {
            response.ask(textHelper.completeHelp + ' So, how can I help?');
        } else {
            response.tell(textHelper.completeHelp);
        }
    };
};
exports.register = registerIntentHandlers;