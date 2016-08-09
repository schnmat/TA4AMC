// Alexa SDK for JavaScript v1.0.00
// Copyright (c) 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved. Use is subject to license terms.
'use strict';
var textHelper = (function () {
    return {
        completeHelp: 'Here\'s some examples of things you can say,'
        + ' what movies are playing today,'
        + ' when is a movie playing this friday,'
        + ' what movies are coming soon,'
        + ' what is a movie about,'
        + ' what is a movie rated,'
        + ' how long is a movie,'
        + ' set my zip code to,'
        + ' what theatres are near me,'
        + ' and exit.',
        nextHelp: 'You can set your zip code and favorite theatre, get currently playing movies and their showtimes, or say help. What would you like?',
        errors: {
            googleAPIUnavailable: 'Sorry, the Google geocode API service is experiencing a problem. Please try again later.',
            amcAPIUnavailable: 'Sorry, the AMC API service is experiencing a problem. Please try again later.',
            theatreNotFound: 'Sorry, I couldn\'t find that theatre.',
            invalidTheatreID: 'Sorry, I\'m not sure what theatre I should be getting information from. Please tell me what theatre you want me to look at, or tell me your location to save a favorite theatre.',
            localTheatresNotFound: 'Unfortunately it doesn\'t look like there are any AMC theatres in your city. If the theatre that you regularly visit is in another city, please set your location to that city.',
            movieNotFound: 'Sorry, I couldn\'t find the movie you were looking for.',
            noShowtimesFound: 'Sorry, but I couldn\'t find any showtimes for that movie.',
            misheardZipCode: 'Sorry, I did not hear your zip code',
            misheardCity: 'Sorry, I did not hear a city name',
            misheardState: 'Sorry, I did not hear a state name',
            misheardMovieTitle: 'Sorry, I don\'t think I heard you correctly. What movie where you looking for?',
            misheardTheatreName: 'Sorry, I didn\'t hear you say a theatre',
            misheardDate: 'Sorry, I didn\'t hear you say a date',
            reprompt: ', please say again?'
        },
        getErrorMessage: function(errCode) {
            var errMessage = this.errors.amcAPIUnavailable;

            if(errCode == 5104) {
                errMessage = this.errors.theatreNotFound;
            } else if(errCode == 5210) {
                errMessage = this.errors.invalidTheatreID;
            } else if(errCode == 5217) {
                errMessage = this.errors.noShowtimesFound;
            } else if(errCode == 5302) {
                errMessage = this.errors.movieNotFound;
            }

            return errMessage;
        }
    };
})();
module.exports = textHelper;