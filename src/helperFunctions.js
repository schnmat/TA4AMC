'use strict';

var helperFunctions = (function () {
    return {
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
            if(!currentTheatre.data.favoriteTheatre.hasOwnProperty('id')) {
                currentTheatre.data.favoriteTheatre.id = 0;
            }
            if(!currentTheatre.data.favoriteTheatre.hasOwnProperty('name')) {
                currentTheatre.data.favoriteTheatre.name = null;
            }
        },
        parseStringsToNumbers: function(str) {
            if(str.indexOf('one') > -1 || str.indexOf('One') > -1) {
                str = str.replace('one', '1');
                str = str.replace('One', '1');
            }
            if(str.indexOf('two') > -1 || str.indexOf('Two') > -1) {
                str = str.replace('two', '2');
                str = str.replace('Two', '2');
            }
            if(str.indexOf('three') > -1 || str.indexOf('Three') > -1) {
                str = str.replace('three', '3');
                str = str.replace('Three', '3');
            }
            if(str.indexOf('four') > -1 || str.indexOf('Four') > -1) {
                str = str.replace('four', '4');
                str = str.replace('Four', '4');
            }
            if(str.indexOf('five') > -1 || str.indexOf('FIve') > -1) {
                str = str.replace('five', '5');
                str = str.replace('Five', '5');
            }
            if(str.indexOf('six') > -1 || str.indexOf('Six') > -1) {
                str = str.replace('six', '6');
                str = str.replace('Six', '6');
            }
            if(str.indexOf('seven') > -1 || str.indexOf('Seven') > -1) {
                str = str.replace('seven', '7');
                str = str.replace('Seven', '7');
            }
            if(str.indexOf('eight') > -1 || str.indexOf('Eight') > -1) {
                str = str.replace('eight', '8');
                str = str.replace('Eight', '8');
            }
            if(str.indexOf('nine') > -1 || str.indexOf('Nine') > -1) {
                str = str.replace('nine', '9');
                str = str.replace('Nine', '9');
            }
            if(str.indexOf('ten') > -1 || str.indexOf('Ten') > -1) {
                str = str.replace('ten', '10');
                str = str.replace('Ten', '10');
            }
            
            return str;
        },
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
        }
    }
})();
module.exports = helperFunctions;