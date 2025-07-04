import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'
import { inherits } from 'node:util'

import noop from 'lodash.noop'
import type { Class, JsonObject } from 'type-fest'

import JSONs, { CircularReferenceError, InvalidValueError, JsonStrictifyError } from '../src'

function assertThrowsAt(
    callback: (...args: unknown[]) => unknown,
    clazz: Class<JsonStrictifyError>,
    reference: string,
): void {
    let error: JsonStrictifyError | undefined

    try {
        callback()
    } catch (error_) {
        error = error_ as JsonStrictifyError
    }

    assert(error)
    assert(error instanceof clazz)
    assert.deepEqual(error?.path, reference)
}

void describe('JSONs', () => {
    let revert: () => void

    // Generic setup for rewire
    // biome-ignore lint/suspicious/noAssignInExpressions: This is fine.
    beforeEach(() => (revert = noop))
    afterEach(() => revert())

    void it('errors extend properly', () => {
        const circular_reference_error = new CircularReferenceError(['some', 'path'])
        const invalid_value_error = new InvalidValueError('An error message', 42, ['some', 'path'])

        assert(circular_reference_error instanceof Error)
        assert(circular_reference_error instanceof JsonStrictifyError)
        assert(invalid_value_error instanceof Error)
        assert(invalid_value_error instanceof JsonStrictifyError)
    })

    void describe('provides basic functionality', () => {
        void it('accepts a valid object', () => {
            const o = {
                foo: 'bar',
                meaning: 42,
                awesome: true,
                stuff: [1, 2, 3],
            }

            assert.equal(JSONs.stringify(o), JSON.stringify(o))
        })

        void it('refuses invalid values', () => {
            assert.throws(() => JSONs.stringify({ foo() {} }), InvalidValueError)
            assert.throws(() => JSONs.stringify([undefined]), InvalidValueError)
            assert.throws(() => JSONs.stringify(/regex/), InvalidValueError)
            assert.throws(() => JSONs.stringify(new Error('Boom!')), InvalidValueError)
            assert.throws(() => JSONs.stringify([0, Number.NaN, 2]), InvalidValueError)
            assert.throws(() => JSONs.stringify(BigInt(1)), InvalidValueError)
            assert.throws(() => JSONs.stringify(Symbol('test')), InvalidValueError)
        })

        void it('honors "toJSON" methods', () => {
            const o = {
                x: 42,
                y: {
                    toJSON() {
                        return [0, 8, 15]
                    },
                },
            }

            assert.equal(JSONs.stringify(o), JSON.stringify(o))
        })

        void it('works with the prototype chain', () => {
            function A() {}
            A.prototype.a = 42

            function B() {}
            inherits(B, A)
            B.prototype.b = 'foo'

            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const b = new B()

            assert.equal(JSONs.stringify(b), JSON.stringify(b))
        })

        void it('ignores non-enumerable properties', () => {
            const o = {
                a: 42,
                b: false,
            }

            Object.defineProperty(o, 'c', {
                enumerable: false,
                value: 'hello',
            })

            assert.equal(JSONs.stringify(o), JSON.stringify(o))
        })
    })

    void describe('detects a circular reference', () => {
        void it('that is a self loop', () => {
            const o: JsonObject = { a: 42 }

            o.b = o

            assertThrowsAt(() => JSONs.stringify(o), CircularReferenceError, '/b')
        })

        void it('that is transitive', () => {
            const o: JsonObject = { a: [{ b: {} }] }

            // @ts-ignore
            o.a[0].b.circular = o

            assertThrowsAt(() => JSONs.stringify(o), CircularReferenceError, '/a/0/b/circular')
        })

        void it(`that isn't actually one`, () => {
            // This is the case that used to break json-stringify-safe, so we want to get it right.
            // See https://github.com/isaacs/json-stringify-safe/issues/9
            const p = {}
            const o = {
                a: p,
                b: p,
            }

            assert.equal(JSONs.stringify(o), '{"a":{},"b":{}}')
        })

        void it('introduced by toJSON and a replacer', () => {
            const o = {
                a: [
                    {
                        x: Number.NaN,
                        toJSON() {
                            return [42, { y: null }]
                        },
                    },
                ],
            }

            function replacer(key: string, value: unknown) {
                return key === 'y' ? o : value
            }

            assertThrowsAt(() => JSONs.stringify(o, replacer), CircularReferenceError, '/a/0/1/y')
        })
    })

    void describe('delegates to native methods', () => {
        void it('for JSON.parse', () => {
            assert.equal(JSONs.parse, JSON.parse)
        })

        void it('and passes all parameters to JSON.stringify', () => {
            const o = {
                x: 42,
                y: [0, 8, 15],
            }

            assert.equal(JSONs.stringify(o, null, 4), JSON.stringify(o, null, 4))
        })

        void it('when disabled', () => {
            assert.equal(JSONs.enabled(false).parse, JSON.parse)
        })

        void it('not when enabled', () => {
            assert.equal(JSONs.enabled(), JSONs)
        })

        void it('when enabled and then disabled again', () => {
            // call 'enable' more than necessary to cover all code paths
            assert.equal(
                JSONs.enabled(false).enabled().enabled(false).enabled(false).parse,
                JSON.parse,
            )
        })
    })

    void describe('honors the "replacer" parameter', () => {
        void it('and preserves its context correctly', () => {
            const o = [{ a: 42 }, { b: 42 }]
            const contexts = new Map()
            contexts.set('0', o)
            contexts.set('1', o)
            contexts.set('a', o[0])
            contexts.set('b', o[1])

            function replacer(this: unknown, key: string, value: unknown): unknown {
                if (key !== '') {
                    assert.equal(this, contexts.get(String(key)))
                }

                return value
            }

            JSONs.stringify(o, replacer)
        })

        void describe('that is an array', () => {
            void it('for valid input', () => {
                const replacer = ['c', 'd']
                const o = {
                    a: 0,
                    b: 1,
                    c: 13,
                    d: 42,
                }

                assert.equal(JSONs.stringify(o, replacer), JSON.stringify(o, replacer))
            })

            void it('for nested valid input', () => {
                const replacer = ['a', 'b']

                assert.equal(
                    JSONs.stringify(
                        {
                            a: 0,
                            b: {
                                a: 1,
                                invalid: Number.NaN,
                            },
                            invalid: undefined,
                        },
                        replacer,
                    ),
                    '{"a":0,"b":{"a":1}}',
                )
            })
        })

        void describe('that is a function', () => {
            void it('for valid input', () => {
                function replacer(key: string, value: number): unknown {
                    return key === '' || value > 5 ? value : undefined
                }

                const o = {
                    a: 0,
                    b: 1,
                    c: 13,
                    d: 42,
                }

                assert.equal(JSONs.stringify(o, replacer), JSON.stringify(o, replacer))
            })

            void it('for validly replaced input', () => {
                function replacer(key: string, value: unknown): unknown {
                    if (key === '') {
                        return value
                    }
                    return key === 'replaceMe' ? { y: 42 } : value
                }

                assert.equal(
                    JSONs.stringify(
                        {
                            a: 0,
                            b: 1,
                            c: 13,
                            replaceMe: undefined,
                        },
                        replacer,
                    ),
                    '{"a":0,"b":1,"c":13,"replaceMe":{"y":42}}',
                )
            })

            void it('for invalidly replaced input', () => {
                function replacer(key: string, value: unknown): unknown {
                    if (key === '') {
                        return value
                    }
                    return key === 'replaceMe' ? { y: Number.NaN } : value
                }

                assertThrowsAt(
                    () => {
                        JSONs.stringify(
                            {
                                a: 0,
                                b: 1,
                                c: 13,
                                replaceMe: undefined,
                            },
                            replacer,
                        )
                    },
                    InvalidValueError,
                    '/replaceMe/y',
                )
            })
        })
    })

    void describe('works when both a replacer and toJSON() is used', () => {
        void it('for a valid object', () => {
            const o = {
                a: 42,
                b: {
                    toJSON() {
                        return {
                            x: 'test',
                            y: [],
                            z: Number.NaN,
                        }
                    },
                },
                c: [0, 8, 15],
            }

            function replacer(key: string, value: unknown): unknown {
                return key === 'z' ? undefined : value
            }

            assert.equal(JSONs.stringify(o, replacer), JSON.stringify(o, replacer))
        })

        void it('for an object with circular references', () => {
            const x = { y: 'z' }
            const o = {
                a: 42,
                b: {
                    toJSON() {
                        return {
                            x: 'test',
                            y: [],
                            z: {
                                p: Number.NaN,
                                toJSON() {
                                    return [null, x]
                                },
                            },
                        }
                    },
                },
                c: [0, 8, 15],
                x,
            }

            function replacer(key: string, value: unknown): unknown {
                return key === 'p' ? undefined : value
            }

            assertThrowsAt(() => JSONs.stringify(o, replacer), CircularReferenceError, '/x')
        })

        void it('for an invalid object', () => {
            const o = {
                a: 42,
                b: {
                    toJSON() {
                        return {
                            x: 'test',
                            y: [],
                            z: {
                                p: Number.NaN,
                                toJSON() {
                                    return [null, /invalid/]
                                },
                            },
                        }
                    },
                },
                c: [0, 8, 15],
            }

            function replacer(key: string, value: unknown): unknown {
                return key === 'p' ? undefined : value
            }

            assertThrowsAt(() => JSONs.stringify(o, replacer), InvalidValueError, '/b/z/1')
        })
    })

    void describe('reports the correct path', () => {
        void it('for the root value', () => {
            // eslint-disable-next-line unicorn/no-useless-undefined
            assertThrowsAt(() => JSONs.stringify(undefined), InvalidValueError, '')
        })

        void it('for some nested value', () => {
            assertThrowsAt(
                () => {
                    JSONs.stringify([
                        null,
                        42,
                        {
                            x: {
                                toJSON() {
                                    return [false, { y: undefined }]
                                },
                            },
                        },
                    ])
                },
                InvalidValueError,
                '/2/x/1/y',
            )
        })
    })
})
