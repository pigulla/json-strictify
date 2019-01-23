'use strict';

const pointer = require('json-pointer');

/**
 * @class JSONs.CircularReferenceError
 * @extends Error
 */
class CircularReferenceError extends Error {
    /**
     * @param {Array.<(string|number)>} references
     */
    constructor (references) {
        super();

        this.references = references;
        this.path = pointer.compile(this.references);

        this.name = this.constructor.name;
        this.message = `Circular reference found at "${this.path}"'`;
    }
}

module.exports = CircularReferenceError;
