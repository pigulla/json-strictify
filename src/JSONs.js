'use strict';

/**
 * json-strictify
 *
 * @version 0.3.7
 * @author Raphael Pigulla <pigulla@four66.com>
 * @license MIT
 */

var util = require('util');

var fkt = require('fkt');

var CircularReferenceError = require('./CircularReferenceError'),
    InvalidValueError = require('./InvalidValueError');

var JSONs = {
    /**
     * @type {?function(string,*):*}
     */
    replacer: null,

    /**
     * Recursively check if the given object can be serialized to JSON safely.
     *
     * @param {Object} object
     * @param {Array.<(string|number)>} references
     * @param {Array.<(Object|Array)>} ancestors
     * @return {undefined}
     * @throws {JSONs.InvalidValueError}
     * @throws {JSONs.CircularReferenceError}
     */
    checkObject: function (object, references, ancestors) {
        var actual;

        this.assertNoCycle(object, references, ancestors);

        if (typeof object.toJSON === 'function') {
            actual = object.toJSON();
            return this.check(actual, references, ancestors);
        }

        for (var key in object) { // eslint-disable-line guard-for-in
            actual = this.replacer ? this.replacer(key, object[key]) : object[key];

            if (!(this.replacer && actual === undefined)) {
                this.check(actual, references.concat(key), ancestors.concat(object));
            }
        }
    },

    /**
     * Recursively check if the given array can be serialized to JSON safely.
     *
     * @param {Array} array
     * @param {Array.<(string|number)>} references
     * @param {Array.<(Object|Array)>} ancestors
     * @return {undefined}
     * @throws {JSONs.InvalidValueError}
     * @throws {JSONs.CircularReferenceError}
     */
    checkArray: function (array, references, ancestors) {
        this.assertNoCycle(array, references, ancestors);

        return array.forEach(function (item, index) {
            var actual = this.replacer ? this.replacer(index, item) : item;
            this.check(actual, references.concat(index), ancestors.concat([array]));
        }, this);
    },

    /**
     * Check if the given value is of a known, not-serializable type and provide a more specific, helpful error message.
     *
     * @param {*} value
     * @param {Array.<(string|number)>} references
     * @return {undefined}
     * @throws {JSONs.InvalidValueError}
     */
    checkCommonTypes: function (value, references) {
        if (util.isError(value)) {
            throw new InvalidValueError('An error object is not a valid JSON type', value, references);
        }
        if (util.isRegExp(value)) {
            throw new InvalidValueError('A RegExp is not a valid JSON type', value, references);
        }
        if (value === undefined) {
            throw new InvalidValueError('undefined is not a valid JSON type', value, references);
        }
        if (typeof value === 'function') {
            throw new InvalidValueError('A function is not a valid JSON type', value, references);
        }
        if (typeof value === 'number' && !isFinite(value)) {
            // The value's string representation itself will actually be descriptive ("Infinity", "-Infinity" or "NaN").
            throw new InvalidValueError(value + ' is not a valid JSON type', value, references);
        }
    },

    /**
     * Recursively check if the given value can be serialized to JSON safely.
     *
     * @param {*} value
     * @param {Array.<(string|number)>} references
     * @param {Array.<(Object|Array)>} ancestors
     * @return {undefined}
     * @throws {JSONs.InvalidValueError}
     * @throws {JSONs.CircularReferenceError}
     */
    check: function (value, references, ancestors) {
        // Check for the most common non-serializable types.
        this.checkCommonTypes(value, references);

        // Primitive types are always okay (we've already checked for non-finite numbers).
        if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') {
            return;
        }

        if (Array.isArray(value)) {
            // If an array, check its elements.
            return this.checkArray(value, references, ancestors);
        } else /* istanbul ignore else */ if (typeof value === 'object') {
            // If an object, check its properties (we've already checked for null).
            return this.checkObject(value, references, ancestors);
        } else {
            // This case will not occur in a regular Node.JS or browser environment, but could happen if you run your
            // script in an engine like Rhino or Nashorn and try to serialize a host object.
            throw new InvalidValueError('Invalid type', value);
        }
    },

    /**
     * Normalizes the user-specified replacer function.
     *
     * In short, JSON.stringify's "replacer" parameter can either be a function or an array containing the names of the
     * properties to be included. This method normalizes the latter case to the former so we can always treat the
     * "replacer" option as a function internally.
     *
     * For more information about the replacer function take a look at the documentation on
     * [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_native_JSON#The_replacer_parameter).
     *
     * @param {(function(string,*)|Array.<(string|number)>)=} replacer
     * @return {?function(string,*):*}
     */
    normalizeReplacer: function (replacer) {
        if (Array.isArray(replacer)) {
            return function (key, value) {
                return (key !== '' && replacer.indexOf(key) === -1) ? undefined : value;
            };
        }

        return typeof replacer === 'function' ? replacer : null;
    },

    /**
     * Check if the passed value is a circular reference, i.e. whether it is one of its own ancestors.
     *
     * @param {(Object|Array)} value
     * @param {Array.<(string|number)>} references
     * @param {Array.<(Object|Array)>} ancestors
     * @throws {JSONs.CircularReferenceError}
     */
    assertNoCycle: function (value, references, ancestors) {
        if (ancestors.indexOf(value) !== -1) {
            throw new CircularReferenceError(references);
        }
    },

    /**
     * The drop-in replacement function for JSON.stringify.
     *
     * @param {*} value
     * @param {(function(string,*):*|Array.<(string|number)>|null)=} replacer
     * @param {number=} space
     * @return {string}
     * @throws {JSONs.InvalidValueError}
     * @throws {JSONs.CircularReferenceError}
     */
    stringify: function (value, replacer, space) {
        this.replacer = this.normalizeReplacer(replacer);

        var initialData = this.replacer ? this.replacer('', value) : value;

        this.check(initialData, [], []);

        // Fall back to the native JSON.stringify that we now know is safe to use.
        return JSON.stringify(value, replacer, space);
    }
};

var nativeImpl,
    strictImpl;

nativeImpl = {
    parse: JSON.parse,
    parseAsync: fkt.callbackify(JSON.parse, JSON),
    stringify: JSON.stringify,
    stringifyAsync: fkt.callbackify(JSON.stringify, JSON),
    enabled: function (enabled) {
        return enabled ? strictImpl : nativeImpl;
    }
};

strictImpl = {
    parse: JSON.parse,
    parseAsync: fkt.callbackify(JSON.parse, JSON),
    stringify: JSONs.stringify.bind(JSONs),
    stringifyAsync: fkt.callbackify(JSONs.stringify, JSONs),
    enabled: function (enabled) {
        return enabled ? strictImpl : nativeImpl;
    }
};

module.exports = strictImpl;
