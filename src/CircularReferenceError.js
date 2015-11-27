'use strict';

var util = require('util');

var pointer = require('json-pointer');

/**
 * @class JSONs.CircularReferenceError
 * @extends {Error}
 * @constructor
 * @param {Array.<(string|number)>} references
 */
function CircularReferenceError(references) {
    this.references = references;
    this.path = pointer.compile(this.references);

    this.name = 'CircularReferenceError';
    this.message = util.format('Circular reference found at "%s"', this.path);

    Error.call(this);
}

util.inherits(CircularReferenceError, Error);

/* eslint-disable no-unused-expressions */
/**
 * @type {string}
 */
CircularReferenceError.prototype.name;

/**
 * @type {string}
 */
CircularReferenceError.prototype.path;

/**
 * @type {Array.<(string|number)>}
 */
CircularReferenceError.prototype.references;
/* eslint-enable no-unused-expressions */

module.exports = CircularReferenceError;
