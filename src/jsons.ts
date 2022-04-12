/**
 * json-strictify
 *
 * @version 8.0.0
 * @author Raphael Pigulla <pigulla@four66.com>
 * @license MIT
 */

import * as util from 'node:util'

import type { JsonObject } from 'type-fest'

import CircularReferenceError from './circular-reference-error'
import InvalidValueError from './invalid-value-error'

type Ancestors = Set<object | unknown[]>
type ReplacerFunction = (this: unknown, key: string, value: unknown) => unknown
type Replacer = ReplacerFunction | (string | number)[] | undefined | null
type NormalizedReplacer = null | ((key: string, value: unknown) => unknown)
type GenericArray = unknown[]

interface GenericObject {
    [key: string]: unknown
    toJSON?: () => JsonObject
}

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
function normalizeReplacer(replacer: Replacer): NormalizedReplacer {
    if (typeof replacer === 'function') {
        return replacer
    }

    if (Array.isArray(replacer)) {
        return function (key: string, value: unknown): unknown {
            return key !== '' && !replacer.includes(key) ? undefined : value
        }
    }

    // We can't easily normalize an "empty replacer" with the identity function because we later
    // need to distinguish between a "real" undefined (which is illegal) and an undefined returned
    // by the replacer (which means "drop that value").
    return null
}

class JSONstrictify {
    private readonly replacer: NormalizedReplacer

    private constructor(replacer: NormalizedReplacer) {
        this.replacer = replacer
    }

    /**
     * The drop-in replacement function for JSON.stringify.
     *
     * @throws {InvalidValueError}
     * @throws {CircularReferenceError}
     */
    public static validate(value: unknown, replacer: Replacer): void {
        const normalized_replacer = normalizeReplacer(replacer)
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
    private checkObject(object: GenericObject, references: string[], ancestors: Ancestors): void {
        let actual

        this.assertNoCycle(object, references, ancestors)

        if (typeof object.toJSON === 'function') {
            actual = object.toJSON()
            return this.check(actual, references, ancestors)
        }

        // eslint-disable-next-line no-restricted-syntax
        for (const key in object) {
            actual = this.replacer ? this.replacer.call(object, key, object[key]) : object[key]

            if (!this.replacer || actual !== undefined) {
                this.check(actual, [...references, key], ancestors.add(object))
            }
        }
    }

    /**
     * Recursively check if the given array can be serialized to JSON safely.
     *
     * @throws {InvalidValueError}
     * @throws {CircularReferenceError}
     */
    private checkArray(array: GenericArray, references: string[], ancestors: Ancestors): void {
        this.assertNoCycle(array, references, ancestors)

        for (let index = 0; index < array.length; ++index) {
            const actual = this.replacer
                ? this.replacer.call(array, String(index), array[index])
                : array[index]

            this.check(actual, [...references, String(index)], ancestors.add(array))
        }
    }

    /**
     * Check if the given value is of a known, non-serializable type and provide a more specific,
     * helpful error message.
     *
     * @throws {InvalidValueError}
     */
    private checkCommonTypes(value: unknown, references: string[]): void {
        if (util.types.isNativeError(value)) {
            throw new InvalidValueError(
                'An error object is not JSON-serializable',
                value,
                references,
            )
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
        } else if (typeof value === 'number' && !Number.isFinite(value)) {
            // The value's string representation itself will actually be descriptive
            // (i.e., "Infinity", "-Infinity" or "NaN").
            throw new InvalidValueError(`${value} is not JSON-serializable`, value, references)
        }
    }

    /**
     * Recursively check if the given value can be serialized to JSON safely.
     *
     * @throws {InvalidValueError}
     * @throws {CircularReferenceError}
     */
    private check(value: unknown, references: string[], ancestors: Ancestors): void {
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
            return this.checkObject(value as GenericObject, references, ancestors)
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
    private assertNoCycle(
        value: GenericArray | GenericObject,
        references: string[],
        ancestors: Ancestors,
    ): void {
        if (ancestors.has(value)) {
            throw new CircularReferenceError(references)
        }
    }
}

export type JSONs = JSON & {
    readonly [Symbol.toStringTag]: 'JSON'
    enabled(enabled?: boolean): JSONs
}

const native_impl: JSONs = {
    [Symbol.toStringTag]: 'JSON',
    parse: JSON.parse,
    stringify: JSON.stringify,
    enabled(enabled: boolean = true): JSONs {
        /* eslint-disable-next-line @typescript-eslint/no-use-before-define */
        return enabled ? strict_impl : native_impl
    },
}

const strict_impl: JSONs = {
    [Symbol.toStringTag]: 'JSON',
    parse: JSON.parse,
    stringify(value: unknown, replacer: Replacer, space?: string | number): string {
        JSONstrictify.validate(value, replacer)

        // Overloading in TypeScript seems to be a bit wonky...
        return typeof replacer === 'function'
            ? JSON.stringify(value, replacer, space)
            : JSON.stringify(value, replacer, space)
    },
    enabled(enabled: boolean = true): JSONs {
        return enabled ? strict_impl : native_impl
    },
}

/* istanbul ignore next */
export default process.env['NODE_ENV'] === 'production' ? native_impl : strict_impl
