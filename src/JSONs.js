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

/**
 * @param {Object} data
 * @param {Array.<(string|number)>} references
 * @param {?function(string,*)} replacer
 * @return {undefined}
 */
function checkObject(data, references, replacer) {
    if (typeof data.toJSON === 'function') {
        return check(data.toJSON(), references, replacer);
    }

    for (var key in data) { // jshint ignore:line
        var value = replacer ? replacer(key, data[key]) : data[key];

        if (!(replacer && value === undefined)) {
            check(value, references.concat(key), replacer);
        }
    }
}

/**
 * @param {Array} data
 * @param {Array.<(string|number)>} references
 * @param {?function(string,*)} replacer
 * @return {undefined}
 */
function checkArray(data, references, replacer) {
    return data.forEach(function (item, index) {
        var value = replacer ? replacer(index, item) : item;
        check(value, references.concat(index), replacer);
    });
}

/**
 * Give more helpful error messages for most common invalid types.
 *
 * @param {*} data
 * @param {Array.<(string|number)>} references
 * @throws {JSONs.InvalidValueError}
 */
function checkCommonTypes(data, references) {
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
}

/**
 * @param {*} data
 * @param {Array.<(string|number)>} references
 * @param {?function(string,*)} replacer
 * @throws {JSONs.InvalidValueError}
 */
function check(data, references, replacer) {
    checkCommonTypes(data, references);

    // Primitive types are always okay (we've already checked for non-finite numbers)
    if (data === null || typeof data === 'string' || typeof data === 'boolean' || typeof data === 'number') {
        return;
    }

    // If an array, check its elements
    if (Array.isArray(data)) {
        return checkArray(data, references, replacer);
    }

    /* istanbul ignore else */
    // If an object, check its properties
    if (typeof data === 'object') {
        return checkObject(data, references, replacer);
    }

    /* istanbul ignore next */
    // Anything else (e.g., a host object) is an error
    throw new InvalidValueError('invalid type', data, references);
}

/**
 * @param {(function(string,*)|Array.<(string|number)>)=} replacer
 * @return {?function(string,*)}
 */
function normalizeReplacer(replacer) {
    if (Array.isArray(replacer)) {
        return function (key, value) {
            return (key !== '' && replacer.indexOf(key) === -1) ? undefined : value;
        };
    }

    return typeof replacer === 'function' ? replacer : null;
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
