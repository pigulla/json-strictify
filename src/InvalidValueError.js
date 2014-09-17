var util = require('util');

var pointer = require('json-pointer');

/**
 * @extends {Error}
 * @constructor
 * @param {string} message
 * @param {*} value
 * @param {Array.<(string|number)>} references
 */
function InvalidValueError(message, value, references) {
    this.references = references;
    this.value = value;

    this.name = 'InvalidValueError';
    this.message = util.format(
        'Invalid value at %s (%s)',
        pointer.compile(this.references), message
    );

    Error.call(this);
}

util.inherits(InvalidValueError, Error);

/**
 * @type {Array.<(string|number)>}
 */
InvalidValueError.prototype.references;

/**
 * @type {*}
 */
InvalidValueError.prototype.value;

module.exports = InvalidValueError;
