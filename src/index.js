/**
 * json-strictify
 *
 * @class JSONs
 * @version 0.1.0
 * @author Raphael Pigulla <pigulla@four66.com>
 * @license MIT
 */

var util = require('util');

var InvalidValueError = require('./InvalidValueError');

/**
 * @param {*} data
 * @param {Array.<(string|number)>} references
 * @throws {JSONs.InvalidValueError}
 */
function check(data, references) {
    /*jshint maxcomplexity:false*/
    
    // Give more helpful error messages for the most common errors
    if (util.isError(data)) {
        throw new InvalidValueError('Error is not a valid JSON type', data, references);
    }
    if (util.isRegExp(data)) {
        throw new InvalidValueError('RegExp is not a valid JSON type', data, references);
    }
    if (data === undefined) {
        throw new InvalidValueError('undefined is not a valid JSON type', data, references);
    }
    if (typeof data === 'function') {
        throw new InvalidValueError('function is not a valid JSON type', data, references);
    }
    if (typeof data === 'number' && !isFinite(data)) {
        throw new InvalidValueError('non-finite number is not a valid JSON type', data, references);
    }

    // Primitive types are always okay
    if (data === null || typeof data === 'string' || typeof data === 'boolean' || typeof data === 'number') {
        return;
    }

    // If an array, check its elements
    if (Array.isArray(data)) {
        data.forEach(function (item, index) {
            check(item, references.concat(index));
        });
        return;
    }

    // If an object, check its properties
    if (typeof data === 'object') {
        if (typeof data.toJSON === 'function') {
            check(data.toJSON(), references);
        } else {
            for (var key in data) { // jshint ignore:line
                check(data[key], references.concat(key));
            }
        }
        return;
    }

    // Anything else is an error
    throw new InvalidValueError('invalid type', data, references);
}

/**
 * @param {*} data
 * @return {string}
 * @throws {JSONs.InvalidValueError}
 */
function stringify(data) {
    check(data, []);
    return JSON.stringify.apply(JSON, arguments);
}

var JSONs = {
    parse: JSON.parse,
    stringify: stringify,
    enable: function (enabled) {
        return enabled ? JSONs : JSON;
    }
};

module.exports = JSONs;
