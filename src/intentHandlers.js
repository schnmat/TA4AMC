// Alexa SDK for JavaScript v1.0.00
// Copyright (c) 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved. Use is subject to license terms.
'use strict';
var textHelper  = require('./textHelper'),
    helperUtil  = require('./helperFunctions'),
    numberUtil  = require('./numberFunctions'),
    dateUtil    = require('./dateFunctions'),
    api         = require('./apiHandlers'),
    storage     = require('./storage');

var registerIntentHandlers = function (intentHandlers, skillContext) {
/**
 * Format:
 * 
 * intentHandlers.INTENT_NAME = function (intent, session, response) {
 *  var speechOutput = '',
 *      cardTitle = 'CARD TITLE',
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
 *              console.log(err);
 *              speechOutput = err;
 *              cardOutput = speechOutput;
 *          } else {
 *              // Success.
 *              cardOutput = speechOutput;
 *          }
 * 
 *          // Return response:
 *          currentTheatre.data.lastAction = { 'lastSpeechOutput': speechOutput, 'lastCardTitle': cardTitle, 'lastCardOutput': cardOutput };
 *          currentTheatre.save(function () { });
 *          response.tellWithCard(speechOutput, cardTitle, cardOutput);
 *      
 *      }); //End API
 *  }); //End Session Load
 * }; //End Intent
 * 
 */    

    /**
     * The built-in cancel function that Amazon uses doesn't carry over into
     * skills. So an intent to cancel or stop an interaction needs to be made.
     */
    intentHandlers.EndIntent = function (intent, session, response) {
        response.tell(''); // Will end session.
    };

    /**
     * Repeat fucntion to get the last response that was said.
     */
    intentHandlers.RepeatIntent = function (intent, session, response) {
        console.log('Repeating...');
        storage.loadTheatre(session, function (currentTheatre) {
            console.log('Theatre Loaded: ' + currentTheatre.data.lastAction);
            if(typeof currentTheatre.data.lastAction === 'object') {
                response.tellWithCard(currentTheatre.data.lastAction.lastSpeechOutput, currentTheatre.data.lastAction.lastCardTitle, currentTheatre.data.lastAction.lastCardOutput);
            } else {
                response.tell('I have nothing to repeat');
            }
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
        var speechOutput = '',
            cardTitle = 'AMC Zip Code Request',
        	cardOutput = '',
            callString = '',
            zipCodeSlot = intent.slots.zipCode,
            zipCode = 0,
            city = '',
            state = '',
            theatres = new Array();

        if (!zipCodeSlot || !zipCodeSlot.value) {
            response.ask(textHelper.errors.misheardZipCode + textHelper.errors.reprompt);
            return;
        }
        var zipCode = parseInt(zipCodeSlot.value);
        if (isNaN(zipCode)) {
            console.log('Invalid zip code = ' + zipCode);
            response.ask(textHelper.errors.misheardZipCode + textHelper.errors.reprompt);
            return;
        }
 
        storage.loadTheatre(session, function (currentTheatre) {

            currentTheatre.data.location.zipCode = zipCode;
            speechOutput += 'Thank you, saving zip code, ' + zipCode + '. ';

            api.fetchLocation('address=' + zipCode, function apiResponseCallback(err, apiResponse) {
                if (err) {
                    console.log(err);
                    speechOutput = err;
                    cardOutput = speechOutput;
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
                            console.log(err);
                            speechOutput = err;
                            cardOutput = speechOutput;
                        } else {
                            theatres = apiResponse._embedded.theatres;

                            currentTheatre.data.localTheatres = new Array();
                            
                            if(theatres.length < 1) {
                                speechOutput += textHelper.errors.localTheatresNotFound;
                            } else {
                                currentTheatre.data.location.utcOffset = helperUtil.replaceAll(theatres[0].utcOffset, ':', '.');
                                theatres.forEach(function(element) {
                                    currentTheatre.data.localTheatres.push({'id': element.id, 'name': element.name});                          
                                }, this);

                                currentTheatre.data.favoriteTheatre = {'id': currentTheatre.data.localTheatres[0].id, 'name': currentTheatre.data.localTheatres[0].name};
                                if(theatres.length === 1) {
                                    speechOutput += 'I found one theatre in your city. ' + currentTheatre.data.localTheatres[0].name + '. It has been set as your favorite.';
                                } else {
                                    speechOutput += 'Here are the theatres I found in your city. The first one has been set as your favorite.';
                                    for(var i = 0, l = currentTheatre.data.localTheatres.length; i < l; i++) {
                                        speechOutput += currentTheatre.data.localTheatres[i].name + ', ';
                                    }

                                }
                            }
	                        cardOutput = speechOutput;
                        }
                        
                        currentTheatre.data.lastAction = { 'lastSpeechOutput': speechOutput, 'lastCardTitle': cardTitle, 'lastCardOutput': cardOutput };
                        currentTheatre.save(function () {
                            response.tellWithCard(speechOutput, cardTitle, cardOutput);
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
            var speechOutput = 'The zip code that I have saved is, ' + currentTheatre.data.location.zipCode + '.',
                cardTitle = 'AMC Zip Code Request',
                that = this;

            if(currentTheatre.data.location.zipCode == 0) {
                speechOutput = 'I have no zip code saved.';
            }
            
            
            currentTheatre.data.lastAction = { 'lastSpeechOutput': speechOutput, 'lastCardTitle': cardTitle, 'lastCardOutput': '' };
            currentTheatre.save(function () { });
            response.tellWithCard(speechOutput, cardTitle, speechOutput);
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
            cardTitle = 'AMC Location Request',
        	cardOutput = '',
            callString = '',
            citySlot = intent.slots.city,
        	stateSlot = intent.slots.state,
            theatres = new Array();

        if (!citySlot || !citySlot.value) {
            response.ask(textHelper.errors.misheardCity + textHelper.errors.reprompt);
            return;
        }
        if (!stateSlot || !stateSlot.value) {
            response.ask(textHelper.errors.misheardState + textHelper.errors.reprompt);
            return;
        }

        storage.loadTheatre(session, function (currentTheatre) {

            //Note: City and State needs to have spaces replaced with dashes.
            callString = 'theatres?state=' + stateSlot.value.replace(' ', '-') + '&city=' + citySlot.value.replace(' ', '-');
            console.log('API Call: ' + callString);
            api.makeRequest(callString, function apiResponseCallback(err, apiResponse) {
                if (err) {
                    console.log(err);
                    speechOutput = err;
                    cardOutput = speechOutput;
                } else {
                    theatres = apiResponse._embedded.theatres;
                    currentTheatre.data.localTheatres = new Array(); // Load the theatres into an array
                    
                    if(theatres.length < 1) {
                        speechOutput += textHelper.errors.localTheatresNotFound;
                    } else {
                        currentTheatre.data.location.utcOffset = helperUtil.replaceAll(theatres[0].utcOffset, ':', '.');
                        theatres.forEach(function(element) {
                            currentTheatre.data.localTheatres.push({'id': element.id, 'name': element.name});                          
                        }, this);

                        currentTheatre.data.favoriteTheatre = {'id': currentTheatre.data.localTheatres[0].id, 'name': currentTheatre.data.localTheatres[0].name};
                        if(theatres.length === 1) {
                            speechOutput += 'I found one theatre in your city. ' + currentTheatre.data.localTheatres[0].name + '. It has been set as your favorite.';
                        } else {
                            speechOutput += 'Here are the theatres that I found in your city. The first one has been set as your favorite.';
                            for(var i = 0, l = currentTheatre.data.localTheatres.length; i < l; i++) {
                                speechOutput += currentTheatre.data.localTheatres[i].name + ', ';
                            }
                            speechOutput = helperUtil.replaceLast(speechOutput, ', ', '.');
                            if(speechOutput.lastIndexOf(',') >= 0) {
                                speechOutput = helperUtil.replaceLast(speechOutput, ',', ', and');
                            }
                                                        
                            // Set the city + state and default to what was requested if something goes wrong.
                            currentTheatre.data.location.city = theatres[0].location.city || citySlot.value;
                            currentTheatre.data.location.state = theatres[0].location.stateName || stateSlot.value;
                            currentTheatre.data.location.zipCode = theatres[0].location.postalCode;
                        }
                    }
                    cardOutput = speechOutput;
                }
                
                currentTheatre.data.lastAction = { 'lastSpeechOutput': speechOutput, 'lastCardTitle': cardTitle, 'lastCardOutput': cardOutput };
                currentTheatre.save(function () {
                    response.tellWithCard(speechOutput, cardTitle, cardOutput);
                });
            });
        });
    };
    
    /**
     * Allows the user to ask what City and State have been saved
     * to check and make sure that it's correct.
     */
    intentHandlers.GetSavedLocationIntent = function (intent, session, response) {
        var speechOutput = '',
            cardTitle = 'AMC Location Request';

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

            currentTheatre.data.lastAction = { 'lastSpeechOutput': speechOutput, 'lastCardTitle': cardTitle, 'lastCardOutput': cardOutput };
            currentTheatre.save(function () { });
            response.tellWithCard(speechOutput, cardTitle, speechOutput);
        });
    };

    /**
     * Selects one of the theatres that have been found at the user's location
     * and saves it as the favorite to be used by default for showtimes.
     */
    intentHandlers.SetFavoriteTheatreIntent = function (intent, session, response) {
        var speechOutput = textHelper.errors.theatreNotFound,
            cardTitle = 'AMC Favorite Theatre Request',
            cardOutput = textHelper.errors.theatreNotFound,
            callStrings = new Array(),
            favoriteTheatreSlot = intent.slots.favoriteTheatre,
            favoriteTheatre = '',
            theatre = {'id': 0, 'name': ''},
            checkName = '';
        
        if (!favoriteTheatreSlot || !favoriteTheatreSlot.value) {
            response.ask(textHelper.errors.misheardTheatreName + textHelper.errors.reprompt);
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
                    theatre = {'id': element.id, 'name': element.name};
                    currentTheatre.data.favoriteTheatre = theatre;             
                    speechOutput = 'Thank you, saving your favorite theatre, ' + element.name + '. ';
                }
            }, this);

            // Try and find the theatre if it couldn't be found in the saved local theatre list.
            if(theatre.id == 0) {
                favoriteTheatre = helperUtil.replaceAll(favoriteTheatre, ' ', '-');

                // Find the theatre to look in:
                callStrings.push('theatres/' + favoriteTheatre);
                callStrings.push('theatres/amc-' + favoriteTheatre); 
                callStrings.push('theatres/' + numberUtil.parseNumbersInString(favoriteTheatre));
                callStrings.push('theatres/amc-' + numberUtil.parseNumbersInString(favoriteTheatre));

                console.log('API Call: ' + callStrings);
                api.tryMultipleRequests(callStrings, function apiResponseCallback(err, theatreResponse) {
                    if (err) {
                        console.log(err);
                        speechOutput = err;
                        cardOutput = speechOutput;
                    } else {
                        speechOutput = 'Thank you, saving your favorite theatre, ' + theatreResponse.name + '. ';
                        cardOutput = speechOutput;

                        currentTheatre.data.favoriteTheatre = {'id': theatreResponse.id, 'name': theatreResponse.name};
                        currentTheatre.data.location = { 'city': theatreResponse.location.city,
                                                         'state': theatreResponse.location.state,
                                                         'zipCode': theatreResponse.location.postalCode,
                                                         'utcOffset': helperUtil.replaceAll(theatreResponse.utcOffset, ':', '.') };
                    }
                    currentTheatre.data.lastAction = { 'lastSpeechOutput': speechOutput, 'lastCardTitle': cardTitle, 'lastCardOutput': cardOutput };
                    currentTheatre.save(function () { });
                    response.tellWithCard(speechOutput, cardTitle, cardOutput);
                });
            } else {
                currentTheatre.data.lastAction = { 'lastSpeechOutput': speechOutput, 'lastCardTitle': cardTitle, 'lastCardOutput': cardOutput };
                currentTheatre.save(function () { });
                response.tellWithCard(speechOutput, cardTitle, cardOutput);
            }
        });
    };
    
    /**
     * Simply allows the user to ask what theatre has been saved
     * as their favorite theatre to check and make sure that it's correct.
     */
    intentHandlers.GetFavoriteTheatreIntent = function (intent, session, response) {
        var speechOutput = '',
            cardTitle = 'AMC Favorite Theatre Request';
        
        storage.loadTheatre(session, function (currentTheatre) {
            speechOutput = 'The theatre that I have saved as your favorite is, ' + currentTheatre.data.favoriteTheatre.name +'.';

            if(!currentTheatre.data.favoriteTheatre.name) {
                speechOutput = 'I have no theatre saved as your favorite.';
            }

            currentTheatre.data.lastAction = { 'lastSpeechOutput': speechOutput, 'lastCardTitle': cardTitle, 'lastCardOutput': cardOutput };
            currentTheatre.save(function () { });
            response.tellWithCard(speechOutput, cardTitle, speechOutput);
        });
    };

    /**
     * Allows the user to recall what theatres have been found in
     * their hometown. If they want to look for showtimes in another
     * theatre, or change their favorite theatre.
     */
    intentHandlers.ListLocalTheatresIntent = function (intent, session, response) {
        var speechOutput = '',
            cardTitle = 'AMC Theatres Near You',
            cardOutput = '',
            callString = '',
            citySlot = intent.slots.city,
        	stateSlot = intent.slots.state,
            cityName = '',
            stateName = '',
            localTheatres = new Array(),
            theatres = new Array();

        storage.loadTheatre(session, function (currentTheatre) {
            if (citySlot && citySlot.value) {
                cityName = citySlot.value.replace(' ', '-');
            } else {
                cityName = currentTheatre.data.location.city.replace(' ', '-');
            }

            if (stateSlot && stateSlot.value) {
                stateName = stateSlot.value.replace(' ', '-');
            } else {
                stateName = currentTheatre.data.location.state.replace(' ', '-');
            }

            if (cityName == '' || stateName == '') {
                response.tell('I\'m sorry, I don\'t seem to know where to look. Perhaps I misheard the city or state name.');
            }

            //Note: City and State needs to have spaces replaced with dashes.
            callString = 'theatres?state=' + stateName + '&city=' + cityName;
            console.log('API Call: ' + callString);
            api.makeRequest(callString, function apiResponseCallback(err, apiResponse) {
                if (err) {
                    console.log(err);
                    speechOutput = err;
                    cardOutput = speechOutput;
                } else {
                    theatres = apiResponse._embedded.theatres;
                    
                    if(theatres.length < 1) {
                        speechOutput += textHelper.errors.localTheatresNotFound;
                    } else {
                        theatres.forEach(function(element) {
                            localTheatres.push({'id': element.id, 'name': element.name});                          
                        }, this);

                        if(theatres.length === 1) {
                            speechOutput += 'I found one theatre in your city. ' + localTheatres[0].name + '.';
                        } else {
                            speechOutput += 'Here are the theatres that I found in your city: ';
                            for(var i = 0, l = localTheatres.length; i < l; i++) {
                                speechOutput += localTheatres[i].name + ', ';
                            }
                            speechOutput = helperUtil.replaceLast(speechOutput, ', ', '.');
                            if(speechOutput.lastIndexOf(',') >= 0) {
                                speechOutput = helperUtil.replaceLast(speechOutput, ',', ', and');
                            }
                        }
                    }
                    cardOutput = speechOutput;
                }
                
                currentTheatre.data.lastAction = { 'lastSpeechOutput': speechOutput, 'lastCardTitle': cardTitle, 'lastCardOutput': cardOutput };
                currentTheatre.save(function () { });
                response.tellWithCard(speechOutput, cardTitle, cardOutput);
            });
        });
    };

    /**
     * Returns the phone number for a theatre.
     */
    intentHandlers.GetPhoneNumberForTheatreIntent = function (intent, session, response) {
        var speechOutput = '',
            cardTitle = 'AMC Theatre Phone Number',
            cardOutput = '',
            callString = '',
            callStrings = new Array(),
            theatreNameSlot = intent.slots.theatreName,
            theatre = { 'id': 0, 'name': '' };

        // Verify that the input slots have values.
        if (!theatreNameSlot || !theatreNameSlot.value) {
            response.ask(textHelper.errors.misheardTheatreName + textHelper.errors.reprompt);
            return;
        }

        storage.loadTheatre(session, function (currentTheatre) {
            theatre = helperUtil.getMatchingTheatre(currentTheatre.data.localTheatres, theatreNameSlot.value);

            if(theatre.id > 0) {
                callString = 'theatres/' + theatre.id;
                console.log('API Call: ' + callString);
                api.makeRequest(callString, function apiResponseCallback(err, apiResponse) {
                    if (err) {
                        console.log(err);
                        speechOutput = err;
                        cardOutput = speechOutput;
                    } else {
                        speechOutput = 'The phone number for ' + apiResponse.name + ' is: ' + apiResponse.guestServicesPhoneNumber + '.';
                        cardOutput = speechOutput;
                    }

                    currentTheatre.data.lastAction = { 'lastSpeechOutput': speechOutput, 'lastCardTitle': cardTitle, 'lastCardOutput': cardOutput };
                    currentTheatre.save(function () { });
                    response.tellWithCard(speechOutput, cardTitle, cardOutput);
                });
            } else {
                theatre.name = helperUtil.replaceAll(theatreNameSlot.value, ' ', '-');

                // Find the theatre to look in:
                callStrings.push('theatres/' + theatre.name);
                callStrings.push('theatres/amc-' + theatre.name); 
                callStrings.push('theatres/' + numberUtil.parseNumbersInString(theatre.name));
                callStrings.push('theatres/amc-' + numberUtil.parseNumbersInString(theatre.name));

                console.log('API Call: ' + callStrings);
                api.tryMultipleRequests(callStrings, function apiResponseCallback(err, theatreResponse) {
                    if (err) {
                        console.log(err);
                        speechOutput = err;
                        cardOutput = speechOutput;

                        currentTheatre.data.lastAction = { 'lastSpeechOutput': speechOutput, 'lastCardTitle': cardTitle, 'lastCardOutput': cardOutput };
                        currentTheatre.save(function () { });
                        response.tellWithCard(speechOutput, cardTitle, cardOutput);
                    } else {
                        theatre.id = theatreResponse.id;

                        callString = 'theatres/' + theatre.id;
                        console.log('API Call: ' + callString);
                        api.makeRequest(callString, function apiResponseCallback(err, apiResponse) {
                            if (err) {
                                console.log(err);
                                speechOutput = err;
                                cardOutput = speechOutput;
                            } else {
                                speechOutput = 'The phone number for ' + apiResponse.name + ' is: ' + apiResponse.guestServicesPhoneNumber + '.';
                                cardOutput = speechOutput;
                            }

                            currentTheatre.data.lastAction = { 'lastSpeechOutput': speechOutput, 'lastCardTitle': cardTitle, 'lastCardOutput': cardOutput };
                            currentTheatre.save(function () { });
                            response.tellWithCard(speechOutput, cardTitle, cardOutput);
                        });
                    }
                });
            }
        });
    };

    /**
     * Returns the address for a theatre, and a link to the directions in the card.
     */
    intentHandlers.GetAddressOfTheatreIntent = function (intent, session, response) {
        var speechOutput = '',
            cardTitle = 'AMC Theatre Address',
            cardOutput = '',
            callString = '',
            callStrings = new Array(),
            theatreNameSlot = intent.slots.theatreName,
            theatre = {'id': 0, 'name': ''};

        // Verify that the input slots have values.
        if (!theatreNameSlot || !theatreNameSlot.value) {
            response.ask(textHelper.errors.misheardTheatreName + textHelper.errors.reprompt);
            return;
        }

        storage.loadTheatre(session, function (currentTheatre) {
            theatre.name = theatreNameSlot.value || '';

            // Optional. Defaults to the favorite theatre.
            if (theatreNameSlot && theatreNameSlot.value) {
                theatre = helperUtil.getMatchingTheatre(currentTheatre.data.localTheatres, theatreNameSlot.value);
                
                if(theatre.id == 0) {
                    console.log('No local theatre: ' + theatreNameSlot.value);
                    theatre.name = theatreNameSlot.value;
                }
            } else {
                theatre.id = currentTheatre.data.favoriteTheatre.id;
                theatre.name = currentTheatre.data.favoriteTheatre.name;
            }

            if (theatre.id > 0) {
                speechOutput += 'The address for ' + theatre.name + ' is: ';
                
                callString = 'theatres/' + theatre.id;
                console.log('API Call: ' + callString);
                api.makeRequest(callString, function apiResponseCallback(err, apiResponse) {
                    if (err) {
                        console.log(err);
                        speechOutput = err;
                        cardOutput = speechOutput;
                    } else {
                        speechOutput += apiResponse.location.addressLine1 + ', ';
                        speechOutput += apiResponse.location.cityUrlSuffixText + ', ';
                        speechOutput += apiResponse.location.stateUrlSuffixText + '.';
                        cardOutput = speechOutput;
                    }

                    currentTheatre.data.lastAction = { 'lastSpeechOutput': speechOutput, 'lastCardTitle': cardTitle, 'lastCardOutput': cardOutput };
                    currentTheatre.save(function () { });
                    response.tellWithCard(speechOutput, cardTitle, cardOutput);
                });
            } else {
                theatre.name = helperUtil.replaceAll(theatreNameSlot.value, ' ', '-');

                // Find the theatre to look in:
                callStrings.push('theatres/' + theatre.name);
                callStrings.push('theatres/amc-' + theatre.name); 
                callStrings.push('theatres/' + numberUtil.parseNumbersInString(theatre.name));
                callStrings.push('theatres/amc-' + numberUtil.parseNumbersInString(theatre.name));

                console.log('API Call: ' + callStrings);
                api.tryMultipleRequests(callStrings, function apiResponseCallback(err, theatreResponse) {
                    if (err) {
                        console.log(err);
                        speechOutput = err;
                        cardOutput = speechOutput;

                        currentTheatre.data.lastAction = { 'lastSpeechOutput': speechOutput, 'lastCardTitle': cardTitle, 'lastCardOutput': cardOutput };
                        currentTheatre.save(function () { });
                        response.tellWithCard(speechOutput, cardTitle, cardOutput);
                    } else {
                        theatre.id = theatreResponse.id;
                
                        callString = 'theatres/' + theatre.id;
                        console.log('API Call: ' + callString);
                        api.makeRequest(callString, function apiResponseCallback(err, apiResponse) {
                            if (err) {
                                console.log(err);
                                speechOutput = err;
                                cardOutput = speechOutput;
                            } else {
                                speechOutput += 'The address for ' + apiResponse.name + ' is: ';
                                speechOutput += apiResponse.location.addressLine1 + ', ';
                                speechOutput += apiResponse.location.cityUrlSuffixText + ', ';
                                speechOutput += apiResponse.location.stateUrlSuffixText + '.';
                                cardOutput = speechOutput;
                            }

                            currentTheatre.data.lastAction = { 'lastSpeechOutput': speechOutput, 'lastCardTitle': cardTitle, 'lastCardOutput': cardOutput };
                            currentTheatre.save(function () { });
                            response.tellWithCard(speechOutput, cardTitle, cardOutput);
                        });
                    }
                });
            }
        });
    };
    
    /**
     * Get a list of movies that are playing at their favorite theatre today.
     * If no favorite theatre is set, the default API call is made that
     * lists the movies that are playing at all theatres.
     */
    intentHandlers.NowPlayingIntent = function (intent, session, response) {
        var speechOutput = 'Now playing at a theatre near you. ',
            cardTitle = 'AMC Movies Now Playing',
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
                
                if(theatre.id == 0) {
                    console.log('No local theatre: ' + theatreNameSlot.value);
                    theatre.name = theatreNameSlot.value;
                }
            } else {
                theatre.id = currentTheatre.data.favoriteTheatre.id;
            }
                    
            if(theatre.id > 0) {
                speechOutput = 'Now playing at ' + theatre.name + ': ';
                
                callString = 'theatres/' + theatre.id + '/showtimes/' + weekday;
                console.log('API Call: ' + callString);
                api.makeRequest(callString, function apiResponseCallback(err, apiResponse) {
                    if (err) {
                        console.log(err);
                        speechOutput = err;
                        cardOutput = speechOutput;
                    } else {
                        movies = apiResponse._embedded.showtimes;
                        for(var i = 0, l = movies.length; i < l; i++) {
                            if(speechOutput.indexOf(movies[i].movieName) < 0) {
                                speechOutput += movies[i].movieName + ', ';
                            }
                        }
                        speechOutput = helperUtil.replaceLast(speechOutput, ', ', '.');
                        if(speechOutput.lastIndexOf(',') >= 0) {
                            speechOutput = helperUtil.replaceLast(speechOutput, ',', ', and');
                        }
                        cardOutput = speechOutput;
                    }

                    currentTheatre.data.lastAction = { 'lastSpeechOutput': speechOutput, 'lastCardTitle': cardTitle, 'lastCardOutput': cardOutput };
                    currentTheatre.save(function () { });
                    response.tellWithCard(speechOutput, cardTitle, cardOutput);
                });                
            } else {
                console.log('API Call: movies/views/now-playing');
                api.makeRequest('movies/views/now-playing', function apiResponseCallback(err, apiResponse) {
                    if (err) {
                        console.log(err);
                        speechOutput = err;
                        cardOutput = speechOutput;
                    } else {
                        movies = apiResponse._embedded.movies;
                        for(var i = 0, l = movies.length; i < l; i++) {
                            if(speechOutput.indexOf(movies[i].movieName) < 0) {
                                speechOutput += movies[i].movieName + ', ';
                            }
                        }
                        speechOutput = helperUtil.replaceLast(speechOutput, ', ', '.');
                        if(speechOutput.lastIndexOf(',') >= 0) {
                            speechOutput = helperUtil.replaceLast(speechOutput, ',', ', and');
                        }
                        cardOutput = speechOutput;
                    }

                    currentTheatre.data.lastAction = { 'lastSpeechOutput': speechOutput, 'lastCardTitle': cardTitle, 'lastCardOutput': cardOutput };
                    currentTheatre.save(function () { });
                    response.tellWithCard(speechOutput, cardTitle, cardOutput);
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
        var speechOutput = 'Coming soon to a theatre near you: ',
            cardTitle = 'AMC Movies Coming Soon',
            cardOutput = '',
            movies = new Array();

        storage.loadTheatre(session, function (currentTheatre) {
            console.log('API Call: movies/views/coming-soon');
            api.makeRequest('movies/views/coming-soon', function apiResponseCallback(err, apiResponse) {
                if (err) {
                    console.log(err);
                    speechOutput = err;
                    cardOutput = speechOutput;
                } else {
                    movies = apiResponse._embedded.movies;
                    for(var i = 0, l = movies.length; i < l; i++) {
                        if(speechOutput.indexOf(movies[i].name) < 0) {
                            speechOutput += movies[i].name + ', ';
                        }
                    }
                    speechOutput = helperUtil.replaceLast(speechOutput, ', ', '.');
                    if(speechOutput.lastIndexOf(',') >= 0) {
                        speechOutput = helperUtil.replaceLast(speechOutput, ',', ', and');
                    }
                    cardOutput = speechOutput;
                }

                currentTheatre.data.lastAction = { 'lastSpeechOutput': speechOutput, 'lastCardTitle': cardTitle, 'lastCardOutput': cardOutput };
                currentTheatre.save(function () { });
                response.tellWithCard(speechOutput, cardTitle, cardOutput);
            });
        });
    };

    /**
     * Returns all the showtimes of a movie for a certain date.
     * Sorted by regular showing first, then 3-D showings.
     */
    intentHandlers.GetMovieShowtimesIntent = function (intent, session, response) {
        var speechOutput = '',
            cardTitle = 'AMC Movie Showtimes',
            cardOutput = '',
            callString = '',
            callStrings = new Array(),
            movieNameSlot = intent.slots.movieName,
            movieName = '',
            weekdayNameSlot = intent.slots.weekday,
            weekdayResponse = 'today',
            weekday = new Date(),
            theatreNameSlot = intent.slots.theatreName,
            theatre = { 'id': 0, 'name': '' },
            movies = new Array();

        // Verify that the input slots have values.
        if (!movieNameSlot || !movieNameSlot.value) {
            response.ask(textHelper.errors.misheardMovieTitle + textHelper.errors.reprompt);
            return;
        }
        movieName = helperUtil.replaceAll(helperUtil.replaceAll(movieNameSlot.value, ' ', '-'), '\'', '-');
        
        // Optional. Defaults to 'today'.
        if (weekdayNameSlot && weekdayNameSlot.value) {
            weekdayResponse = weekdayNameSlot.value;
        }
        
        storage.loadTheatre(session, function (currentTheatre) {
            try {
                weekday = dateUtil.getDayFromString(weekdayResponse, currentTheatre.data.location.utcOffset);
            } catch(err) {
                console.log(err);
                response.tell(textHelper.errors.misheardDate);
            }

            // Optional. Defaults to the favorite theatre.
            if (theatreNameSlot && theatreNameSlot.value) {
                theatre = helperUtil.getMatchingTheatre(currentTheatre.data.localTheatres, theatreNameSlot.value);
                
                if(theatre.id == 0) {
                    console.log('No local theatre: ' + theatreNameSlot.value);
                    theatre.name = theatreNameSlot.value;
                }
            } else {
                theatre.id = currentTheatre.data.favoriteTheatre.id;
            }
                        
            // If no preferred theatre is set, and no theatre is specified. Return an error.
            console.log(theatre.id + ' : ' + theatre.name);
            if(theatre.id == 0 && (theatre.name == '' || theatre.name == null)) {
                console.log('No theatre specified or saved');
                response.tell(textHelper.errors.invalidTheatreID);

            // If no preferred theatre is set, but a theatre name is specified in the request.
            // Try and use the theatre name.
            } else if(theatre.id == 0 && theatre.name != '' && theatre.name != null) {
                console.log('Using theatre: ' + theatre.name);                
                theatre.name = helperUtil.replaceAll(theatre.name, ' ', '-');

                // Find the theatre to look in:
                callStrings.push('theatres/' + theatre.name);
                callStrings.push('theatres/amc-' + theatre.name); 
                callStrings.push('theatres/' + numberUtil.parseNumbersInString(theatre.name));
                callStrings.push('theatres/amc-' + numberUtil.parseNumbersInString(theatre.name));

                console.log('API Call: ' + callStrings);
                api.tryMultipleRequests(callStrings, function apiResponseCallback(err, theatreResponse) {
                    if (err) {
                        console.log(err);
                        speechOutput = err;
                        cardOutput = speechOutput;

                        currentTheatre.data.lastAction = { 'lastSpeechOutput': speechOutput, 'lastCardTitle': cardTitle, 'lastCardOutput': cardOutput };
                        currentTheatre.save(function () { });
                        response.tellWithCard(speechOutput, cardTitle, cardOutput);
                    } else {
                        theatre.id = theatreResponse.id;
                        
                        // Double-check that the movie exists.
                        callStrings = new Array();
                        callStrings.push('movies/' + movieName);
                        callStrings.push('movies/' + numberUtil.parseNumbersInString(movieName));

                        console.log('API Call: ' + callStrings);
                        api.tryMultipleRequests(callStrings, function apiResponseCallback(err, movieResponse) {
                            if (err) {
                                console.log(err);
                                speechOutput = err;
                                cardOutput = speechOutput;

                                currentTheatre.data.lastAction = { 'lastSpeechOutput': speechOutput, 'lastCardTitle': cardTitle, 'lastCardOutput': cardOutput };
                                currentTheatre.save(function () { });
                                response.tellWithCard(speechOutput, cardTitle, cardOutput);
                            } else {
                                // Get the page size of the request.
                                callString = 'theatres/' + theatre.id + '/showtimes/' + weekday + '/?movie=' + movieResponse.slug;            
                                console.log('API Call: ' + callString);
                                api.makeRequest(callString, function apiResponseCallback(err, theatreResponse) {
                                    if (err) {
                                        console.log(err);
                                        speechOutput = err;
                                        cardOutput = speechOutput;
                                    } else {
                                        // Find the movie's showtimes.
                                        callString = 'theatres/' + theatre.id + '/showtimes/' + weekday + '/?movie=' + movieResponse.slug + '&pageSize=' + theatreResponse.count;            
                                        console.log('API Call: ' + callString);
                                        api.makeRequest(callString, function apiResponseCallback(err, theatreResponse) {
                                            if (err) {
                                                console.log(err);
                                                speechOutput = err;
                                                cardOutput = speechOutput;
                                            } else {
                                                movies = theatreResponse._embedded.showtimes;
                                                
                                                if(movies.length < 1) {
                                                    speechOutput = textHelper.errors.movieNotFound;
                                                } else {
                                                    speechOutput += helperUtil.getShowtimeString(movies, weekdayResponse);
                                                }
                                                cardOutput = speechOutput;
                                            }

                                            currentTheatre.data.lastAction = { 'lastSpeechOutput': speechOutput, 'lastCardTitle': cardTitle, 'lastCardOutput': cardOutput };
                                            currentTheatre.save(function () { });
                                            response.tellWithCard(speechOutput, cardTitle, cardOutput);
                                        });
                                    }
                                });
                            }
                        });
                    }
                });

            //Otherwise. Use the preferred theatre.
            } else {
                console.log('Using saved theatre');
                        
                // Double-check that the movie exists.
                callStrings = new Array();
                callStrings.push('movies/' + movieName);
                callStrings.push('movies/' + numberUtil.parseNumbersInString(movieName));

                console.log('API Call: ' + callStrings);
                api.tryMultipleRequests(callStrings, function apiResponseCallback(err, movieResponse) {
                    if (err) {
                        console.log(err);
                        speechOutput = err;
                        cardOutput = speechOutput;

                        currentTheatre.data.lastAction = { 'lastSpeechOutput': speechOutput, 'lastCardTitle': cardTitle, 'lastCardOutput': cardOutput };
                        currentTheatre.save(function () { });
                        response.tellWithCard(speechOutput, cardTitle, cardOutput);
                    } else {

                        // Find the movie's showtimes.
                        callString = 'theatres/' + theatre.id + '/showtimes/' + weekday + '/?movie=' + movieResponse.slug;            
                        console.log('API Call: ' + callString);
                        api.makeRequest(callString, function apiResponseCallback(err, theatreResponse) {
                            if (err) {
                                console.log(err);
                                speechOutput = err;
                                cardOutput = speechOutput;
                            } else {
                                movies = theatreResponse._embedded.showtimes;
                                
                                if(movies.length < 1) {
                                    speechOutput = textHelper.errors.movieNotFound;
                                } else {
                                    speechOutput += helperUtil.getShowtimeString(movies, weekdayResponse);
                                }
                                cardOutput = speechOutput;
                            }

                            currentTheatre.data.lastAction = { 'lastSpeechOutput': speechOutput, 'lastCardTitle': cardTitle, 'lastCardOutput': cardOutput };
                            currentTheatre.save(function () { });
                            response.tellWithCard(speechOutput, cardTitle, cardOutput);
                        });
                    }
                });
            }
        });
    };

    /**
     * Gets the sysnopsis of a movie.
     */
    intentHandlers.GetMovieSynopsis = function (intent, session, response) {
        var speechOutput = '',
            cardTitle = 'AMC Movie Synopsis',
            cardOutput = '',
            callStrings = new Array(),
            movieNameSlot = intent.slots.movieName,
            movieName = '';

        // Verify that the input slots have values.
        if (!movieNameSlot || !movieNameSlot.value) {
            response.ask(textHelper.errors.misheardMovieTitle + textHelper.errors.reprompt);
            return;
        }
        movieName = helperUtil.replaceAll(helperUtil.replaceAll(movieNameSlot.value, ' ', '-'), '\'', '-');
        
        storage.loadTheatre(session, function (currentTheatre) {
            callStrings.push('movies/' + movieName);
            callStrings.push('movies/' + numberUtil.parseNumbersInString(movieName));            
            console.log('API Call: ' + callStrings);
            api.tryMultipleRequests(callStrings, function apiResponseCallback(err, movieResponse) {
                if (err) {
                    console.log(err);
                    speechOutput = err;
                    cardOutput = speechOutput;
                } else {
                    speechOutput = fixedMovieResponse.name + ': ' + fixedMovieResponse.synopsis;
                    cardOutput = speechOutput;
                }

                currentTheatre.data.lastAction = { 'lastSpeechOutput': speechOutput, 'lastCardTitle': cardTitle, 'lastCardOutput': cardOutput };
                currentTheatre.save(function () { });
                response.tellWithCard(speechOutput, cardTitle, cardOutput);
            });
        });
    };
    
    /**
     * Gets the MPAA rating of a movie.
     */
    intentHandlers.GetMovieMPAARating = function (intent, session, response) {
        var speechOutput = '',
            cardTitle = 'AMC Movie MPAA Rating',
            cardOutput = '',
            callStrings = new Array(),
            movieNameSlot = intent.slots.movieName,
            movieName = '';

        // Verify that the input slots have values.
        if (!movieNameSlot || !movieNameSlot.value) {
            response.ask(textHelper.errors.misheardMovieTitle + textHelper.errors.reprompt);
            return;
        }
        movieName = helperUtil.replaceAll(helperUtil.replaceAll(movieNameSlot.value, ' ', '-'), '\'', '-');
        
        storage.loadTheatre(session, function (currentTheatre) {
            callStrings.push('movies/' + movieName);
            callStrings.push('movies/' + numberUtil.parseNumbersInString(movieName));            
            console.log('API Call: ' + callStrings);
            api.tryMultipleRequests(callStrings, function apiResponseCallback(err, movieResponse) {
                if (err) {
                    console.log(err);
                    speechOutput = err;
                    cardOutput = speechOutput;
                } else {
                    speechOutput = apiRespofixedMovieResponsense.name + ' is rated ' + fixedMovieResponse.mpaaRating;
                    cardOutput = speechOutput;
                }

                currentTheatre.data.lastAction = { 'lastSpeechOutput': speechOutput, 'lastCardTitle': cardTitle, 'lastCardOutput': cardOutput };
                currentTheatre.save(function () { });
                response.tellWithCard(speechOutput, cardTitle, cardOutput);
            });
        });
    };

    /**
     * Gets the run time of a movie.
     */
    intentHandlers.GetMovieRunTime = function (intent, session, response) {
        var speechOutput = '',
            cardTitle = 'AMC Movie Run Time',
            cardOutput = '',
            callStrings = new Array(),
            movieNameSlot = intent.slots.movieName,
            movieName = '';

        // Verify that the input slots have values.
        if (!movieNameSlot || !movieNameSlot.value) {
            response.ask(textHelper.errors.misheardMovieTitle + textHelper.errors.reprompt);
            return;
        }
        movieName = helperUtil.replaceAll(helperUtil.replaceAll(movieNameSlot.value, ' ', '-'), '\'', '-');
        
        storage.loadTheatre(session, function (currentTheatre) {
            callStrings.push('movies/' + movieName);
            callStrings.push('movies/' + numberUtil.parseNumbersInString(movieName));            
            console.log('API Call: ' + callStrings);
            api.tryMultipleRequests(callStrings, function apiResponseCallback(err, movieResponse) {
                if (err) {
                    console.log(err);
                    speechOutput = err;
                    cardOutput = speechOutput;
                } else {
                    speechOutput = movieResponse.name + ' is ' + helperUtil.getRunTimeString(movieResponse.runTime) + ' long';
                    cardOutput = speechOutput;
                }

                currentTheatre.data.lastAction = { 'lastSpeechOutput': speechOutput, 'lastCardTitle': cardTitle, 'lastCardOutput': cardOutput };
                currentTheatre.save(function () { });
                response.tellWithCard(speechOutput, cardTitle, cardOutput);
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