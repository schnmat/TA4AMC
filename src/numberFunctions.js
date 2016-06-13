'use strict';
var helperFunctions = require('./helperFunctions');
/**
 * Wikipedia has a list of movies that have numbers in the name:
 * https://www.wikiwand.com/en/List_of_films:_numbers
 */

var numberFunctions = (function () {
    var Small = {
                'zero':      0,
                'one':       1,
                'two':       2,
                'three':     3,
                'four':      4,
                'five':      5,
                'six':       6,
                'seven':     7,
                'eight':     8,
                'nine':      9,
                'ten':       10,
                'eleven':    11,
                'twelve':    12,
                'thirteen':  13,
                'fourteen':  14,
                'fifteen':   15,
                'sixteen':   16,
                'seventeen': 17,
                'eighteen':  18,
                'nineteen':  19,
                'twenty':    20,
                'thirty':    30,
                'forty':     40,
                'fifty':     50,
                'sixty':     60,
                'seventy':   70,
                'eighty':    80,
                'ninety':    90
            };

    var Magnitude = {
                    'thousand':    1000,
                    'million':     1000000,
                    'billion':     1000000000,
                    'trillion':    1000000000000,
                    'quadrillion': 1000000000000000,
                    'quintillion': 1000000000000000000,
                    'sextillion':  1000000000000000000000,
                    'septillion':  1000000000000000000000000,
                    'octillion':   1000000000000000000000000000,
                    'nonillion':   1000000000000000000000000000000,
                    'decillion':   1000000000000000000000000000000000,
                };

    var smaller, larger; //placeholders to count to the written number

    return {

        /**
         * Takes a number string (e.g. "one", "two", "three") and converts
         * it to the integer value (e.g. 1, 2, 3);
         */
        convertStringToNumber: function(str) {
           	// Break up the string into an array of words to be converted individually
            // Then added up together to reach to total value.
            var wordArray = str.toString().split(/[\s-]+/);
            smaller = 0;
            larger = 0;

            // Loop through the words and count up to the total value.
            for(var i = 0, l = wordArray.length; i < l; i++) {
                var x = Small[wordArray[i]];
                if (x != null) { // Check if the number is in the Small numbers array.
                    smaller += x; // Add it to the smaller placeholder.
                } else if (wordArray[i] == "hundred") {
                    /* if the number "hundred" is reached, multiply the placeholder by 100.
                    * It's not a part of the magnitudes because it doesn't add the same way
                    * once it reaches the hundred thousands.
                    */
                    smaller *= 100;
                } else { //Otherwise it's a number in the thousands or larger.
                    x = Magnitude[wordArray[i]];
                    if (x != null) {
                        // Multiply the smaller placeholder by the magnitude to get the larger number.
                        larger += (smaller * x);
                        smaller = 0; // Reset the smaller placeholder in case there's more coming.
                    } else { // Something went wrong.
                        throw new TypeError('Unkown number: ' + wordArray[i], 'numberFunctions.js', 87);
                    }
                }
            }
            return (smaller + larger);
        },
        
        /**
         * Takes a string the might have multiple numberic strings and
         * converts each of them to the integer value using the 
         * function: convertStringToNumber(num)
         */
        parseNumbersInString: function(str) {
            var endIndex = str.length;
            var strOut = str;

            for(var startIndex = 0, len = str.length; startIndex <= len; startIndex++) {
                for(;endIndex > startIndex; endIndex--) {
                    try {
                        var subStr = str.substring(startIndex, endIndex);
                        var num = this.convertStringToNumber(subStr);
                        strOut = helperFunctions.replaceAll(strOut, subStr, num);
                    } catch(e) {
                        console.log(e.message + ' : ' + e.fileName + ' : ' + e.lineNumber);
                    }
                }
                endIndex = str.length;
            }
            return strOut;
        }
    }
})();
module.exports = numberFunctions;