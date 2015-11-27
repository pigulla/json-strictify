'use strict';

var util = require('util');

var pointer = require('json-pointer');

/**
 * @class JSONs.InvalidValueError
 * @extends {Error}
 * @constructor
 * @param {string} message
 * @param {*} value
 * @param {Array.<(string|number)>=} references
 */
function InvalidValueError(message, value, references) {
    this.references = references;
    this.value = value;
    this.path = pointer.compile(this.references);

    this.name = 'InvalidValueError';
    this.message = util.format('Invalid value at "%s" (%s)', this.path, message);

    Error.call(this);
}

util.inherits(InvalidValueError, Error);

/* eslint-disable no-unused-expressions */
/**
 * @type {string}
 */
InvalidValueError.prototype.name;

/**
 * @type {string}
 */
InvalidValueError.prototype.path;

/**
 * @type {Array.<(string|number)>}
 */
InvalidValueError.prototype.references;

/**
 * @type {*}
 */
InvalidValueError.prototype.value;
/* eslint-enable no-unused-expressions */

module.exports = InvalidValueError;
