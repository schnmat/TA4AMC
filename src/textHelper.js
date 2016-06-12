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
            apiUnavailable: 'Sorry, the AMC API service is experiencing a problem. Please try again later.',
            movieNotFound: 'Sorry, I couldn\'t find the movie you were looking for.'
        }
    };
})();
module.exports = textHelper;