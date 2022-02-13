const _ = require('underscore');
const fs = require('fs');
class ApiController {
    
    constructor() {}

    /**
     * Compare the keys of two objects.
     * @param {Object} object the initial object
     * @param {Object} control the object to be compared against
     * @returns {Boolean} if the keys are the same
     */
    compareObject(object, control) {
        let intersection = Object.keys(object).filter(x => Object.keys(control).includes(x));
        return intersection.length == Object.keys(control).length;
    }

    /**
     * Generates a response by convention.
     * @param {Object} options the response options
     * @param {String} options.message the message
     * @param {String} options.status the status 
     */
    response(options) {
        return JSON.stringify(options);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

}

module.exports = {
    ApiController : ApiController
}