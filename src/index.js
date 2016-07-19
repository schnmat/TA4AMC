// Alexa SDK for JavaScript v1.0.00
// Copyright (c) 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved. Use is subject to license terms.

/**
 * AMC Alexa Skill Author: Matthew Schnoebelen
 * Created: July 2015
 * 
 */

/**
 * Examples:
 * Dialog model:
 *  User: "Alexa, launch theatre assistant."
 *  Alexa: "Welcome to AMC Theatres, Please tell me your location?"
 *  User: "I live in {city} {state}"
 *  Alexa: "Thank you, I found two theatres in your city, the first one has been set as your favorite."
 *  [Alexa saves the found theatres to dynamoDB]
 *  [Alexa lists any theatres found and exits]
 *
 *  User: "Alexa, ask theatre assistant what's playing right now."
 *  Alexa: "Now playing in {theatre name}: "
 *  [Alexa lists the names of the movies found and exits]
 * 
 *  User: "Alexa, ask theatre assistant when {movie} is playing."
 *  Alexa: "{movie name} is playing at: "
 *  [Alexa lists showtimes for the movie, first in regular showtimes, followed by 3D showtimes and exits]
 * 
 */
'use strict';
var SkillExtender = require('./SkillExtender');

exports.handler = function (event, context) {
    var SkillExtender = new SkillExtender();
    SkillExtender.execute(event, context);
};