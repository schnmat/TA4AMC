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
        }
    }
})();
module.exports = helperFunctions;