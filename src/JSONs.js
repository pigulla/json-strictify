'use strict';

/**
 * json-strictify
 *
 * @version 2.0.3
 * @author Raphael Pigulla <pigulla@four66.com>
 * @license MIT
 */

const util = require('util');

const fkt = require('fkt');

const CircularReferenceError = require('./CircularReferenceError');
const InvalidValueError = require('./InvalidValueError');

const JSONs = {
    /**
     * @type {?function(string,*):*}
     */
    replacer: null,

    /**
     * Recursively check if the given object can be serialized to JSON safely.
     *
     * @param {Object} object
     * @param {Array.<(string|number)>} references
     * @param {Set} ancestors
     * @return {undefined}
     * @throws {JSONs.InvalidValueError}
     * @throws {JSONs.CircularReferenceError}
     */
    checkObject(object, references, ancestors) {
        let actual;

        this.assertNoCycle(object, references, ancestors);

        if (typeof object.toJSON === 'function') {
            actual = object.toJSON();
            this.check(actual, references, ancestors);
        } else {
            for (const key in object) { // eslint-disable-line guard-for-in
                actual = this.replacer ? this.replacer(key, object[key]) : object[key];

                if (!(this.replacer && actual === undefined)) {
                    this.check(actual, references.concat(key), ancestors.add(object));
                }
            }
        }
    },

    /**
     * Recursively check if the given array can be serialized to JSON safely.
     *
     * @param {Array} array
     * @param {Array.<(string|number)>} references
     * @param {Set} ancestors
     * @return {undefined}
     * @throws {JSONs.InvalidValueError}
     * @throws {JSONs.CircularReferenceError}
     */
    checkArray(array, references, ancestors) {
        this.assertNoCycle(array, references, ancestors);

        return array.forEach(function (item, index) {
            const actual = this.replacer ? this.replacer(index, item) : item;

            this.check(actual, references.concat(index), ancestors.add(array));
        }, this);
    },

    /**
     * Check if the given value is of a known, non-serializable type and provide a more specific, helpful error message.
     *
     * @param {*} value
     * @param {Array.<(string|number)>} references
     * @return {undefined}
     * @throws {JSONs.InvalidValueError}
     */
    checkCommonTypes(value, references) {
        if (util.isError(value)) {
            throw new InvalidValueError('An error object is not JSON-serializable', value, references);
        }
        if (util.isRegExp(value)) {
            throw new InvalidValueError('A RegExp is not JSON-serializable', value, references);
        }
        if (value === undefined) {
            throw new InvalidValueError('undefined is not JSON-serializable', value, references);
        }
        if (typeof value === 'function') {
            throw new InvalidValueError('A function is not JSON-serializable', value, references);
        }
        if (typeof value === 'number' && !isFinite(value)) {
            // The value's string representation itself will actually be descriptive ("Infinity", "-Infinity" or "NaN").
            throw new InvalidValueError(`${value} is not JSON-serializable`, value, references);
        }
    },

    /**
     * Recursively check if the given value can be serialized to JSON safely.
     *
     * @param {*} value
     * @param {Array.<(string|number)>} references
     * @param {Set} ancestors
     * @return {undefined}
     * @throws {JSONs.InvalidValueError}
     * @throws {JSONs.CircularReferenceError}
     */
    check(value, references, ancestors) {
        // Check for the most common non-serializable types.
        this.checkCommonTypes(value, references);

        // Primitive types are always okay (we've already checked for non-finite numbers).
        if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') {
            return;
        }

        if (Array.isArray(value)) {
            // If an array, check its elements.
            this.checkArray(value, references, ancestors);
        } else /* istanbul ignore else */ if (typeof value === 'object') {
            // If an object, check its properties (we've already checked for null).
            this.checkObject(value, references, ancestors);
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
    normalizeReplacer(replacer) {
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
     * @param {Set} ancestors
     * @throws {JSONs.CircularReferenceError}
     */
    assertNoCycle(value, references, ancestors) {
        if (ancestors.has(value)) {
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
    stringify(value, replacer, space) {
        this.replacer = this.normalizeReplacer(replacer);

        const initialData = this.replacer ? this.replacer('', value) : value;

        this.check(initialData, [], new Set());

        // Fall back to the native JSON.stringify that we now know is safe to use.
        return JSON.stringify(value, replacer, space);
    }
};

/* eslint-disable no-use-before-define */

const nativeImpl = {
    parse: JSON.parse,
    parseAsync: fkt.callbackify(JSON.parse, JSON),
    stringify: JSON.stringify,
    stringifyAsync: fkt.callbackify(JSON.stringify, JSON),
    enabled(enabled) {
        return enabled ? strictImpl : nativeImpl;
    }
};

const strictImpl = {
    parse: JSON.parse,
    parseAsync: fkt.callbackify(JSON.parse, JSON),
    stringify: JSONs.stringify.bind(JSONs),
    stringifyAsync: fkt.callbackify(JSONs.stringify, JSONs),
    enabled(enabled) {
        return enabled ? strictImpl : nativeImpl;
    }
};

module.exports = strictImpl;
