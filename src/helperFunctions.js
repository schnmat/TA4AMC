'use strict';

/**
 * Wikipedia has a list of movies that have numbers in the name:
 * https://www.wikiwand.com/en/List_of_films:_numbers
 */

var helperFunctions = (function () {

    return {

        /**
         * Checks the local session variables to make sure they have
         * the correct properties set, and sets them to default values if needed.
         */
        checkSessionVariables: function(currentTheatre) {
            //Check if the dynamoDB properties exist, if not, create them:
            if(!currentTheatre.data.hasOwnProperty('localTheatres')) {
                currentTheatre.data.localTheatres = [];
            }
            if(!currentTheatre.data.hasOwnProperty('location')) {
                currentTheatre.data.location = {};
            }
            if(!currentTheatre.data.hasOwnProperty('favoriteTheatre')) {
                currentTheatre.data.favoriteTheatre = {};
            }
            if(!currentTheatre.data.location.hasOwnProperty('zipCode')) {
                currentTheatre.data.location.zipCode = 0;
            }
            if(!currentTheatre.data.location.hasOwnProperty('city')) {
                currentTheatre.data.location.city = null;
            }
            if(!currentTheatre.data.location.hasOwnProperty('state')) {
                currentTheatre.data.location.state = null;
            }
            if(!currentTheatre.data.location.hasOwnProperty('utcOffset')) {
                currentTheatre.data.location.utcOffset = null;
            }
            if(!currentTheatre.data.favoriteTheatre.hasOwnProperty('id')) {
                currentTheatre.data.favoriteTheatre.id = 0;
            }
            if(!currentTheatre.data.favoriteTheatre.hasOwnProperty('name')) {
                currentTheatre.data.favoriteTheatre.name = null;
            }
        },
        
        /**
         * Takes a string of the movie genre (which is typically in all caps)
         * and returns a string that can be used in the response sentence.
         */
        parseMovieGenre: function(str) {
            var returnString = str;
            switch(str) {
                case 'ANIMATION':
                    returnString = 'n animated';
                    break;
                default:
                    returnString = str;
                    break;
            }
            return returnString;
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