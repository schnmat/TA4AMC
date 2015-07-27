'use strict';

var helperFunctions = (function () {
    return {
        checkSessionVariables: function(currentTheatre) {
            //Check if the dynamoDB properties exist, if not, create them:
            if(!currentTheatre.data.hasOwnProperty('localTheatres')) {
                currentTheatre.data.theatre = [];
            }
            if(!currentTheatre.data.hasOwnProperty('theatre')) {
                currentTheatre.data.theatre = {};
            }
            if(!currentTheatre.data.theatre.hasOwnProperty('zipCode')) {
                currentTheatre.data.theatre["zipCode"] = 0;
            }
            if(!currentTheatre.data.theatre.hasOwnProperty('favoriteTheatre')) {
                currentTheatre.data.theatre["favoriteTheatre"] = 0;
            }
        }
    }
})();
module.exports = helperFunctions;