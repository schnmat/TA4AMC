'use strict';
var dateUtil = require('./dateFunctions'),
    textHelper = require('./textHelper'),
    numberUtil = require('./numberFunctions');

var helperFunctions = (function () {

    return {

        /**
         * Checks the local session variables to make sure they have
         * the correct properties set, and sets them to default values if needed.
         */
        checkSessionVariables: function(data) {
            if(!data.hasOwnProperty('localTheatres')) {
                data.localTheatres = new Array;
            }

            if(!data.hasOwnProperty('location')) {
                data.location = {};
            }
            if(!data.location.hasOwnProperty('zipCode')) {
                data.location.zipCode = 0;
            }
            if(!data.location.hasOwnProperty('city')) {
                data.location.city = '';
            }
            if(!data.location.hasOwnProperty('state')) {
                data.location.state = '';
            }
            if(!data.location.hasOwnProperty('utcOffset')) {
                data.location.utcOffset = '-5.00';
            }

            if(!data.hasOwnProperty('favoriteTheatre')) {
                data.favoriteTheatre = {};
            }
            if(!data.favoriteTheatre.hasOwnProperty('id')) {
                data.favoriteTheatre.id = 0;
            }
            if(!data.favoriteTheatre.hasOwnProperty('name')) {
                data.favoriteTheatre.name = '';
            }
        },

        getMatchingTheatre: function(localTheatres, theatreName) {
            var theatre = { 'id': 0, 'name': '' },
                checkName = '';
            // Loop through the theatres saved locally to find the theatre with the same name.
            localTheatres.forEach(function(element) {
                theatreName = numberUtil.parseNumbersInString(theatreName);
                checkName = element.name.replace('AMC ', '').toLowerCase();
                if(element.name.toLowerCase() == theatreName.toLowerCase() ||
                                    checkName == theatreName.toLowerCase()) {
                    theatre = { 'id': element.id, 'name': element.name };
                }
            }, this);
            return theatre;
        },

        /**
         * Takes a list of movies taken from the api response and builds
         * a string to return in the response.
        * Sorted by regular showing first, then 3-D showings.
         */
        getShowtimeString: function(movies, weekdayResponse) {
            var speechOutput = movies[0].movieName + ' is playing ' + weekdayResponse + ' at ',
                regularShowtimes = new Array(),
                threedeeShowtimes = new Array();

            movies.forEach(function(movie) {
                var utcOffset = this.replaceAll(movie.utcOffset, ':', '.');
                var showDate = dateUtil.getLocalDate(utcOffset, new Date(movie.showDateTimeUtc));
                var sellByDate = dateUtil.getLocalDate(utcOffset, new Date(movie.sellUntilDateTimeUtc));

                console.log('Showtime: ' + dateUtil.getFormattedTimeAmPm(showDate));
                if(dateUtil.afterCurrentTime(utcOffset, sellByDate) > -1){
                    if(this.isMovieThreeDee(movie.attributes)) {
                        threedeeShowtimes.push(dateUtil.getFormattedTimeAmPm(showDate));
                    } else {
                        regularShowtimes.push(dateUtil.getFormattedTimeAmPm(showDate));
                    }
                }
            }, this);

            if(regularShowtimes.length < 1 && threedeeShowtimes.length < 1) {
                speechOutput = textHelper.errors.noShowtimesFound;
            } else if(regularShowtimes.length > 0 && threedeeShowtimes.length > 0) {
                regularShowtimes.forEach(function(time) {
                    speechOutput += time + ', ';
                }, this);
                speechOutput += 'and in 3 D at: ';
                threedeeShowtimes.forEach(function(time) {
                    speechOutput += time + ', ';
                }, this);
            } else if (regularShowtimes.length > 0) {
                regularShowtimes.forEach(function(time) {
                    speechOutput += time + ', ';
                }, this);
            } else if (threedeeShowtimes.length > 0) {
                speechOutput = movies[0].movieName + ' is playing in 3 D ' + weekdayResponse + ' at ';
                threedeeShowtimes.forEach(function(time) {
                    speechOutput += time + ', ';
                }, this);
            }
            speechOutput = this.replaceLast(speechOutput, ', ', '.');
            if(speechOutput.lastIndexOf(',') >= 0) {
                speechOutput = this.replaceLast(speechOutput, ',', ', and');
            }
            return speechOutput;
        },

        /**
         * Takes a number in minutes and returns a string of the length of time.
         */
        getRunTimeString: function(runtime) {
            var output = '',
                hours = Math.floor(runtime / 60),
                minutes = runtime - (hours * 60);
           
            if(hours > 0) {
                if(hours == 1) {
                    output += hours + ' hour';
                } else {
                    output += hours + ' hours';
                }
            }
                
            if(minutes > 0) {
                if(output.length > 0) {
                    output += ' and ';
                }
                if(minutes == 1) {
                    output += minutes + ' minute';
                } else {
                    output += minutes + ' minutes';
                }
            }

            return output;
        },

        /**
         * Takes a movies attributes array and checks for the value of 'REALD3D'
         * that designates when a movie is 3-D or not.
         */
        isMovieThreeDee: function(attributes) {
            var isThreeDee = false;

            attributes.forEach(function(attr) {
                if(attr.code == 'REALD3D') {
                    isThreeDee = true;
                }
            }, this);
            
            return isThreeDee;
        },

        /**
         * Functions Used together to replace all instances of a character
         * found inside of a string.
         */
        escapeRegExp: function(str) {
            return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
        },
        replaceAll: function(str, find, replace) {
           return str.replace(new RegExp(this.escapeRegExp(find), 'g'), replace);
        },
        /**
         * Replace the last instance of a character in a string.
         */
        replaceLast: function(str, find, replace) {
            var pos = str.lastIndexOf(find);
            return str.substring(0, pos) + replace + str.substring(pos + 1);
        }
    }
})();
module.exports = helperFunctions;