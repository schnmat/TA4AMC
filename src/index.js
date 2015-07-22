/**
 * App ID for the skill
 */
var APP_ID = "amzn1.echo-sdk-ams.app.[YOUR APP ID HERE]"; //replace with "amzn1.echo-sdk-ams.app.[your-unique-value-here]";

var https = require('https'),
    alexaDateUtil = require('./alexaDateUtil'),
    storage = require('./storage.js');

/**
 * The AlexaSkill prototype and helper functions
 */
var AlexaSkill = require('./AlexaSkill');

/**
 * AMC is a child of AlexaSkill.
 * To read more about inheritance in JavaScript, see the link below.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Introduction_to_Object-Oriented_JavaScript#Inheritance
 */
var AMC = function () {
    AlexaSkill.call(this, APP_ID);
};

// Extend AlexaSkill
AMC.prototype = Object.create(AlexaSkill.prototype);
AMC.prototype.constructor = AMC;

// ----------------------- Override AlexaSkill request and intent handlers -----------------------

AMC.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log("onSessionStarted requestId: " + sessionStartedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any initialization logic goes here
};

AMC.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log("onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);
    handleWelcomeRequest(response);
};

AMC.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("onSessionEnded requestId: " + sessionEndedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any cleanup logic goes here
};

/**
 * override intentHandlers to map intent handling functions.
 */
AMC.prototype.intentHandlers = {
    SetZipCodeIntent: function (intent, session, response) {
        setZipCodeRequest(intent, session, response);
    },

    GetZipCodeIntent: function (intent, session, response) {
        getZipCodeRequest(intent, session, response);
    },
    
    NowPlayingIntent: function (intent, session, response) {
        getNowPlayingResponse(intent, session, response);
    },
    
    GetMovieShowtimesIntent: function (intent, session, response) {
        getMovieShowtimeResponse(intent, session, response);
    },

    HelpIntent: function (intent, session, response) {
        handleHelpRequest(response);
    }
};

// -------------------------- AMC Domain Specific Business Logic --------------------------

function handleWelcomeRequest(response) {
    var zipCodePrompt = "Please tell me your zip code by saying, my zip code is.";
    var speechOutput = "Welcome to AMC Theatres. " + zipCodePrompt;
    var repromptText = "Nowing your zip code, allows me "
        + "to give you information specific to your local theatre. "
        + "You can ask me what is playing right now, just note that "
        + "it might not be accurate. "
        + zipCodePrompt;

    response.ask(speechOutput, repromptText);
}

function handleHelpRequest(response) {
    var repromptText = "Which city would you like tide information for?";
    var speechOutput = "I can lead you through providing a city and "
        + "day of the week to get tide information, "
        + "or you can simply open High Tide and ask a question like, "
        + "get tide information for Seattle on Saturday. "
        + "For a list of supported cities, ask what cities are supported. "
        + "Or you can say exit."
        + repromptText;

    response.ask(speechOutput, repromptText);
}

function setZipCodeRequest(intent, session, response) {
    var speechOutput;
    var zipCodeSlot = intent.slots.zipCode;
    
    // slots can be missing, or slots can be provided but with empty value.
    // must test for both.
    if (!zipCodeSlot || !zipCodeSlot.value) {
        speechOutput = "I'm sorry, I don't think I heard you correctly. What is your zip code again?";
        var repromptText = "What is your zip code?";
        response.ask(speechOutput, repromptText);
        return;
    } else {
        session.attributes.zipCode = zipCodeSlot.value;
        speechOutput = "Thank you, saving zip code, " + session.attributes.zipCode + ".";
        storage.loadTheatre(session, function (currentTheatre) {
            currentTheatre.data.theatre["zipCode"] = parseInt(session.attributes.zipCode);
            //currentTheatre.data.favoriteTheatre = 0;
            //currentTheatre.data.localTheatres = new Array();
            speechOutput = "Thank you, saving your zip code, " + currentTheatre.data.theatre["zipCode"] + ".";

            currentTheatre.save(function () {
                var cardOutput = speechOutput;
                response.tellWithCard(speechOutput, "AMC - Zip Code Saved", cardOutput);                
            });
        });
        //var cardOutput = speechOutput;
        //response.tellWithCard(speechOutput, "AMC - Zip Code Saved", cardOutput);
    }
}

function getZipCodeRequest(intent, session, response) {

     storage.loadTheatre(session, function (currentTheatre) {
        var speechOutput;
        session.attributes.zipCode = currentTheatre.data.theatre["zipCode"];
        if (currentTheatre.data.theatre["zipCode"] != undefined) {
            speechOutput = "Your zip code is, " + currentTheatre.data.theatre["zipCode"];
        } else {
            speechOutput = "I'm sorry, I don't seem to have your zip code saved. What is your zip code again?";
            var repromptText = "What is your zip code?";
            response.ask(speechOutput, repromptText);
            return;        
        }
        var cardOutput = speechOutput;
        response.tellWithCard(speechOutput, "AMC - Zip Code", cardOutput);
    });
 
    /*if (!session.attributes || !session.attributes.zipCode) {
        speechOutput = "I'm sorry, I don't seem to have your zip code saved. What is your zip code again?";
        var repromptText = "What is your zip code?";
        response.ask(speechOutput, repromptText);
        return;
    } else {
        speechOutput = "The zip code I have for you is, " + session.attributes.zipCode + ".";
        var cardOutput = speechOutput;
        response.tellWithCard(speechOutput, "AMC - Zip Code", cardOutput);
    }*/
}

function getMovieShowtimeResponse(intent, session, response) {
    var speechOutput;
    var movieNameSlot = intent.slots.movieName;
    
    // slots can be missing, or slots can be provided but with empty value.
    // must test for both.
    if (!movieNameSlot || !movieNameSlot.value) {
        speechOutput = "I'm sorry, I don't think I heard you correctly. What movie where you looking for?";
        var repromptText = "What was that movie again?";
        response.ask(speechOutput, repromptText);
        return;
    } else {
        session.attributes.movieName = movieNameSlot.value;
        makeAPIRequest("movies?name=" + session.attributes.movieName, function apiResponseCallback(err, apiResponse) {
            var speechOutput;
            var cardOutput;
            
            if (err) {
                speechOutput = "Sorry, the AMC API service is experiencing a problem. Please try again later.";
                cardOutput = speechOutput + " " + err;
            } else {
                var movies = new Array();
                movies = apiResponse._embedded.movies;
                
                if(movies.length < 1) {
                    speechOutput = "Sorry, I couldn't find the movie you were looking for.";
                } else {
                    //TODO Find showtimes using user's favorite theatre. 
                    speechOutput = "Found movie, " + movies[0].id + ", " + movies[0].name;
                    cardOutput = speechOutput;
                    response.tellWithCard(speechOutput, "AMC", cardOutput);
                }
            }
        });
    }
}

function getNowPlayingResponse(intent, session, response) {
    // Issue the request, and respond to the user
    makeAPIRequest("movies/views/now-playing?pageSize=100", function apiResponseCallback(err, apiResponse) {
        var speechOutput;
        var cardOutput;
        
        if (err) {
            speechOutput = "Sorry, the AMC API service is experiencing a problem. Please try again later.";
            cardOutput = speechOutput + " " + err;
        } else {
            var movies = new Array();
            movies = apiResponse._embedded.movies;
            
            speechOutput = "The movies that are currently playing at AMC Theatres are: "; 
            cardOutput = speechOutput;
            for(var i = 0, l = movies.length; i < l; i++) {
                if(i > 0) {
                    speechOutput += ", ";
                    cardOutput += ", ";
                }
                if(i === (l - 1)) {
                    speechOutput += "and ";
                    cardOutput += "and ";
                }
                speechOutput += movies[i].name;
                cardOutput += movies[i].name;
                cardOutput += " [";
                cardOutput += movies[i].websiteUrl;
                cardOutput += "] ";
            }
            speechOutput += ".";
            cardOutput += ".";
        }
        response.tellWithCard(speechOutput, "AMC", cardOutput);
    });
}

function getMovieByName(movieName, intent, session, response) {
    // Issue the request, and respond to the user
    makeAPIRequest("movies?name=" + movieName, function apiResponseCallback(err, apiResponse) {
        var speechOutput;
        var cardOutput;
        
        if (err) {
            speechOutput = "Sorry, the AMC API service is experiencing a problem. Please try again later.";
            cardOutput = speechOutput + " " + err;
        } else {
            var movies = new Array();
            movies = apiResponse._embedded.movies;
            
            if(movies.length < 1) {
                speechOutput = "Sorry, I couldn't find the movie you were looking for.";
            } else {
                return movies[0]; //Doesn't work
            }
        }
        response.tellWithCard(speechOutput, "AMC", cardOutput);
    });
}

/*
 * Uses the AMC API, documented: http://developers.amctheatres.com/GettingStarted/Authentication
 */
function makeAPIRequest(request, apiResponseCallback) {
    var requestPath = "/v2/" + request;
    var options = {
      host: "api.amctheatres.com",
      path: requestPath,
      headers: { "X-AMC-Vendor-Key": "[YOUR APP ID HERE]" },
      agent: false
    };
    
    https.get(options, function (res) {
        var apiResponseString = '';

        res.on('data', function (data) {
            apiResponseString += data;
        });

        res.on('end', function () {
            var apiResponseObject = JSON.parse(apiResponseString);

            if (apiResponseObject.error) {
                console.log("AMC API error: " + apiResponseObject.error.message);
                apiResponseCallback(new Error(apiResponseObject.error.message));
            } else {
                //var highTide = findHighTide(apiResponseObject);
                apiResponseCallback(null, apiResponseObject);
            }
        });
    }).on('error', function (e) {
        console.log("Communications error: " + e.message);
        apiResponseCallback(new Error(e.message));
    });
}

// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    var amc = new AMC();
    amc.execute(event, context);
};

