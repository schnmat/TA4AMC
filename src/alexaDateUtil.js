// Alexa SDK for JavaScript v1.0.00
// Copyright (c) 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved. Use is subject to license terms.

/**
 * Provides date and time utilities to format responses in
 * a manner appropriate for speech output.
 */
var alexaDateUtil = (function () {

    var DAYS_OF_MONTH = [
        '1st',
        '2nd',
        '3rd',
        '4th',
        '5th',
        '6th',
        '7th',
        '8th',
        '9th',
        '10th',
        '11th',
        '12th',
        '13th',
        '14th',
        '15th',
        '16th',
        '17th',
        '18th',
        '19th',
        '20th',
        '21st',
        '22nd',
        '23rd',
        '24th',
        '25th',
        '26th',
        '27th',
        '28th',
        '29th',
        '30th',
        '31st'
    ];

    var DAYS_OF_WEEK = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday"
    ];

    var MONTHS = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December'
    ];


    return {

        /**
         * Returns a speech formatted date, without the time. If the year
         * is the same as current year, it is omitted.
         * Example: 'Friday June 12th', '6/5/2016'
         */
        getFormattedDateString: function (date) {
            var today = new Date();

            if (today.getFullYear() === date.getFullYear()) {
                return DAYS_OF_WEEK[date.getDay()] + ' ' + MONTHS[date.getMonth()] + ' ' + DAYS_OF_MONTH[date.getDate() - 1];
            } else {
                return DAYS_OF_WEEK[date.getDay()] + ' ' + (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear();
            }
        },

        /**
         * Returns a date formatted with leading zeros and seperated by a
         * character that is passed in, defaulting to a dash.
         * (without the time). Example Output: '06-05-2016'
         */
        getFormattedDate: function (date, seperator) {
            var seperator = typeof seperator !== 'undefined' ?  seperator : '-';
            var dd = date.getDate();
            var mm = date.getMonth() + 1; // Write January as one instead of zero.

            // Append zeros for all days before the tenth.
            dd < 10 ? dd = '0' + dd : dd;
            //Append zeros for all months before October.
            mm < 10 ? mm = '0' + mm : mm;

            return (mm + '-' + dd + '-' + date.getFullYear());
        },

        /**
         * Returns a speech formatted time, without a date, based on a period in the day. E.g.
         * '12:35 in the afternoon'
         */
        getFormattedTime: function (date) {
            var hours = date.getHours();
            var minutes = date.getMinutes();

            var periodOfDay;
            if (hours < 12) {
                periodOfDay = ' in the morning';
            } else if (hours < 17) {
                periodOfDay = ' in the afternoon';
            } else if (hours < 20) {
                periodOfDay = ' in the evening';
            } else {
                periodOfDay = ' at night';
            }

            hours = hours % 12;
            hours = hours ? hours : 12; // handle midnight
            minutes = minutes < 10 ? '0' + minutes : minutes;
            var formattedTime = hours + ':' + minutes + periodOfDay;
            return formattedTime;
        },

        /**
         * Returns a speech formatted, without a date, based on am/rpm E.g.
         * '12:35 pm'
         */
        getFormattedTimeAmPm: function (date) {
            var hours = date.getHours();
            var minutes = date.getMinutes();
            var ampm = hours >= 12 ? 'PM' : 'AM';

            hours = hours % 12;
            hours = hours ? hours : 12; // handle midnight
            minutes = minutes < 10 ? '0' + minutes : minutes;
            var formattedTime = hours + ':' + minutes + ' ' + ampm;
            return formattedTime;
        },

        getLocalDate: function(utcOffset) {
            var date = new Date();
            // convert to msec
            // subtract local time zone offset
            // get UTC time in msec
            var utc = date.getTime() - (date.getTimezoneOffset() * 60000);

            // create new Date object for different city
            // using supplied offset
            return new Date(utc + (3600000 * utcOffset.replace(':','.')));
        },

        /**
         * Returns the current date formatted so that it can be used
         * in an api call (mm-dd-yyyy). Dashes can be replaced with
         * slashes if that format is desired.
         */
        getTodaysDate: function(utcOffset, separator) {
            return this.getFormattedDate(this.getLocalDate(utcOffset), separator);
        },
        // Returns the tomorrows date.
        getTomorrowsDate: function(utcOffset, separator) {
            var tomorrow = this.getLocalDate(utcOffset);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return this.getFormattedDate(tomorrow, separator);
        },

        /**
         * Fetches the next occurrence of a date by weekday name (e.g. Monday).
         * Returns a formatted date in the default format, which can be used
         * in an api call (e.g. 06-06-2016)
         */
        getDayFromString: function(weekday) {
            var today = new Date();
            var tomorrow = new Date();
            var nextDay = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            nextDay.setDate(nextDay.getDate() + 1);
            var found = 0;
            
            while(found === 0) {
                var dayFound = DAYS_OF_WEEK[nextDay.getDay()].toLowerCase();
                if(dayFound == weekday.toLowerCase()) {
                    found = 1;
                    break;
                } else {
                    nextDay.setDate(nextDay.getdate() + 1);
                }

                // If it's looped around the whole week, something went wrong
                // (perhaps the input was mis-spelled.).
                if(DAYS_OF_WEEK[nextDay.getDay()] == DAYS_OF_WEEK[tomorrow.getDay()]) {
                found = -1;
                nextDay = -1; // Return an error.
                }
            }
            if(nextDay === -1) {
                throw new TypeError('Couldn\'t find the next occurrence of the day: ' + weekday, 'alexaDateUtil.js', 186);
            } else {
                return this.getFormattedDate(nextDay);
            }
        }
    }
})();
module.exports = alexaDateUtil;
