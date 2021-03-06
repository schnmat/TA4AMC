// Alexa SDK for JavaScript v1.0.00
// Copyright (c) 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved. Use is subject to license terms.
'use strict';
var AlexaSkill = require('./AlexaSkill'),
    eventHandlers = require('./eventHandlers'),
    intentHandlers = require('./intentHandlers');

var APP_ID = 'amzn1.echo-sdk-ams.app.[YOUR APP ID HERE]';//replace with "amzn1.echo-sdk-ams.app.[your-unique-value-here]";
var skillContext = {};

/**
 * SkillExtender is a child of AlexaSkill.
 * To read more about inheritance in JavaScript, see the link below.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Introduction_to_Object-Oriented_JavaScript#Inheritance
 */
var SkillExtender = function () {
    AlexaSkill.call(this, APP_ID);
    skillContext.needMoreHelp = true;
};


// Extend AlexaSkill
SkillExtender.prototype = Object.create(AlexaSkill.prototype);
SkillExtender.prototype.constructor = SkillExtender;

eventHandlers.register(SkillExtender.prototype.eventHandlers, skillContext);
intentHandlers.register(SkillExtender.prototype.intentHandlers, skillContext);

module.exports = SkillExtender;

