// Alexa SDK for JavaScript v1.0.00
// Copyright (c) 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved. Use is subject to license terms.
'use strict';
var textHelper = require('./textHelper'),
    helperUtil = require('./helperFunctions'),
    numberUtil = require('./numberFunctions'),
    dateUtil = require('./dateFunctions'),
    api = require('./apiHandlers'),
    storage = require('./storage');

var registerIntentHandlers = function (intentHandlers, skillContext) {
    

    /**
     * This is the intent that is launched when the user first opens the skill.
     * 
     * If there is no data for the user, they're prompted to set their location
     * so that they can find theatres in their hometown and see movies that
     * are playing.
     */
    intentHandlers.NewTheatreIntent = function (intent, session, response) {
        storage.loadTheatre(session, function (currentTheatre) {
            if (currentTheatre.data.players.length === 0) {
                response.ask('Welcome to AMC Theatres. What is your location?',
                    'Please tell me your location, either by city and state, or by zip code, so that I can find showtimes in your local theatre.');
                return;
            }
            
            helperUtil.checkSessionVariables;
            
            currentTheatre.save(function () {
                var speechOutput = 'Location ' + currentTheatre.data.location.state + ' saved.';
                if (skillContext.needMoreHelp) {
                    speechOutput += '. You can ask me what\'s playing right now, or get showtimes for a movie. What would you like?';
                    response.ask(speechOutput);
                } else {
                    response.tell(speechOutput);
                }
            });
        });
    };

    /**
     * Sets the users location based on a zip code that they've input.
     * 
     * Once their location is found and saved. The API is called to get
     * the theatres in their town. If there's only one theatre in their
     * town, it's automatically set as their favorite theatre to be used
     * as the default for showtimes.
     * 
     * If there's more than one theatre, the first one lsited is set as the
     * default, until the user changes it themselves.
     */
    intentHandlers.SetLocationByZipCodeIntent = function (intent, session, response) {
        //give a player points, ask additional question if slot values are missing.
        var zipCodeSlot = intent.slots.zipCode,
            speechOutput = '',
        	cardOutput = '';
        if (!zipCodeSlot || !zipCodeSlot.value) {
            response.ask('sorry, I did not hear your zip code, please say again?');
            return;
        }
        var zipCode = parseInt(zipCodeSlot.value);
        if (isNaN(zipCode)) {
            console.log('Invalid zip code = ' + zipCode);
            response.ask('sorry, I did not hear your zip code, please say again?');
            return;
        }
 
        storage.loadTheatre(session, function (currentTheatre) {
            helperUtil.checkSessionVariables(currentTheatre);
            
            currentTheatre.data.location.zipCode = zipCode;
            speechOutput += 'Thank you, saving zip code, ' + zipCode + '. ';

            api.fetchLocation('address=' + zipCode, function apiResponseCallback(err, apiResponse) {
                if (err) {
                    speechOutput = textHelper.errors.googleAPIUnavailable;
	                cardOutput = speechOutput + ' ' + err;
                } else {
                    var city  = apiResponse.results[0].address_components[1].long_name;
                    var state = apiResponse.results[0].address_components[2].long_name;
                    currentTheatre.data.location.city  = city;
                    currentTheatre.data.location.state = state;
                
                    //Note: City and State needs to have spaces replaced with dashes.
                    var callString = 'theatres?state=' + state.replace(' ', '-') + '&city=' + city.replace(' ', '-');
                    console.log('API Call: ' + callString);
                    api.makeRequest(callString, function apiResponseCallback(err, apiResponse) {
                        if (err) {
                            speechOutput = textHelper.errors.amcAPIUnavailable;
	                        cardOutput = speechOutput + ' ' + err;
                        } else {
                            var theatres = apiResponse._embedded.theatres;

                            currentTheatre.data.localTheatres = [];
                            
                            if(theatres.length < 1) {
                                speechOutput += textHelper.errors.theatresNotFound;
                            } else {
                                currentTheatre.data.location.utcOffset = theatres[0].utcOffset.replace(':', '.');
                                theatres.forEach(function(element) {
                                    currentTheatre.data.localTheatres.push({'id': element.id, 'name': element.name});                          
                                }, this);

                                currentTheatre.data.favoriteTheatre = {'id': currentTheatre.data.localTheatres[0].id, 'name': currentTheatre.data.localTheatres[0].name};
                                if(theatres.length === 1) {
                                    speechOutput += 'I found one theatre in your city. ' + currentTheatre.data.localTheatres[0].name + '. It has been set as your favorite.';
                                } else {
                                    speechOutput += 'Here are the theatres I found in your city. The first one has been set as your favorite.';
                                    for(var i = 0, l = currentTheatre.data.localTheatres.length; i < l; i++) {
                                        if(i == (l - 1)) {
                                            speechOutput += 'and ' + currentTheatre.data.localTheatres[i].name + '. ';
                                        } else {
                                            speechOutput += currentTheatre.data.localTheatres[i].name + ', ';
                                        }
                                    }
                                }
                            }
	                        cardOutput = speechOutput;
                        }
                        
                        currentTheatre.save(function () {
                            response.tellWithCard(speechOutput, 'AMC Zip Code Request', cardOutput);
                        });
                    });
                }
            });
        });
    };
    
    /**
     * Allows the user to ask what zip code has been saved
     * to check and make sure that it's correct.
     */
    intentHandlers.GetSavedZipCodeIntent = function (intent, session, response) {
        storage.loadTheatre(session, function (currentTheatre) {
            var speechOutput = '';
            helperUtil.checkSessionVariables(currentTheatre);

            speechOutput += 'The zip code that I have saved is, ' + currentTheatre.data.location.zipCode +'.';
            response.tellWithCard(speechOutput, 'AMC Zip Code Request', speechOutput);
        });
    };

    /**
     * Sets the users location based on a city and state that they've input.
     * 
     * An API call to Google Map's geocode API is made to get the Lat/Long
     * of the city, which can then be used to get the Zip Code.
     * 
     * Once their location is found and saved. The API is called to get
     * the theatres in their town. If there's only one theatre in their
     * town, it's automatically set as their favorite theatre to be used
     * as the default for showtimes.
     * 
     * If there's more than one theatre, the first one lsited is set as the
     * default, until the user changes it themselves.
     */
    intentHandlers.SetLocationByCityStateIntent = function (intent, session, response) {
        var citySlot = intent.slots.city,
        	stateSlot = intent.slots.state,
        	speechOutput = '',
        	cardOutput = '';
        if (!citySlot || !citySlot.value) {
            response.ask('sorry, I didn\'t hear a city name, please say again?');
            return;
        }
        if (!stateSlot || !stateSlot.value) {
            response.ask('sorry, I didn\'t hear a state name, please say again?');
            return;
        }

        storage.loadTheatre(session, function (currentTheatre) {
            helperUtil.checkSessionVariables(currentTheatre);

            //Note: City and State needs to have spaces replaced with dashes.
            var callString = 'theatres?state=' + stateSlot.value.replace(' ', '-') + '&city=' + citySlot.value.replace(' ', '-');
            console.log('API Call: ' + callString);
            api.makeRequest(callString, function apiResponseCallback(err, apiResponse) {
                if (err) {
                    speechOutput = textHelper.errors.amcAPIUnavailable;
                    cardOutput = speechOutput + ' ' + err;
                } else {
                    var theatres = apiResponse._embedded.theatres;
                    currentTheatre.data.localTheatres = []; // Load the theatres into an array
                    
                    if(theatres.length < 1) {
                        speechOutput += textHelper.errors.theatresNotFound;
                    } else {
                        currentTheatre.data.location.utcOffset = theatres[0].utcOffset.replace(':', '.');
                        theatres.forEach(function(element) {
                            currentTheatre.data.localTheatres.push({'id': element.id, 'name': element.name});                          
                        }, this);

                        currentTheatre.data.favoriteTheatre = {'id': currentTheatre.data.localTheatres[0].id, 'name': currentTheatre.data.localTheatres[0].name};
                        if(theatres.length === 1) {
                            speechOutput += 'I found one theatre in your city. ' + currentTheatre.data.localTheatres[0].name + '. It has been set as your favorite.';
                        } else {
                            speechOutput += 'Here are the theatres that I found in your city. The first one has been set as your favorite.';
                            for(var i = 0, l = currentTheatre.data.localTheatres.length; i < l; i++) {
                                if(i == (l - 1)) {
                                    speechOutput += 'and ' + currentTheatre.data.localTheatres[i].name + '. ';
                                } else {
                                    speechOutput += currentTheatre.data.localTheatres[i].name + ', ';
                                }
                            }
                            
                            // Set the city + state and default to what was requested if something goes wrong.
                            currentTheatre.data.location.city = theatres[0].location.city || citySlot.value;
                            currentTheatre.data.location.state = theatres[0].location.stateName || stateSlot.value;
                            currentTheatre.data.location.zipCode = theatres[0].location.postalCode;
                        }
                    }
                    cardOutput = speechOutput;
                }
                
                currentTheatre.save(function () {
                    response.tellWithCard(speechOutput, 'AMC Location Request', cardOutput);
                });
            });
        });
    };
    
    /**
     * Allows the user to ask what City and State have been saved
     * to check and make sure that it's correct.
     */
    intentHandlers.GetSavedLocationIntent = function (intent, session, response) {
        storage.loadTheatre(session, function (currentTheatre) {
            var speechOutput = '';
            helperUtil.checkSessionVariables(currentTheatre);

            speechOutput += 'The location that I have saved is, ' + currentTheatre.data.location.city +', ' + currentTheatre.data.location.state + '.';
            response.tellWithCard(speechOutput, 'AMC Location Request', speechOutput);
        });
    };

    /**
     * Selects one of the theatres that have been found at the user's location
     * and saves it as the favorite to be used by default for showtimes.
     */
    intentHandlers.SetFavoriteTheatreIntent = function (intent, session, response) {
        var favoriteTheatreSlot = intent.slots.favoriteTheatre,
            favoriteTheatre = '';
        if (!favoriteTheatreSlot || !favoriteTheatreSlot.value) {
            response.ask('sorry, I didn\'t hear you say a theatre, please say again?');
            return;
        } else {
            favoriteTheatre = favoriteTheatreSlot.value;
        
            storage.loadTheatre(session, function (currentTheatre) {
                var speechOutput = 'I\'m sorry, I couldn\'t find any theatres with that name.';
                helperUtil.checkSessionVariables(currentTheatre);
                
                // Loop through the theatres saved locally to find the theatre with the same name.
                currentTheatre.data.localTheatres.forEach(function(element) {
                    favoriteTheatre = numberUtil.parseNumbersInString(favoriteTheatre);
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
        }
    };
    
    /**
     * Simply allows the user to ask what theatre has been saved
     * as their favorite theatre to check and make sure that it's correct.
     */
    intentHandlers.GetFavoriteTheatreIntent = function (intent, session, response) {
        storage.loadTheatre(session, function (currentTheatre) {
            var speechOutput = '';
            helperUtil.checkSessionVariables(currentTheatre);

            speechOutput += 'The theatre that I have saved as your favorite is, ' + currentTheatre.data.favoriteTheatre.name +'.';
            response.tellWithCard(speechOutput, 'AMC Favorite Theatre Request', speechOutput);
        });
    };

    /**
     * Allows the user to recall what theatres have been found in
     * their hometown. If they want to look for showtimes in another
     * theatre, or change their favorite theatre.
     */
    intentHandlers.ListLocalTheatresIntent = function (intent, session, response) {
        storage.loadTheatre(session, function (currentTheatre) {
            var speechOutput = '',
            	cardOutput = '';
            helperUtil.checkSessionVariables(currentTheatre);
                    
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
                cardOutput = speechOutput;
            }
            response.tellWithCard(speechOutput, 'AMC Theatres Near You', cardOutput);
        });
    };

    /**
     * Returns the phone number for a theatre.
     */
    intentHandlers.GetPhoneNumberForTheatreIntent = function (intent, session, response) {
        var theatreSlot = intent.slots.favoriteTheatre,
            foundTheatre = {id: 0, name: ''};
        if (!theatreSlot || !theatreSlot.value) {
            response.ask('sorry, I didn\'t hear you say a theatre, please say again?');
            return;
        } else {
        
            storage.loadTheatre(session, function (currentTheatre) {
                var speechOutput = 'I\'m sorry, I couldn\'t find any theatres with that name.',
            	cardOutput = '';
                helperUtil.checkSessionVariables(currentTheatre);

                // Loop through the theatres saved locally to find the theatre with the same name.
                currentTheatre.data.localTheatres.forEach(function(theatre) {
                    favoriteTheatre = numberUtil.parseNumbersInString(favoriteTheatre);
                    var checkName = theatre.name.replace('AMC ', '').toLowerCase();
                    if(theatre.name.toLowerCase() == theatreSlot.value.toLowerCase() ||
                                        checkName == theatreSlot.value.toLowerCase()) {
                        foundTheatre = {'id':element.id,'name':element.name};            
                    }
                }, this);

                var callString = 'theatres/' + foundTheatre.id;
                console.log('API Call: ' + callString);
                api.makeRequest(callString, function apiResponseCallback(err, apiResponse) {
                    if (err) {
                        speechOutput = textHelper.errors.amcAPIUnavailable;
                        cardOutput = speechOutput + ' ' + err;
                    } else {
                        speechOutput = 'The phone number for ' + foundTheatre.name + ' is ' + apiResponse.guestServicesPhoneNumber + '. ';
                        cardOutput = speechOutput;
                    }
                    response.tellWithCard(speechOutput, 'AMC Theatres Near You', cardOutput);
                });
            });
        }
    };
    
    /**
     * Get a list of movies that are playing at their favorite theatre today.
     * If no favorite theatre is set, the default API call is made that
     * lists the movies that are playing at all theatres.
     */
    intentHandlers.NowPlayingIntent = function (intent, session, response) {
        storage.loadTheatre(session, function (currentTheatre) {
            var speechOutput = '',
            	cardOutput = '',
                weekdayNameSlot = intent.slots.weekday,
            	weekday = dateUtil.getTodaysDate(currentTheatre.data.location.utcOffset),
                weekdayResponse = 'today';
            helperUtil.checkSessionVariables(currentTheatre);

            if (weekdayNameSlot && weekdayNameSlot.value) {
                weekdayResponse = weekdayNameSlot.value;
                weekday = dateUtil.getDayFromString(weekdayNameSlot.value, currentTheatre.data.location.utcOffset);
            }
                    
            if(currentTheatre.data.favoriteTheatre.id != null && currentTheatre.data.favoriteTheatre.id > 0) {
                speechOutput += 'Now playing in ' + currentTheatre.data.favoriteTheatre.name + '. ';
                
                var callString = 'theatres/' + currentTheatre.data.favoriteTheatre.id + '/showtimes/' + weekday;
                console.log('API Call: ' + callString);
                api.makeRequest(callString, function apiResponseCallback(err, apiResponse) {
                    if (err) {
                        speechOutput = textHelper.errors.amcAPIUnavailable;
                        cardOutput = speechOutput + ' ' + err;
                    } else {
                        var movies = apiResponse._embedded.showtimes;
                        for(var i = 0, l = movies.length; i < l; i++) {
                            if(i == (l - 1)) {
                                speechOutput += 'and ' + movies[i].movieName + '. ';
                            } else {
                                speechOutput += movies[i].movieName + ', ';
                            }
                        }
                        cardOutput = speechOutput;
                    }
                    response.tellWithCard(speechOutput, 'AMC Movies Now Playing', cardOutput);
                });                
            } else {
                speechOutput += 'Now playing in a theatre near you.';
                console.log('API Call: movies/views/now-playing');
                api.makeRequest('movies/views/now-playing', function apiResponseCallback(err, apiResponse) {
                    if (err) {
                        speechOutput = textHelper.errors.amcAPIUnavailable;
                        cardOutput = speechOutput + ' ' + err;
                    } else {
                        var movies = apiResponse._embedded.movies;
                        for(var i = 0, l = movies.length; i < l; i++) {
                            if(i == (l - 1)) {
                                speechOutput += 'and ' + movies[i].name + '. ';
                            } else {
                                speechOutput += movies[i].name + ', ';
                            }
                        }
                        cardOutput = speechOutput;
                    }
                    response.tellWithCard(speechOutput, 'AMC Movies Now Playing', cardOutput);
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
            helperUtil.checkSessionVariables(currentTheatre);
            var speechOutput = currentTheatre.data.favoriteTheatre.name != null ? 'Coming soon to ' + currentTheatre.data.favoriteTheatre.name +'. ' : 'Coming soon to a theatre near you.';
            var cardOutput = '';
            
            console.log('API Call: movies/views/coming-soon');
            api.makeRequest('movies/views/coming-soon', function apiResponseCallback(err, apiResponse) {
                if (err) {
                    speechOutput = textHelper.errors.amcAPIUnavailable;
                        cardOutput = speechOutput + ' ' + err;
                } else {
                    var movies = apiResponse._embedded.movies;
                    for(var i = 0, l = movies.length; i < l; i++) {
                        if(i == (l - 1)) {
                            speechOutput += 'and ' + movies[i].name + '. ';
                        } else {
                            speechOutput += movies[i].name + ', ';
                        }
                    }
                    cardOutput = speechOutput;
                }    
                response.tellWithCard(speechOutput, 'AMC Movies Coming Soon', cardOutput);
            });
        });
    };

    /**
     * Returns all the showtimes of a movie for a certain date.
     */
    intentHandlers.GetMovieShowtimesIntent = function (intent, session, response) {
        storage.loadTheatre(session, function (currentTheatre) {
            var speechOutput = '',
                cardOutput = '',
                movieNameSlot = intent.slots.movieName,
            	movieName = '',
                weekdayNameSlot = intent.slots.weekday,
            	weekday = dateUtil.getTodaysDate(currentTheatre.data.location.utcOffset),
                weekdayResponse = 'today',
                regularShowtimes = [],
                threedeeShowtimes = [];
            helperUtil.checkSessionVariables(currentTheatre);

            // Verify that the input slots have values.
            if (!movieNameSlot || !movieNameSlot.value) {
                speechOutput = 'I\'m sorry, I don\'t think I heard you correctly. What movie where you looking for?';
                response.ask(speechOutput, 'What was that movie again?');
                return;
            } else {
                movieName = helperUtil.replaceAll(movieNameSlot.value, ' ', '-');

                if (weekdayNameSlot && weekdayNameSlot.value) {
                    weekdayResponse = weekdayNameSlot.value;
                    weekday = dateUtil.getDayFromString(weekdayNameSlot.value, currentTheatre.data.location.utcOffset);
                }

                var callString = 'theatres/' + currentTheatre.data.favoriteTheatre.id + '/showtimes/' + weekday + '/?movie=' + movieName;            
                console.log('API Call: ' + callString);
                api.makeRequest(callString, function apiResponseCallback(err, apiResponse) {
                     
                    if (err) { // If there's an error finding the movie, try again, this time parsing the movie name for numbers.
                        movieName = numberUtil.parseNumbersInString(movieName);
                        callString = 'theatres/' + currentTheatre.data.favoriteTheatre.id + '/showtimes/' + weekday + '/?movie=' + movieName;
                        api.makeRequest(callString, function apiResponseCallback(err, apiResponse) {

                            if (err) {
                                if(err.code == 5217) {
                                    speechOutput = textHelper.errors.noShowtimesFound;
                                    cardOutput = speechOutput + ' ' + err;
                                } else {
                                    speechOutput = textHelper.errors.amcAPIUnavailable;
                                    cardOutput = speechOutput + ' ' + err;
                                }
                            } else {
                                var movies = new Array();
                                movies = apiResponse._embedded.showtimes;
                                
                                if(movies.length < 1) {
                                    speechOutput = textHelper.errors.movieNotFound;
                                } else {
                                    speechOutput += movies[0].movieName + ' is playing ' + weekdayResponse + ' at ';
                                    
                                    for(var i = 0, l = movies.length; i < l; i++) {
                                        if(i == (l - 1)) {
                                            speechOutput += 'and ' + dateUtil.getFormattedTimeAmPm(dateUtil.getLocalDate(currentTheatre.data.location.utcOffset, new Date(movies[i].showDateTimeUtc))) + '. ';
                                        } else {
                                            speechOutput += dateUtil.getFormattedTimeAmPm(dateUtil.getLocalDate(currentTheatre.data.location.utcOffset, new Date(movies[i].showDateTimeUtc))) + ', ';
                                        }
                                    }
                                }
                                cardOutput = speechOutput;
                            }
                            response.tellWithCard(speechOutput, 'AMC Movie Showtimes', cardOutput);
                        });
                    } else {
                        var movies = new Array();
                        movies = apiResponse._embedded.showtimes;
                        
                        if(movies.length < 1) {
                            speechOutput = textHelper.errors.movieNotFound;
                        } else {
                            speechOutput += movies[0].movieName + ' is playing ' + weekdayResponse + ' at ';
                            
                            movies.forEach(function(movie) {
                                var showdate = dateUtil.getLocalDate(currentTheatre.data.location.utcOffset, new Date(movie.showDateTimeUtc));
                                var sellByDate = dateUtil.getLocalDate(currentTheatre.data.location.utcOffset, new Date(movie.sellUntilDateTimeUtc));

                                if(dateUtil.afterCurrentTime(currentTheatre.data.location.utcOffset, sellByDate) > -1){
                                    if(helperUtil.isMovieThreeDee(movie.attributes)) {
                                        threedeeShowtimes.push(dateUtil.getFormattedTimeAmPm(showdate));
                                    } else {
                                        regularShowtimes.push(dateUtil.getFormattedTimeAmPm(showdate));
                                    }
                                }
                            }, this);

                            if(regularShowtimes.length < 1 && threedeeShowtimes.length < 1) {
                                speechOutput = textHelper.errors.noShowtimesFound;
                            } else if(regularShowtimes.length > 0 && threedeeShowtimes.length > 0) {
                                regularShowtimes.forEach(function(time) {
                                    speechOutput += time + ', ';
                                }, this);
                                speechOutput += 'and in 3 D at: ';
                                threedeeShowtimes.forEach(function(time) {
                                    speechOutput += time + ', ';
                                }, this);
                            } else if (regularShowtimes.length > 0) {
                                regularShowtimes.forEach(function(time) {
                                    speechOutput += time + ', ';
                                }, this);
                            } else if (threedeeShowtimes.length > 0) {
                                speechOutput = movies[0].movieName + ' is playing in 3 D ' + weekdayResponse + ' at ';
                                threedeeShowtimes.forEach(function(time) {
                                    speechOutput += time + ', ';
                                }, this);
                            }
                            speechOutput = helperUtil.replaceLast(speechOutput, ', ', '.');
                        }
                        cardOutput = speechOutput;
                        response.tellWithCard(speechOutput, 'AMC Movie Showtimes', cardOutput);
                    }
                });
            }
        });
    };

    /**
     * Returns more details about a movie. Work in progress. Need to make it less clunky.
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
            movieName = helperUtil.replaceAll(movieNameSlot.value, ' ', '-');
            
            api.makeRequest('movies?name=' + movieName, function apiResponseCallback(err, apiResponse) {
                var speechOutput;
                var cardOutput;
                
                if (err) { // If there's an error finding the movie, try again, this time parseing the movie name for numbers.
                    movieName = numberUtil.parseNumbersInString(movieName);
                    callString = 'theatres/' + currentTheatre.data.favoriteTheatre.id + '/showtimes/' + dateUtil.getTodaysDate(currentTheatre.data.location.utcOffset) + '/?movie=' + movieName;
                    api.makeRequest(callString, function apiResponseCallback(err, apiResponse) {

                        if (err) {
                            speechOutput = textHelper.errors.amcAPIUnavailable;
                            cardOutput = speechOutput + ' ' + err;
                        } else {
                            var movies = new Array();
                            movies = apiResponse._embedded.movies;
                            
                            if(movies.length < 1) {
                                speechOutput = textHelper.errors.movieNotFound;
                            } else {
                                var movie = movies[0];
                                //TODO Find showtimes using user's favorite theatre. 
                                speechOutput = movie.name + ', is a' + helperUtil.parseMovieGenre(movie.genre) + ' movie, rated ' + movie.mpaaRating + ', and running ' + movie.runTime + ' minutes long. The description reads: ' + movie.synopsis + ' The movie is directed by: ' + movie.directors + ' and stars: ' + movie.starringActors + '.';
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
                        speechOutput = movie.name + ', is a' + helperUtil.parseMovieGenre(movie.genre) + ' movie, rated ' + movie.mpaaRating + ', and running ' + movie.runTime + ' minutes long. The description reads: ' + movie.synopsis + ' The movie is directed by: ' + movie.directors + ' and stars: ' + movie.starringActors + '.';
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