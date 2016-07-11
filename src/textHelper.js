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
            theatresNotFound: 'Unfortunately it doesn\'t look like there are any AMC theatres in your city. If the theatre that you regularly visit is in another city, please set your location to that city.',
            movieNotFound: 'Sorry, I couldn\'t find the movie you were looking for.',
            noShowtimesFound: 'Sorry, but I couldn\'t find any showtimes for that movie.',
            misheardMovieTitle: 'I\'m sorry, I don\'t think I heard you correctly. What movie where you looking for?',
            misheardTheatreName: '',
            misheardDate: ''
        }
    };
})();
module.exports = textHelper;