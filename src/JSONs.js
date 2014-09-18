/**
 * json-strictify
 *
 * @class JSONs
 * @version 0.2.0
 * @author Raphael Pigulla <pigulla@four66.com>
 * @license MIT
 */

var util = require('util');

var InvalidValueError = require('./InvalidValueError');

// TODO: add support for JSON.stringify's "replacer" parameter
// TODO: add detection of recursive references (see json-stringify-safe)

/**
 * @param {*} data
 * @param {Array.<(string|number)>} references
 * @param {?function(string,*)} replacer
 * @throws {JSONs.InvalidValueError}
 */
function check(data, references, replacer) {
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
            var value = replacer ? replacer(index, item) : item;
            check(value, references.concat(index), replacer);
        });
        return;
    }

    // If an object, check its properties
    var value;
    if (typeof data === 'object') {
        if (typeof data.toJSON === 'function') {
            check(data.toJSON(), references, replacer);
        } else {
            for (var key in data) { // jshint ignore:line
                value = replacer ? replacer(key, data[key]) : data[key];

                if (!(replacer && value === undefined)) {
                    check(value, references.concat(key), replacer);
                }
            }
        }
        return;
    }

    // Anything else is an error
    throw new InvalidValueError('invalid type', data, references);
}

/**
 *
 * @param {(function(string,*)|Array.<(string|number)>)=} replacer
 * @return {?function(string,*)}
 */
function normalizeReplacer(replacer) {
    if (Array.isArray(replacer)) {
        return function (key, value) {
            return (key !== '' && replacer.indexOf(key) === -1) ? undefined : value;
        };
    }

    if (typeof replacer === 'function') {
        return replacer;
    }

    return null;
}

/**
 * @param {*} data
 * @param {(function(string,*)|Array.<(string|number)>)=} replacer
 * @param {number=} space
 * @return {string}
 * @throws {JSONs.InvalidValueError}
 */
function stringify(data, replacer, space) {
    var normalizedReplacer = normalizeReplacer(replacer),
        initialData = normalizedReplacer ? normalizedReplacer('', data) : data;

    check(initialData, [], normalizedReplacer);
    return JSON.stringify(data, replacer, space);
}

var JSONs = {
    parse: JSON.parse,
    stringify: stringify,
    enable: function (enabled) {
        return enabled ? JSONs : JSON;
    }
};

module.exports = JSONs;
