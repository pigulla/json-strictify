'use strict';

const pointer = require('json-pointer');

/**
 * @class JSONs.InvalidValueError
 * @extends Error
 */
class InvalidValueError extends Error {
    /**
     * @param {string} message
     * @param {*} value
     * @param {Array.<(string|number)>=} references
     */
    constructor(message, value, references) {
        super();

        this.references = references;
        this.value = value;
        this.path = pointer.compile(this.references);

        this.name = this.constructor.name;
        this.message = `Invalid value at "${this.path}" (${message}})`;
    }
}

module.exports = InvalidValueError;
