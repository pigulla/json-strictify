'use strict'
/**
 * json-strictify
 *
 * @version 8.0.0
 * @author Raphael Pigulla <pigulla@four66.com>
 * @license MIT
 */
var __spreadArray =
    (this && this.__spreadArray) ||
    function (to, from, pack) {
        if (pack || arguments.length === 2)
            for (var i = 0, l = from.length, ar; i < l; i++) {
                if (ar || !(i in from)) {
                    if (!ar) ar = Array.prototype.slice.call(from, 0, i)
                    ar[i] = from[i]
                }
            }
        return to.concat(ar || Array.prototype.slice.call(from))
    }
var _a, _b
Object.defineProperty(exports, '__esModule', { value: true })
var util = require('node:util')
var circular_reference_error_1 = require('./circular-reference-error')
var invalid_value_error_1 = require('./invalid-value-error')
/**
 * Normalizes a user-specified replacer function.
 *
 * In short, JSON.stringify's "replacer" parameter can either be a function or an array containing
 * the names of the properties to be included. This method normalizes the latter case to the former
 * so we can always treat the "replacer" option as a function internally.
 *
 * For more information about the replacer function take a look at the documentation on
 * [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#The_replacer_parameter).
 */
function normalizeReplacer(replacer) {
    if (typeof replacer === 'function') {
        return replacer
    }
    if (Array.isArray(replacer)) {
        return function (key, value) {
            return key !== '' && !replacer.includes(key) ? undefined : value
        }
    }
    // We can't easily normalize an "empty replacer" with the identity function because we later
    // need to distinguish between a "real" undefined (which is illegal) and an undefined returned
    // by the replacer (which means "drop that value").
    return null
}
var JSONstrictify = /** @class */ (function () {
    function JSONstrictify(replacer) {
        this.replacer = replacer
    }
    /**
     * The drop-in replacement function for JSON.stringify.
     *
     * @throws {InvalidValueError}
     * @throws {CircularReferenceError}
     */
    JSONstrictify.validate = function (value, replacer) {
        var normalized_replacer = normalizeReplacer(replacer)
        var instance = new JSONstrictify(normalized_replacer)
        var initialData = normalized_replacer ? normalized_replacer.call(value, '', value) : value
        instance.check(initialData, [], new Set())
    }
    /**
     * Recursively check if the given object can be serialized to JSON safely.
     *
     * @throws {InvalidValueError}
     * @throws {CircularReferenceError}
     */
    JSONstrictify.prototype.checkObject = function (object, references, ancestors) {
        var actual
        this.assertNoCycle(object, references, ancestors)
        if (typeof object.toJSON === 'function') {
            actual = object.toJSON()
            return this.check(actual, references, ancestors)
        }
        // eslint-disable-next-line no-restricted-syntax
        for (var key in object) {
            actual = this.replacer ? this.replacer.call(object, key, object[key]) : object[key]
            if (!this.replacer || actual !== undefined) {
                this.check(
                    actual,
                    __spreadArray(__spreadArray([], references, true), [key], false),
                    ancestors.add(object),
                )
            }
        }
    }
    /**
     * Recursively check if the given array can be serialized to JSON safely.
     *
     * @throws {InvalidValueError}
     * @throws {CircularReferenceError}
     */
    JSONstrictify.prototype.checkArray = function (array, references, ancestors) {
        this.assertNoCycle(array, references, ancestors)
        for (var index = 0; index < array.length; ++index) {
            var actual = this.replacer
                ? this.replacer.call(array, String(index), array[index])
                : array[index]
            this.check(
                actual,
                __spreadArray(__spreadArray([], references, true), [String(index)], false),
                ancestors.add(array),
            )
        }
    }
    /**
     * Check if the given value is of a known, non-serializable type and provide a more specific,
     * helpful error message.
     *
     * @throws {InvalidValueError}
     */
    JSONstrictify.prototype.checkCommonTypes = function (value, references) {
        if (util.types.isNativeError(value)) {
            throw new invalid_value_error_1.default(
                'An error object is not JSON-serializable',
                value,
                references,
            )
        } else if (util.types.isRegExp(value)) {
            throw new invalid_value_error_1.default(
                'A RegExp is not JSON-serializable',
                value,
                references,
            )
        } else if (value === undefined) {
            throw new invalid_value_error_1.default(
                'undefined is not JSON-serializable',
                value,
                references,
            )
        } else if (typeof value === 'symbol') {
            throw new invalid_value_error_1.default(
                'A symbol is not JSON-serializable',
                value,
                references,
            )
        } else if (typeof value === 'function') {
            throw new invalid_value_error_1.default(
                'A function is not JSON-serializable',
                value,
                references,
            )
        } else if (typeof value === 'bigint') {
            throw new invalid_value_error_1.default(
                'A BigInt is not JSON-serializable',
                value,
                references,
            )
        } else if (typeof value === 'number' && !Number.isFinite(value)) {
            // The value's string representation itself will actually be descriptive
            // (i.e., "Infinity", "-Infinity" or "NaN").
            throw new invalid_value_error_1.default(
                ''.concat(value, ' is not JSON-serializable'),
                value,
                references,
            )
        }
    }
    /**
     * Recursively check if the given value can be serialized to JSON safely.
     *
     * @throws {InvalidValueError}
     * @throws {CircularReferenceError}
     */
    JSONstrictify.prototype.check = function (value, references, ancestors) {
        // Check for the most common non-serializable types.
        this.checkCommonTypes(value, references)
        // Primitive types are always okay (we've already checked for non-finite numbers).
        if (
            value === null ||
            typeof value === 'string' ||
            typeof value === 'boolean' ||
            typeof value === 'number'
        ) {
            return
        }
        if (Array.isArray(value)) {
            // If an array, check its elements.
            return this.checkArray(value, references, ancestors)
        }
        /* istanbul ignore else */
        if (typeof value === 'object') {
            // If an object, check its properties (we've already checked for null).
            return this.checkObject(value, references, ancestors)
        }
        // This case will not occur in a regular Node.js or browser environment, but could happen if you run your
        // script in an engine like Rhino or Nashorn and try to serialize a host object.
        /* istanbul ignore next */
        throw new invalid_value_error_1.default('Invalid type', value, references)
    }
    /**
     * Check if the passed value is a circular reference, i.e. whether it is one of its own ancestors.
     *
     * @throws {CircularReferenceError}
     */
    JSONstrictify.prototype.assertNoCycle = function (value, references, ancestors) {
        if (ancestors.has(value)) {
            throw new circular_reference_error_1.default(references)
        }
    }
    return JSONstrictify
})()
var native_impl =
    ((_a = {}),
    (_a[Symbol.toStringTag] = 'JSON'),
    (_a.parse = JSON.parse),
    (_a.stringify = JSON.stringify),
    (_a.enabled = function (enabled) {
        if (enabled === void 0) {
            enabled = true
        }
        /* eslint-disable-next-line @typescript-eslint/no-use-before-define */
        return enabled ? strict_impl : native_impl
    }),
    _a)
var strict_impl =
    ((_b = {}),
    (_b[Symbol.toStringTag] = 'JSON'),
    (_b.parse = JSON.parse),
    (_b.stringify = function (value, replacer, space) {
        JSONstrictify.validate(value, replacer)
        // Overloading in TypeScript seems to be a bit wonky...
        return typeof replacer === 'function'
            ? JSON.stringify(value, replacer, space)
            : JSON.stringify(value, replacer, space)
    }),
    (_b.enabled = function (enabled) {
        if (enabled === void 0) {
            enabled = true
        }
        return enabled ? strict_impl : native_impl
    }),
    _b)
/* istanbul ignore next */
exports.default = process.env['NODE_ENV'] === 'production' ? native_impl : strict_impl
