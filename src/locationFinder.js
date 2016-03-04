var api = require('./apiHandlers'),
    storage = require('./storage');
/*
 * Extracts the State from a location response, and returns the appropriate zip code to save.
 */
var locationFinder = (function () {

    var STATES = [
        'Alabama',
        'Alaska',
        'Arizona',
        'Arkansas',
        'California',
        'Colorado',
        'Connecticut',
        'Delaware',
        'Florida',
        'Georgia',
        'Hawaii',
        'Idaho',
        'Illinois',
        'Indiana',
        'Iowa',
        'Kansas',
        'Kentucky',
        'Louisiana',
        'Maine',
        'Maryland',
        'Massachusetts',
        'Michigan',
        'Minnesota',
        'Mississippi',
        'Missouri',
        'Montana',
        'Nebraska',
        'Nevada',
        'New Hampshire',
        'New Jersey',
        'New Mexico',
        'New York',
        'North Carolina',
        'North Dakota',
        'Ohio',
        'Oklahoma',
        'Oregon',
        'Pennsylvania',
        'Rhode Island',
        'South Carolina',
        'South Dakota',
        'Tennessee',
        'Texas',
        'Utah',
        'Vermont',
        'Virginia',
        'Washington',
        'West Virginia',
        'Wisconsin',
        'Wyoming'
    ];
    var STATE_ABBRS = [
        'AL',
        'AK',
        'AZ',
        'AR',
        'CA',
        'CO',
        'CT',
        'DE',
        'FL',
        'GA',
        'HI',
        'ID',
        'IL',
        'IN',
        'IA',
        'KS',
        'KY',
        'LA',
        'ME',
        'MD',
        'MA',
        'MI',
        'MN',
        'MS',
        'MO',
        'MT',
        'NE',
        'NV',
        'NH',
        'NJ',
        'NM',
        'NY',
        'NC',
        'ND',
        'OH',
        'OK',
        'OR',
        'PA',
        'RI',
        'SC',
        'SD',
        'TN',
        'TX',
        'UT',
        'VT',
        'VA',
        'WA',
        'WV',
        'WI',
        'WY'
    ];

    return {

        /* Saves the user's location, whether they said a zip code, or their city name and state.
         */
        Err: '',
        City: '',
        State: '',
        ZipCode: 0,
        Latitude: 0,
        Longitude: 0,
        
        FindLocation: function (input) {
            //If the state is in the location. Set it as the state and remove it from the input.
            if(isNaN(input)) {
                for(var i = 0, l = 50; i < l; i++) {
                    if(input.indexOf(STATES[i])) {
                        this.State = STATES[i];
                        input.replace(STATES[i], '');
                        this.City = input.trim();
                        break;
                    } else if(input.indexOf(STATES[i].toLowerCase()) >= 0) {
                        this.State = STATES[i];
                        input.replace(STATES[i].toLowerCase(), '');
                        this.City = input.trim();
                        break;
                    } else if(input.indexOf(STATES[i].toUpperCase()) >= 0) {
                        this.State = STATES[i];
                        input.replace(STATES[i].toUpperCase(), '');
                        this.City = input.trim();
                        break;
                    }
                }
            }
            if(this.State.length < 1){
                this.ZipCode = input;
            }
            
            this.FetchAddress(this.City + '+' + this.State + '+' + this.ZipCode);
            //this.FetchZipCode(this.Latitude + ',' + this.Longitude);
        },
        FetchAddress: function(searchString) {
            api.fetchLocation('address=' + searchString, function apiResponseCallback(err, apiResponse) {
                if (err) {
                    this.Err ='Sorry, the Google Maps API service is experiencing a problem. Please try again later.';
                } else {
                    this.Latitude = apiResponse.results[0].geometry.location.lat;
                    this.Longitude = apiResponse.results[0].geometry.location.lng;
                    var address = apiResponse.results[0].formatted_address.split(',');
                    
                    for(var i = 0, l = 50; i < l; i++) {
                        if(address[1].indexOf(STATE_ABBRS[i])) {
                            this.State = STATES[i];
                            break;
                        }
                    }
                }
            });
        },
        FetchZipCode: function(searchString) {
            api.fetchLocation('latlng=' + searchString, function apiResponseCallback(err, apiResponse) {
                if (err) {
                    this.Err = 'Sorry, the Google Maps API service is experiencing a problem. Please try again later.';
                } else {
                    var address = apiResponse.results[0].address_components;
                    
                    loop1:
                    for(var i = 0, l = address.length; i < l; i++) {
                        var types = address[i].types;
                        loop2:
                        for(var j = 0, k = types.length; j < k; j++) {                      
                            if(types[j].indexOf('postal_code') > 0) {
                                this.ZipCode = address[i].long_name.trim();
                                break loop1;
                            }
                        }
                    }
                }
            });
        }
    };
})();
module.exports = locationFinder;
