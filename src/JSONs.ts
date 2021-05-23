/**
 * json-strictify
 *
 * @version 7.0.1
 * @author Raphael Pigulla <pigulla@four66.com>
 * @license MIT
 */

import * as util from 'util'

import CircularReferenceError from './CircularReferenceError'
import InvalidValueError from './InvalidValueError'

type Ancestors = Set<object|any[]>;
type ReplacerFn = (this: any, key: string, value: any) => any;
type Replacer = ReplacerFn|(string|number)[]|undefined|null;
type NormalizedReplacer = null|((key: string, value: any) => any);
type GenericArray = any[];

interface GenericObject {[key: string]: any};

/**
 * Normalizes a user-specified replacer function.
 *
 * In short, JSON.stringify's "replacer" parameter can either be a function or an array containing the names of the
 * properties to be included. This method normalizes the latter case to the former so we can always treat the
 * "replacer" option as a function internally.
 *
 * For more information about the replacer function take a look at the documentation on
 * [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#The_replacer_parameter).
 */
function normalize_replacer (replacer?: Replacer): NormalizedReplacer {
    if (typeof replacer === 'function') {
        return replacer
    }

    if (Array.isArray(replacer)) {
        return function (key: string, value: any): ReplacerFn {
            return (key !== '' && replacer.indexOf(key) === -1) ? undefined : value
        }
    }

    // We can't easily normalize an "empty replacer" with the identity function because we later need to distinguish
    // between a "real" undefined (which is illegal) and an undefined returned by the replacer (which means "drop
    // that value").
    return null
}

class JSONstrictify {
    private readonly replacer: NormalizedReplacer

    private constructor (replacer: NormalizedReplacer) {
        this.replacer = replacer
    }

    /**
     * The drop-in replacement function for JSON.stringify.
     *
     * @throws {InvalidValueError}
     * @throws {CircularReferenceError}
     */
    public static validate (value: any, replacer: Replacer): void {
        const normalized_replacer = normalize_replacer(replacer)
        const instance = new JSONstrictify(normalized_replacer)
        const initialData = normalized_replacer ? normalized_replacer.call(value, '', value) : value

        instance.check(initialData, [], new Set())
    }

    /**
     * Recursively check if the given object can be serialized to JSON safely.
     *
     * @throws {InvalidValueError}
     * @throws {CircularReferenceError}
     */
    private check_object (object: GenericObject, references: string[], ancestors: Ancestors): void {
        let actual

        this.assert_no_cycle(object, references, ancestors)

        if (typeof object.toJSON === 'function') {
            actual = object.toJSON()
            return this.check(actual, references, ancestors)
        }

        for (const key in object) {
            actual = this.replacer ? this.replacer.call(object, key, object[key]) : object[key]

            if (!this.replacer || actual !== undefined) {
                this.check(actual, references.concat(key), ancestors.add(object))
            }
        }
    }

    /**
     * Recursively check if the given array can be serialized to JSON safely.
     *
     * @throws {InvalidValueError}
     * @throws {CircularReferenceError}
     */
    private check_array (array: GenericArray, references: string[], ancestors: Ancestors): void {
        this.assert_no_cycle(array, references, ancestors)

        for (let i = 0; i < array.length; ++i) {
            const actual = this.replacer ? this.replacer.call(array, String(i), array[i]) : array[i]

            this.check(actual, references.concat(String(i)), ancestors.add(array))
        }
    }

    /**
     * Check if the given value is of a known, non-serializable type and provide a more specific, helpful error message.
     *
     * @throws {InvalidValueError}
     */
    private check_common_types (value: any, references: string[]): void {
        if (util.types.isNativeError(value)) {
            throw new InvalidValueError('An error object is not JSON-serializable', value, references)
        } else if (util.types.isRegExp(value)) {
            throw new InvalidValueError('A RegExp is not JSON-serializable', value, references)
        } else if (value === undefined) {
            throw new InvalidValueError('undefined is not JSON-serializable', value, references)
        } else if (typeof value === 'symbol') {
            throw new InvalidValueError('A symbol is not JSON-serializable', value, references)
        } else if (typeof value === 'function') {
            throw new InvalidValueError('A function is not JSON-serializable', value, references)
        } else if (typeof value === 'bigint') {
            throw new InvalidValueError('A BigInt is not JSON-serializable', value, references)
        } else if (typeof value === 'number' && !isFinite(value)) {
            // The value's string representation itself will actually be descriptive ("Infinity", "-Infinity" or "NaN").
            throw new InvalidValueError(`${value} is not JSON-serializable`, value, references)
        }
    }

    /**
     * Recursively check if the given value can be serialized to JSON safely.
     *
     * @throws {InvalidValueError}
     * @throws {CircularReferenceError}
     */
    private check (value: any, references: string[], ancestors: Ancestors): void {
        // Check for the most common non-serializable types.
        this.check_common_types(value, references)

        // Primitive types are always okay (we've already checked for non-finite numbers).
        if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') {
            return
        }

        if (Array.isArray(value)) {
            // If an array, check its elements.
            return this.check_array(value, references, ancestors)
        }

        /* istanbul ignore else */
        if (typeof value === 'object') {
            // If an object, check its properties (we've already checked for null).
            return this.check_object(value, references, ancestors)
        }

        // This case will not occur in a regular Node.js or browser environment, but could happen if you run your
        // script in an engine like Rhino or Nashorn and try to serialize a host object.
        /* istanbul ignore next */
        throw new InvalidValueError('Invalid type', value, references)
    }

    /**
     * Check if the passed value is a circular reference, i.e. whether it is one of its own ancestors.
     *
     * @throws {CircularReferenceError}
     */
    private assert_no_cycle (value: GenericArray|GenericObject, references: string[], ancestors: Ancestors): void {
        if (ancestors.has(value)) {
            throw new CircularReferenceError(references)
        }
    }
};

export type JSONs = JSON & {
    readonly [Symbol.toStringTag]: 'JSON';
    enabled (enabled?: boolean): JSONs;
}

const native_impl: JSONs = {
    [Symbol.toStringTag]: 'JSON',
    parse: JSON.parse,
    stringify: JSON.stringify,
    enabled (enabled: boolean = true): JSONs {
        /* eslint-disable-next-line @typescript-eslint/no-use-before-define */
        return enabled ? strict_impl : native_impl
    }
}

const strict_impl: JSONs = {
    [Symbol.toStringTag]: 'JSON',
    parse: JSON.parse,
    stringify (value: any, replacer: Replacer, space?: string|number): string {
        JSONstrictify.validate(value, replacer)

        // Overloading in TypeScript seems to be a bit wonky...
        return typeof replacer === 'function'
            ? JSON.stringify(value, replacer, space)
            : JSON.stringify(value, replacer, space)
    },
    enabled (enabled: boolean = true): JSONs {
        return enabled ? strict_impl : native_impl
    }
}

/* istanbul ignore next */
export default process.env.NODE_ENV === 'production' ? native_impl : strict_impl
