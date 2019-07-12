'use strict';

/**
 * json-strictify
 *
 * @version 5.0.5
 * @author Raphael Pigulla <pigulla@four66.com>
 * @license MIT
 */

const util = require('util');

const callbackify = require('./callbackify');

const CircularReferenceError = require('./CircularReferenceError');
const InvalidValueError = require('./InvalidValueError');

const JSONs = {
    /**
     * @type {?function(string|number,*):*}
     */
    replacer: null,

    /**
     * Recursively check if the given object can be serialized to JSON safely.
     *
     * @param {Object} object
     * @param {Array.<(string|number)>} references
     * @param {Set.<(object|array)>} ancestors
     * @return {undefined}
     * @throws {JSONs.InvalidValueError}
     * @throws {JSONs.CircularReferenceError}
     */
    checkObject (object, references, ancestors) {
        let actual;

        this.assertNoCycle(object, references, ancestors);

        if (typeof object.toJSON === 'function') {
            actual = object.toJSON();
            return this.check(actual, references, ancestors);
        }

        for (const key in object) {
            actual = this.replacer ? this.replacer.call(object, key, object[key]) : object[key];

            if (!this.replacer || actual !== undefined) {
                this.check(actual, references.concat(key), ancestors.add(object));
            }
        }
    },

    /**
     * Recursively check if the given array can be serialized to JSON safely.
     *
     * @param {Array} array
     * @param {Array.<(string|number)>} references
     * @param {Set.<(object|array)>} ancestors
     * @return {undefined}
     * @throws {JSONs.InvalidValueError}
     * @throws {JSONs.CircularReferenceError}
     */
    checkArray (array, references, ancestors) {
        this.assertNoCycle(array, references, ancestors);

        for (let i = 0; i < array.length; ++i) {
            const actual = this.replacer ? this.replacer.call(array, i, array[i]) : array[i];

            this.check(actual, references.concat(i), ancestors.add(array));
        }
    },

    /**
     * Check if the given value is of a known, non-serializable type and provide a more specific, helpful error message.
     *
     * @param {*} value
     * @param {Array.<(string|number)>} references
     * @return {undefined}
     * @throws {JSONs.InvalidValueError}
     */
    checkCommonTypes (value, references) {
        if (util.types.isNativeError(value)) {
            throw new InvalidValueError('An error object is not JSON-serializable', value, references);
        } else if (util.types.isRegExp(value)) {
            throw new InvalidValueError('A RegExp is not JSON-serializable', value, references);
        } else if (value === undefined) {
            throw new InvalidValueError('undefined is not JSON-serializable', value, references);
        } else if (typeof value === 'symbol') {
            throw new InvalidValueError('A symbol is not JSON-serializable', value, references);
        } else if (typeof value === 'function') {
            throw new InvalidValueError('A function is not JSON-serializable', value, references);
        } else if (typeof value === 'bigint') {
            throw new InvalidValueError('A BigInt is not JSON-serializable', value, references);
        } else if (typeof value === 'number' && !isFinite(value)) {
            // The value's string representation itself will actually be descriptive ("Infinity", "-Infinity" or "NaN").
            throw new InvalidValueError(`${value} is not JSON-serializable`, value, references);
        }
    },

    /**
     * Recursively check if the given value can be serialized to JSON safely.
     *
     * @param {*} value
     * @param {Array.<(string|number)>} references
     * @param {Set.<(object|array)>} ancestors
     * @return {undefined}
     * @throws {JSONs.InvalidValueError}
     * @throws {JSONs.CircularReferenceError}
     */
    check (value, references, ancestors) {
        // Check for the most common non-serializable types.
        this.checkCommonTypes(value, references);

        // Primitive types are always okay (we've already checked for non-finite numbers).
        if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') {
            return;
        }

        if (Array.isArray(value)) {
            // If an array, check its elements.
            return this.checkArray(value, references, ancestors);
        }

        if (typeof value === 'object') {
            // If an object, check its properties (we've already checked for null).
            return this.checkObject(value, references, ancestors);
        }

        // This case will not occur in a regular Node.js or browser environment, but could happen if you run your
        // script in an engine like Rhino or Nashorn and try to serialize a host object.
        /* istanbul-ignore next */
        throw new InvalidValueError('Invalid type', value, references);
    },

    /**
     * Normalizes the user-specified replacer function.
     *
     * In short, JSON.stringify's "replacer" parameter can either be a function or an array containing the names of the
     * properties to be included. This method normalizes the latter case to the former so we can always treat the
     * "replacer" option as a function internally.
     *
     * For more information about the replacer function take a look at the documentation on
     * [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#The_replacer_parameter).
     *
     * @param {(function(string,*)|Array.<(string|number)>)=} replacer
     * @return {?function(string,*):*}
     */
    normalizeReplacer (replacer) {
        if (typeof replacer === 'function') {
            return replacer;
        }

        if (Array.isArray(replacer)) {
            return function (key, value) {
                return (key !== '' && replacer.indexOf(key) === -1) ? undefined : value;
            };
        }

        // We can't easily normalize an "empty replacer" with the identity function because we later need to distinguish
        // between a "real" undefined (which is illegal) and an undefined returned by the replacer (which means "drop
        // that value").
        return null;
    },

    /**
     * Check if the passed value is a circular reference, i.e. whether it is one of its own ancestors.
     *
     * @param {(Object|Array)} value
     * @param {Array.<(string|number)>} references
     * @param {Set.<(object|array)>} ancestors
     * @throws {JSONs.CircularReferenceError}
     */
    assertNoCycle (value, references, ancestors) {
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
    stringify (value, replacer, space) {
        this.replacer = this.normalizeReplacer(replacer);

        const initialData = this.replacer ? this.replacer.call(value, '', value) : value;

        this.check(initialData, [], new Set());

        // Fall back to the native JSON.stringify that we now know is safe to use.
        return JSON.stringify(value, replacer, space);
    }
};

const nativeImpl = {
    parse: JSON.parse,
    parseAsync: callbackify(JSON.parse, JSON),
    stringify: JSON.stringify,
    stringifyAsync: callbackify(JSON.stringify, JSON),
    enabled (enabled) {
        return enabled ? strictImpl : nativeImpl;
    }
};

const strictImpl = {
    parse: JSON.parse,
    parseAsync: callbackify(JSON.parse, JSON),
    stringify: JSONs.stringify.bind(JSONs),
    stringifyAsync: callbackify(JSONs.stringify, JSONs),
    enabled (enabled) {
        return enabled ? strictImpl : nativeImpl;
    }
};

module.exports = process.env.NODE_ENV === 'production' ? nativeImpl : strictImpl;
