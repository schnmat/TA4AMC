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
 *  User: "Alexa, launch AMC."
 *  Alexa: "Welcome to AMC Theatres, Please tell me your zip code?"
 *  User: "My zip code is 12345"
 *  Alexa: "Thank you, saving zip code 12345. There are two theatres in your area, you can select a favorite one if you want."
 *  User: "Save AMC Showplace 8 as my favorite theatre."
 *  Alexa: "Thank you, I'm setting AMC Showplace 8 as your preferred theatre."
 *
 *  (skill saves the data and ends)
 *
 *  User: "Alexa, ask AMC what's playing right now."
 *  Alexa: "Now playing in AMC Showplace 8 is: {List of movies}"
 *
 *  (skill session ends)
 * 
 *  User: "Alexa, ask AMC when {movie} is playing."
 *  Alexa: "{Movie} is playing at 7 and 9 p.m. tonight, 10:30 tomorrow morning, and 1 and 4pm tomorrow afternoon."
 *
 *  (skill session ends)
 *
 * One-shot model:
 *  User: "Alexa, ask AMC when {movie} is playing in {town}."
 *  Alexa: "At {theatre}, {Movie} is playing at 7 and 9 p.m. tonight, 10:30 tomorrow morning, and 1 and 4pm tomorrow afternoon."
 */
'use strict';
var TheatreKeeper = require('./theatreKeeper');

exports.handler = function (event, context) {
    var theatreKeeper = new TheatreKeeper();
    theatreKeeper.execute(event, context);
};