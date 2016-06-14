// Alexa SDK for JavaScript v1.0.00
// Copyright (c) 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved. Use is subject to license terms.
'use strict';
var textHelper = (function () {
    return {
        completeHelp: 'Here\'s some things you can say,'
        + ' tell me what movies are playing,'
        + ' when is a movie playing,'
        + ' when is the best time to see a movie,'
        + ' set my zip to,'
        + ' set my favorite theatre to,'
        + ' and exit.',
        nextHelp: 'You can set your zip code and favorite theatre, get currently playing movies and their showtimes, or say help. What would you like?',
        errors: {
            googleAPIUnavailable: 'Sorry, the Google geocode API service is experiencing a problem. Please try again later.',
            amcAPIUnavailable: 'Sorry, the AMC API service is experiencing a problem. Please try again later.',
            theatresNotFound: 'Unfortunately it doesn\'t look like there are any AMC theatres in your city. If the theatre that you regularly visit is in another city, please set your location to that city.',
            movieNotFound: 'Sorry, I couldn\'t find the movie you were looking for.'
        }
    };
})();
module.exports = textHelper;