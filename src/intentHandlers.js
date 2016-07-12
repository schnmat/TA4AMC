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
 * Format:
 * 
 * intentHandlers.INTENT_NAME = function (intent, session, response) {
 *  var speechOutput = '',
 *     	cardOutput = '',
 *      callString = '',
 *      SLOT_NAME = intent.slots.INTENT_SLOT; // initialize variables needed here.
 * 
 *  // Check input slots for values:
 *  if(!SLOT_NAME || !SLOT_NAME.value) {
 *      // Handle case if the slot isn't set.
 *      response.ask(QUESTION_TEXT);
 *      return;
 *  }
 *  
 *  storage.loadTheatre(session, function (currentTheatre) { // Load session data
 *      // Set API call string:
 *      callString = 'api/url/parameters';
 *      console.log('API Call: ' + callString); // Track api calls made in case a bad URL is made.
 * 
 *      api.makeRequest(callString, function apiResponseCallback(err, apiResponse) {
 *          if (err) { // Return error message.
 *              speechOutput = textHelper.errors.amcAPIUnavailable;
 *              cardOutput = speechOutput + ' ' + err;
 *          } else {
 *              // Success.
 *              cardOutput = speechOutput;
 *          }
 * 
 *          // Return response:
 *          response.tellWithCard(speechOutput, 'CARD TITLE', cardOutput);
 *      
 *      }); //End API
 *  }); //End Session Load
 * }; //End Intent
 * 
 */    

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
        var speechOutput = '',
        	cardOutput = ''
            callString = '',
            zipCodeSlot = intent.slots.zipCode,
            zipCode = 0,
            city = '',
            state = '',
            theatres = new Array();

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

            currentTheatre.data.location.zipCode = zipCode;
            speechOutput += 'Thank you, saving zip code, ' + zipCode + '. ';

            api.fetchLocation('address=' + zipCode, function apiResponseCallback(err, apiResponse) {
                if (err) {
                    speechOutput = textHelper.errors.googleAPIUnavailable;
	                cardOutput = speechOutput + ' ' + err;
                } else {
                    city  = apiResponse.results[0].address_components[1].long_name;
                    state = apiResponse.results[0].address_components[2].long_name;
                    currentTheatre.data.location.city  = city;
                    currentTheatre.data.location.state = state;
                
                    //Note: City and State needs to have spaces replaced with dashes.
                    callString = 'theatres?state=' + state.replace(' ', '-') + '&city=' + city.replace(' ', '-');
                    console.log('API Call: ' + callString);
                    api.makeRequest(callString, function apiResponseCallback(err, apiResponse) {
                        if (err) {
                            speechOutput = textHelper.errors.amcAPIUnavailable;
	                        cardOutput = speechOutput + ' ' + err;
                        } else {
                            theatres = apiResponse._embedded.theatres;

                            currentTheatre.data.localTheatres = new Array();
                            
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
            var speechOutput = 'The zip code that I have saved is, ' + currentTheatre.data.location.zipCode +'.';

            if(currentTheatre.data.location.zipCode == 0) {
                speechOutput = 'I have no zip code saved.';
            }

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
        var speechOutput = '',
        	cardOutput = '',
            callString = '',
            citySlot = intent.slots.city,
        	stateSlot = intent.slots.state,
            theatres = new Array();

        if (!citySlot || !citySlot.value) {
            response.ask('sorry, I didn\'t hear a city name, please say again?');
            return;
        }
        if (!stateSlot || !stateSlot.value) {
            response.ask('sorry, I didn\'t hear a state name, please say again?');
            return;
        }

        storage.loadTheatre(session, function (currentTheatre) {

            //Note: City and State needs to have spaces replaced with dashes.
            callString = 'theatres?state=' + stateSlot.value.replace(' ', '-') + '&city=' + citySlot.value.replace(' ', '-');
            console.log('API Call: ' + callString);
            api.makeRequest(callString, function apiResponseCallback(err, apiResponse) {
                if (err) {
                    speechOutput = textHelper.errors.amcAPIUnavailable;
                    cardOutput = speechOutput + ' ' + err;
                } else {
                    theatres = apiResponse._embedded.theatres;
                    currentTheatre.data.localTheatres = new Array(); // Load the theatres into an array
                    
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
        var speechOutput = '';

        storage.loadTheatre(session, function (currentTheatre) {
            speechOutput = 'The location that I have saved is, ' + currentTheatre.data.location.city +', ' + currentTheatre.data.location.state + '.';

            if(!currentTheatre.data.location.city && !currentTheatre.data.location.state) {
                speechOutput = 'I have no city or state saved.';
            }
            else if(!currentTheatre.data.location.city) {
                speechOutput = 'I have no city saved. I have your state saved as: ' + currentTheatre.data.location.state;
            }
            else if(!currentTheatre.data.location.state) {
                speechOutput = 'I have no state saved. I have your city saved as: ' + currentTheatre.data.location.city;
            }

            response.tellWithCard(speechOutput, 'AMC Location Request', speechOutput);
        });
    };

    /**
     * Selects one of the theatres that have been found at the user's location
     * and saves it as the favorite to be used by default for showtimes.
     */
    intentHandlers.SetFavoriteTheatreIntent = function (intent, session, response) {
        var speechOutput = 'I\'m sorry, I couldn\'t find any theatres with that name.',
            favoriteTheatreSlot = intent.slots.favoriteTheatre,
            favoriteTheatre = '',
            checkName = '';
        
        if (!favoriteTheatreSlot || !favoriteTheatreSlot.value) {
            response.ask('sorry, I didn\'t hear you say a theatre, please say again?');
            return;
        }
        favoriteTheatre = favoriteTheatreSlot.value;
    
        storage.loadTheatre(session, function (currentTheatre) {
            
            // Loop through the theatres saved locally to find the theatre with the same name.
            currentTheatre.data.localTheatres.forEach(function(element) {
                favoriteTheatre = numberUtil.parseNumbersInString(favoriteTheatre);
                checkName = element.name.replace('AMC ', '').toLowerCase();
                if(element.name.toLowerCase() == favoriteTheatre.toLowerCase() ||
                                    checkName == favoriteTheatre.toLowerCase()) {
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
        var speechOutput = '';
        
        storage.loadTheatre(session, function (currentTheatre) {
            speechOutput = 'The theatre that I have saved as your favorite is, ' + currentTheatre.data.favoriteTheatre.name +'.';

            if(!currentTheatre.data.favoriteTheatre.name) {
                speechOutput = 'I have no theatre saved as your favorite.';
            }

            response.tellWithCard(speechOutput, 'AMC Favorite Theatre Request', speechOutput);
        });
    };

    /**
     * Allows the user to recall what theatres have been found in
     * their hometown. If they want to look for showtimes in another
     * theatre, or change their favorite theatre.
     */
    intentHandlers.ListLocalTheatresIntent = function (intent, session, response) {
        var speechOutput = '',
            cardOutput = '';
            
        storage.loadTheatre(session, function (currentTheatre) {
                    
            if(currentTheatre.data.localTheatres.length < 1) {
                speechOutput = textHelper.errors.theatresNotFound;
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
        var speechOutput = '',
            cardOutput = '',
            callString = '',
            theatreNameSlot = intent.slots.theatreName,
            theatre = { 'id': 0, 'name': null };

        if (!theatreNameSlot || !theatreNameSlot.value) {
            response.ask('sorry, I didn\'t hear you say a theatre, please say again?');
            return;
        }

        storage.loadTheatre(session, function (currentTheatre) {
            theatre = helperUtil.getMatchingTheatre(currentTheatre.data.localTheatres, theatreNameSlot.value);

            callString = 'theatres/' + theatre.id;
            console.log('API Call: ' + callString);
            api.makeRequest(callString, function apiResponseCallback(err, apiResponse) {
                if (err) {
                    speechOutput = textHelper.errors.amcAPIUnavailable;
                    cardOutput = speechOutput + ' ' + err;
                } else {
                    speechOutput = 'The phone number for ' + theatre.name + ' is: ' + apiResponse.guestServicesPhoneNumber + '.';
                    cardOutput = speechOutput;
                }
                response.tellWithCard(speechOutput, 'AMC Theatre Phone Number', cardOutput);
            });
        });
    };

    /**
     * Returns the address for a theatre, and a link to the directions in the card.
     */
    intentHandlers.GetAddressOfTheatreIntent = function (intent, session, response) {
        var speechOutput = '',
            cardOutput = '',
            callString = '',
            theatreNameSlot = intent.slots.theatreName,
            theatreName = '',
            theatreID =  0,
            checkName = '';

        if (!theatreNameSlot || !theatreNameSlot.value) {
            response.ask('sorry, I didn\'t hear you say a theatre, please say again?');
            return;
        }

        storage.loadTheatre(session, function (currentTheatre) {
            theatreID = currentTheatre.data.favoriteTheatre.id || 0;
            theatreName = currentTheatre.data.favoriteTheatre.name || '';

            if (theatreNameSlot && theatreNameSlot.value) {
                // Loop through the theatres saved locally to find the theatre with the same name.
                currentTheatre.data.localTheatres.forEach(function(element) {
                    theatreName = numberUtil.parseNumbersInString(theatreNameSlot.value);
                    checkName = element.name.replace('AMC ', '').toLowerCase();
                    if(element.name.toLowerCase() == theatreName.toLowerCase() ||
                                        checkName == theatreName.toLowerCase()) {
                        theatreID = element.id;
                    }
                }, this);
            }

            speechOutput += 'The address for ' + theatreName + ' is: ';
            
            callString = 'theatres/' + theatreID;
            console.log('API Call: ' + callString);
            api.makeRequest(callString, function apiResponseCallback(err, apiResponse) {
                if (err) {
                    speechOutput = textHelper.errors.amcAPIUnavailable;
                    cardOutput = speechOutput + ' ' + err;
                } else {
                    speechOutput += apiResponse.location.addressLine1 + ', ';
                    speechOutput += apiResponse.location.cityUrlSuffixText + ', ';
                    speechOutput += apiResponse.location.stateUrlSuffixText + '.';
                    cardOutput = speechOutput;

                    speechOutput += ' See the card for a link to get directions.';
                    cardOutput += ' Directions ' + apiResponse.location.directionsUrl + '.';
                }
                response.tellWithCard(speechOutput, 'AMC Theatre Address', cardOutput);
            });
        });
    };
    
    /**
     * Get a list of movies that are playing at their favorite theatre today.
     * If no favorite theatre is set, the default API call is made that
     * lists the movies that are playing at all theatres.
     */
    intentHandlers.NowPlayingIntent = function (intent, session, response) {
        var speechOutput = 'Now playing at a theatre near you.',
            cardOutput = '',
            callString = '',
            weekdayNameSlot = intent.slots.weekday,
            weekday = new Date(),
            weekdayResponse = 'today',
            theatreNameSlot = intent.slots.theatreName,
            theatre = { 'id': 0, 'name': '' },
            movies = new Array();

        // Optional. Defaults to 'today'.
        if (weekdayNameSlot && weekdayNameSlot.value) {
            weekdayResponse = weekdayNameSlot.value;
        }

        storage.loadTheatre(session, function (currentTheatre) {
            weekday = dateUtil.getDayFromString(weekdayResponse, currentTheatre.data.location.utcOffset);

            // Optional. Defaults to the favorite theatre.
            if (theatreNameSlot && theatreNameSlot.value) {
                theatre = helperUtil.getMatchingTheatre(currentTheatre.data.localTheatres, theatreNameSlot.value);
            } else {
                theatre.id = currentTheatre.data.favoriteTheatre.id;
                theatre.name = currentTheatre.data.favoriteTheatre.name;
                console.log('Using saved theatre');
            }
                    
            if(theatre.id > 0) {
                speechOutput = 'Now playing at ' + theatre.name + '. ';
                
                callString = 'theatres/' + theatre.id + '/showtimes/' + weekday;
                console.log('API Call: ' + callString);
                api.makeRequest(callString, function apiResponseCallback(err, apiResponse) {
                    if (err) {
                        speechOutput = textHelper.errors.amcAPIUnavailable;
                        cardOutput = speechOutput + ' ' + err;
                    } else {
                        movies = apiResponse._embedded.showtimes;
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
                console.log('API Call: movies/views/now-playing');
                api.makeRequest('movies/views/now-playing', function apiResponseCallback(err, apiResponse) {
                    if (err) {
                        speechOutput = textHelper.errors.amcAPIUnavailable;
                        cardOutput = speechOutput + ' ' + err;
                    } else {
                        movies = apiResponse._embedded.movies;
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
        var speechOutput = 'Coming soon to a theatre near you.',
            cardOutput = '',
            movies = new Array();

        storage.loadTheatre(session, function (currentTheatre) {
            console.log('API Call: movies/views/coming-soon');
            api.makeRequest('movies/views/coming-soon', function apiResponseCallback(err, apiResponse) {
                if (err) {
                    speechOutput = textHelper.errors.amcAPIUnavailable;
                    cardOutput = speechOutput + ' ' + err;
                } else {
                    movies = apiResponse._embedded.movies;
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
     * Sorted by regular showing first, then 3-D showings.
     */
    intentHandlers.GetMovieShowtimesIntent = function (intent, session, response) {
        var speechOutput = '',
            cardOutput = '',
            callString = '',
            movieNameSlot = intent.slots.movieName,
            movieName = '',
            weekdayNameSlot = intent.slots.weekday,
            weekdayResponse = 'today',
            weekday = new Date(),
            theatreNameSlot = intent.slots.theatreName,
            theatre = { 'id': 0, 'name': null },
            movies = new Array();

        // Verify that the input slots have values.
        if (!movieNameSlot || !movieNameSlot.value) {
            speechOutput = textHelper.errors.misheardMovieTitle;
            response.ask(speechOutput, 'What was that movie again?');
            return;
        }
        movieName = helperUtil.replaceAll(movieNameSlot.value, ' ', '-');
        
        // Optional. Defaults to 'today'.
        if (weekdayNameSlot && weekdayNameSlot.value) {
            weekdayResponse = weekdayNameSlot.value;
        }
        
        storage.loadTheatre(session, function (currentTheatre) {
            weekday = dateUtil.getDayFromString(weekdayResponse, currentTheatre.data.location.utcOffset);
            
            // Optional. Defaults to the favorite theatre.
            if (theatreNameSlot && theatreNameSlot.value) {
                theatre = helperUtil.getMatchingTheatre(currentTheatre.data.localTheatres, theatreNameSlot.value);

            } else {
                theatre.id = currentTheatre.data.favoriteTheatre.id;
                console.log('Using saved theatre');
            }
            
            callString = 'theatres/' + theatre.id + '/showtimes/' + weekday + '/?movie=' + movieName;            
            console.log('API Call: ' + callString);
            api.makeRequest(callString, function apiResponseCallback(err, apiResponse) {
                    
                if (err) { // If there's an error finding the movie, try again, this time parsing the movie name for numbers.
                    movieName = numberUtil.parseNumbersInString(movieName);
                    callString = 'theatres/' + theatre.id + '/showtimes/' + weekday + '/?movie=' + movieName;
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
                            movies = apiResponse._embedded.showtimes;
                            
                            if(movies.length < 1) {
                                speechOutput = textHelper.errors.movieNotFound;
                            } else {
                                speechOutput += helperUtil.getShowtimeString(movies, currentTheatre, weekdayResponse);
                            }
                            cardOutput = speechOutput;
                        }
                        response.tellWithCard(speechOutput, 'AMC Movie Showtimes', cardOutput);
                    });
                } else {
                    movies = apiResponse._embedded.showtimes;
                    
                    if(movies.length < 1) {
                        speechOutput = textHelper.errors.movieNotFound;
                    } else {
                        speechOutput += helperUtil.getShowtimeString(movies, currentTheatre, weekdayResponse);
                    }
                    cardOutput = speechOutput;
                    response.tellWithCard(speechOutput, 'AMC Movie Showtimes', cardOutput);
                }
            });
        });
    };

    /**
     * Gets the sysnopsis of a movie.
     */
    intentHandlers.GetMovieSynopsis = function (intent, session, response) {
        var speechOutput = '',
            cardOutput = '',
            callString = '',
            movieNameSlot = intent.slots.movieName,
            movieName = '';

        // Verify that the input slots have values.
        if (!movieNameSlot || !movieNameSlot.value) {
            speechOutput = textHelper.errors.misheardMovieTitle;
            response.ask(speechOutput, 'What was that movie again?');
            return;
        }
        movieName = helperUtil.replaceAll(movieNameSlot.value, ' ', '-');
        
        storage.loadTheatre(session, function (currentTheatre) {
            
            callString = 'movies/' + movieName;            
            console.log('API Call: ' + callString);
            api.makeRequest(callString, function apiResponseCallback(err, apiResponse) {
                    
                if (err) { // If there's an error finding the movie, try again, this time parsing the movie name for numbers.
                    movieName = numberUtil.parseNumbersInString(movieName);
                    callString = 'movies/' + movieName;            
                    api.makeRequest(callString, function apiResponseCallback(err, apiResponse) {

                        if (err) {
                            if(err.code == 5302) {
                                speechOutput = textHelper.errors.movieNotFound;
                                cardOutput = speechOutput + ' ' + err;
                            } else {
                                speechOutput = textHelper.errors.amcAPIUnavailable;
                                cardOutput = speechOutput + ' ' + err;
                            }
                        } else {
                            speechOutput = apiResponse.name + ': ' + apiResponse.synopsis;
                            cardOutput = speechOutput;
                        }
                        response.tellWithCard(speechOutput, 'AMC Movie Synopsis', cardOutput);
                    });
                } else {
                    speechOutput = apiResponse.name + ': ' + apiResponse.synopsis;
                    cardOutput = speechOutput;
                    response.tellWithCard(speechOutput, 'AMC Movie synopsis', cardOutput);
                }
            });
        });
    };
    
    /**
     * Gets the MPAA rating of a movie.
     */
    intentHandlers.GetMovieMPAARating = function (intent, session, response) {
        var speechOutput = '',
            cardOutput = '',
            callString = '',
            movieNameSlot = intent.slots.movieName,
            movieName = '';

            // Verify that the input slots have values.
        if (!movieNameSlot || !movieNameSlot.value) {
            speechOutput = textHelper.errors.misheardMovieTitle;
            response.ask(speechOutput, 'What was that movie again?');
            return;
        }
        movieName = helperUtil.replaceAll(movieNameSlot.value, ' ', '-');
        
        storage.loadTheatre(session, function (currentTheatre) {
            
            callString = 'movies/' + movieName;            
            console.log('API Call: ' + callString);
            api.makeRequest(callString, function apiResponseCallback(err, apiResponse) {
                    
                if (err) { // If there's an error finding the movie, try again, this time parsing the movie name for numbers.
                    movieName = numberUtil.parseNumbersInString(movieName);
                    callString = 'movies/' + movieName;            
                    api.makeRequest(callString, function apiResponseCallback(err, apiResponse) {

                        if (err) {
                            if(err.code == 5302) {
                                speechOutput = textHelper.errors.movieNotFound;
                                cardOutput = speechOutput + ' ' + err;
                            } else {
                                speechOutput = textHelper.errors.amcAPIUnavailable;
                                cardOutput = speechOutput + ' ' + err;
                            }
                        } else {
                            speechOutput = apiResponse.name + ' is rated ' + apiResponse.mpaaRating;
                            cardOutput = speechOutput;
                        }
                        response.tellWithCard(speechOutput, 'AMC Movie MPAA Rating', cardOutput);
                    });
                } else {
                    speechOutput = apiResponse.name + ' is rated ' + apiResponse.mpaaRating;
                    cardOutput = speechOutput;
                    response.tellWithCard(speechOutput, 'AMC Movie MPAA Rating', cardOutput);
                }
            });
        });
    };

    /**
     * Gets the run time of a movie.
     */
    intentHandlers.GetMovieRunTime = function (intent, session, response) {
        var speechOutput = '',
            cardOutput = '',
            callString = '',
            movieNameSlot = intent.slots.movieName,
            movieName = '';

            // Verify that the input slots have values.
        if (!movieNameSlot || !movieNameSlot.value) {
            speechOutput = textHelper.errors.misheardMovieTitle;
            response.ask(speechOutput, 'What was that movie again?');
            return;
        }
        movieName = helperUtil.replaceAll(movieNameSlot.value, ' ', '-');
        
        storage.loadTheatre(session, function (currentTheatre) {
            
            callString = 'movies/' + movieName;            
            console.log('API Call: ' + callString);
            api.makeRequest(callString, function apiResponseCallback(err, apiResponse) {
                    
                if (err) { // If there's an error finding the movie, try again, this time parsing the movie name for numbers.
                    movieName = numberUtil.parseNumbersInString(movieName);
                    callString = 'movies/' + movieName;            
                    api.makeRequest(callString, function apiResponseCallback(err, apiResponse) {

                        if (err) {
                            if(err.code == 5302) {
                                speechOutput = textHelper.errors.movieNotFound;
                                cardOutput = speechOutput + ' ' + err;
                            } else {
                                speechOutput = textHelper.errors.amcAPIUnavailable;
                                cardOutput = speechOutput + ' ' + err;
                            }
                        } else {
                            speechOutput = apiResponse.name + ' is ' + helperUtil.GetRunTimeString(apiResponse.runTime) + ' long';
                            cardOutput = speechOutput;
                        }
                        response.tellWithCard(speechOutput, 'AMC Movie Run Time', cardOutput);
                    });
                } else {
                    speechOutput = apiResponse.name + ' is ' + helperUtil.GetRunTimeString(apiResponse.runTime) + ' long';
                    cardOutput = speechOutput;
                    response.tellWithCard(speechOutput, 'AMC Movie Run Time', cardOutput);
                }
            });
        });
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