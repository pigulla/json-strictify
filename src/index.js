var util = require('util');

var InvalidValueError = require('./InvalidValueError');

function check(data, references) {
    // Give more helpful error messages for the most common errors
    if (util.isDate(data)) {
        throw new InvalidValueError('Date is not a valid JSON type', data, references);
    }
    if (util.isError(data)) {
        throw new InvalidValueError('Error is not a valid JSON type', data, references);
    }
    if (util.isRegExp(data)) {
        throw new InvalidValueError('RegExp is not a valid JSON type', data, references);
    }
    if (data === undefined) {
        throw new InvalidValueError('undefined is not a valid JSON type', data, references);
    }
    if (typeof data === 'function') {
        throw new InvalidValueError('function is not a valid JSON type', data, references);
    }
    if (typeof data === 'number' && !isFinite(data)) {
        throw new InvalidValueError('infinite number is not a valid JSON type', data, references);
    }

    // Primitive types are always okay
    if (data === null || typeof data === 'string' || typeof data === 'boolean' || typeof data === 'number') {
        return;
    }

    // If an array, check its elements
    if (Array.isArray(data)) {
        data.forEach(function (item, index) {
            check(item, references.concat(index));
        });
        return;
    }

    // If an object, check its properties
    if (typeof data === 'object') {
        if (data.__proto__ && data.__proto__ !== Object.prototype) {
            throw new InvalidValueError('unexpected prototype', data, references);
        }

        Object.keys(data).forEach(function (key) {
            check(data[key], references.concat(key));
        });

        return;
    }

    // Anything else is an error
    throw new InvalidValueError('invalid type', data, references);
}

function validate(data) {
    check(data, []);
    return true;
}

function isValid(data) {
    try {
        return validate(data);
    } catch (e) {
        if (e instanceof InvalidValueError) {
            return false
        } else {
            throw e;
        }
    }
}

function stringify(data) {
    validate(data);
    return JSON.stringify.apply(JSON, arguments);
}

module.exports = {
    validate: validate,
    isValid: isValid,
    stringify: stringify
};
