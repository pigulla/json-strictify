/**
 * json-strictify
 *
 * @version 0.2.0
 * @author Raphael Pigulla <pigulla@four66.com>
 * @license MIT
 */

var util = require('util');

var CircularReferenceError = require('./CircularReferenceError'),
    InvalidValueError = require('./InvalidValueError');

var JSONs = {
    /**
     * @type {?function(string,*)}
     */
    replacer: null,

    /**
     * @param {Object} object
     * @param {Array.<(string|number)>} references
     * @param {Array.<(Object|Array)>} ancestors
     * @return {undefined}
     * @throws {JSONs.InvalidValueError}
     * @throws {JSONs.CircularReferenceError}
     */
    checkObject: function (object, references, ancestors) {
        var actual;

        this.detectCycle(object, references, ancestors);

        if (typeof object.toJSON === 'function') {
            actual = object.toJSON();
            return this.check(actual, references, ancestors);
        }
    
        for (var key in object) { // jshint ignore:line
            actual = this.replacer ? this.replacer(key, object[key]) : object[key];
    
            if (!(this.replacer && actual === undefined)) {
                this.check(actual, references.concat(key), ancestors.concat(object));
            }
        }
    },
    
    /**
     * @param {Array} array
     * @param {Array.<(string|number)>} references
     * @param {Array.<(Object|Array)>} ancestors
     * @return {undefined}
     * @throws {JSONs.InvalidValueError}
     * @throws {JSONs.CircularReferenceError}
     */
    checkArray: function (array, references, ancestors) {
        this.detectCycle(array, references, ancestors);

        return array.forEach(function (item, index) {
            var actual = this.replacer ? this.replacer(index, item) : item;
            this.check(actual, references.concat(index), ancestors.concat([array]));
        }, this);
    },
    
    /**
     * Give more helpful error messages for most common invalid types.
     *
     * @param {*} value
     * @param {Array.<(string|number)>} references
     * @throws {JSONs.InvalidValueError}
     */
    checkCommonTypes: function (value, references) {
        if (util.isError(value)) {
            throw new InvalidValueError('An error is not a valid JSON type', value, references);
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
            throw new InvalidValueError(value + ' is not a valid JSON type', value, references);
        }
    },
    
    /**
     * @param {*} value
     * @param {Array.<(string|number)>} references
     * @param {Array.<(Object|Array)>} ancestors
     * @return {undefined}
     * @throws {JSONs.InvalidValueError}
     * @throws {JSONs.CircularReferenceError}
     */
    check: function (value, references, ancestors) {
        this.checkCommonTypes(value, references);
    
        // Primitive types are always okay (we've already checked for non-finite numbers)
        if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') {
            return;
        }
    
        if (Array.isArray(value)) {
            // If an array, check its elements
            return this.checkArray(value, references, ancestors);
        } else /* istanbul ignore else */ if (typeof value === 'object') {
            // If an object, check its properties (we've already checked for null)
            return this.checkObject(value, references, ancestors);
        } else {
            // Anything else (e.g., a host object) is an error
            throw new InvalidValueError('Invalid type', value);
        }
    },
    
    /**
     * @param {(function(string,*)|Array.<(string|number)>)=} replacer
     * @return {?function(string,*)}
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
     * @param {(Object|Array)} value
     * @param {Array.<(string|number)>} references
     * @param {Array.<(Object|Array)>} ancestors
     * @throws {JSONs.CircularReferenceError}
     */
    detectCycle: function (value, references, ancestors) {
        var idx = ancestors.indexOf(value);

        if (idx !== -1) {
            throw new CircularReferenceError(references);
        }
    },
    
    /**
     * @param {*} value
     * @param {(function(string,*)|Array.<(string|number)>)=} replacer
     * @param {number=} space
     * @return {string}
     * @throws {JSONs.InvalidValueError}
     * @throws {JSONs.CircularReferenceError}
     */
    stringify: function (value, replacer, space) {
        this.replacer = this.normalizeReplacer(replacer);

        var initialData = this.replacer ? this.replacer('', value) : value,
            references = [],
            ancestors = [];

        this.check(initialData, references, ancestors);
        return JSON.stringify(value, replacer, space);
    }
};

var wrapper = {
    parse: JSON.parse,
    stringify: JSONs.stringify.bind(JSONs),
    enable: function (enabled) {
        return enabled ? wrapper : JSON;
    }
};

module.exports = wrapper;
