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

/*jshint -W030*/
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
/*jshint +W030*/

module.exports = CircularReferenceError;
