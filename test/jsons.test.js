'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
var strict_1 = require('node:assert/strict')
var node_test_1 = require('node:test')
var node_util_1 = require('node:util')
var lodash_noop_1 = require('lodash.noop')
var src_1 = require('../src')
function assertThrowsAt(callback, clazz, reference) {
    var error
    try {
        callback()
    } catch (error_) {
        error = error_
    }
    ;(0, strict_1.default)(error)
    ;(0, strict_1.default)(error instanceof clazz)
    strict_1.default.deepEqual(error === null || error === void 0 ? void 0 : error.path, reference)
}
;(0, node_test_1.describe)('JSONs', function () {
    var revert
        // Generic setup for rewire
    ;(0, node_test_1.beforeEach)(function () {
        return (revert = lodash_noop_1.default)
    })
    ;(0, node_test_1.afterEach)(function () {
        return revert()
    })
    ;(0, node_test_1.it)('errors extend properly', function () {
        var circular_reference_error = new src_1.CircularReferenceError(['some', 'path'])
        var invalid_value_error = new src_1.InvalidValueError('An error message', 42, [
            'some',
            'path',
        ])
        ;(0, strict_1.default)(circular_reference_error instanceof Error)
        ;(0, strict_1.default)(circular_reference_error instanceof src_1.JsonStrictifyError)
        ;(0, strict_1.default)(invalid_value_error instanceof Error)
        ;(0, strict_1.default)(invalid_value_error instanceof src_1.JsonStrictifyError)
    })
    ;(0, node_test_1.describe)('provides basic functionality', function () {
        ;(0, node_test_1.it)('accepts a valid object', function () {
            var o = {
                foo: 'bar',
                meaning: 42,
                awesome: true,
                stuff: [1, 2, 3],
            }
            strict_1.default.equal(src_1.default.stringify(o), JSON.stringify(o))
        })
        ;(0, node_test_1.it)('refuses invalid values', function () {
            strict_1.default.throws(function () {
                return src_1.default.stringify({ foo: function () {} })
            }, src_1.InvalidValueError)
            strict_1.default.throws(function () {
                return src_1.default.stringify([undefined])
            }, src_1.InvalidValueError)
            strict_1.default.throws(function () {
                return src_1.default.stringify(/regex/)
            }, src_1.InvalidValueError)
            strict_1.default.throws(function () {
                return src_1.default.stringify(new Error('Boom!'))
            }, src_1.InvalidValueError)
            strict_1.default.throws(function () {
                return src_1.default.stringify([0, Number.NaN, 2])
            }, src_1.InvalidValueError)
            strict_1.default.throws(function () {
                return src_1.default.stringify(BigInt(1))
            }, src_1.InvalidValueError)
            strict_1.default.throws(function () {
                return src_1.default.stringify(Symbol('test'))
            }, src_1.InvalidValueError)
        })
        ;(0, node_test_1.it)('honors "toJSON" methods', function () {
            var o = {
                x: 42,
                y: {
                    toJSON: function () {
                        return [0, 8, 15]
                    },
                },
            }
            strict_1.default.equal(src_1.default.stringify(o), JSON.stringify(o))
        })
        ;(0, node_test_1.it)('works with the prototype chain', function () {
            function A() {}
            A.prototype.a = 42
            function B() {}
            ;(0, node_util_1.inherits)(B, A)
            B.prototype.b = 'foo'
            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            var b = new B()
            strict_1.default.equal(src_1.default.stringify(b), JSON.stringify(b))
        })
        ;(0, node_test_1.it)('ignores non-enumerable properties', function () {
            var o = {
                a: 42,
                b: false,
            }
            Object.defineProperty(o, 'c', {
                enumerable: false,
                value: 'hello',
            })
            strict_1.default.equal(src_1.default.stringify(o), JSON.stringify(o))
        })
    })
    ;(0, node_test_1.describe)('detects a circular reference', function () {
        ;(0, node_test_1.it)('that is a self loop', function () {
            var o = { a: 42 }
            o.b = o
            assertThrowsAt(
                function () {
                    return src_1.default.stringify(o)
                },
                src_1.CircularReferenceError,
                '/b',
            )
        })
        ;(0, node_test_1.it)('that is transitive', function () {
            var o = { a: [{ b: {} }] }
            // @ts-ignore
            o.a[0].b.circular = o
            assertThrowsAt(
                function () {
                    return src_1.default.stringify(o)
                },
                src_1.CircularReferenceError,
                '/a/0/b/circular',
            )
        })
        ;(0, node_test_1.it)("that isn't actually one", function () {
            // This is the case that used to break json-stringify-safe, so we want to get it right.
            // See https://github.com/isaacs/json-stringify-safe/issues/9
            var p = {}
            var o = {
                a: p,
                b: p,
            }
            strict_1.default.equal(src_1.default.stringify(o), '{"a":{},"b":{}}')
        })
        ;(0, node_test_1.it)('introduced by toJSON and a replacer', function () {
            var o = {
                a: [
                    {
                        x: Number.NaN,
                        toJSON: function () {
                            return [42, { y: null }]
                        },
                    },
                ],
            }
            function replacer(key, value) {
                return key === 'y' ? o : value
            }
            assertThrowsAt(
                function () {
                    return src_1.default.stringify(o, replacer)
                },
                src_1.CircularReferenceError,
                '/a/0/1/y',
            )
        })
    })
    ;(0, node_test_1.describe)('delegates to native methods', function () {
        ;(0, node_test_1.it)('for JSON.parse', function () {
            strict_1.default.equal(src_1.default.parse, JSON.parse)
        })
        ;(0, node_test_1.it)('and passes all parameters to JSON.stringify', function () {
            var o = {
                x: 42,
                y: [0, 8, 15],
            }
            strict_1.default.equal(src_1.default.stringify(o, null, 4), JSON.stringify(o, null, 4))
        })
        ;(0, node_test_1.it)('when disabled', function () {
            strict_1.default.equal(src_1.default.enabled(false).parse, JSON.parse)
        })
        ;(0, node_test_1.it)('not when enabled', function () {
            strict_1.default.equal(src_1.default.enabled(), src_1.default)
        })
        ;(0, node_test_1.it)('when enabled and then disabled again', function () {
            // call 'enable' more than necessary to cover all code paths
            strict_1.default.equal(
                src_1.default.enabled(false).enabled().enabled(false).enabled(false).parse,
                JSON.parse,
            )
        })
    })
    ;(0, node_test_1.describe)('honors the "replacer" parameter', function () {
        ;(0, node_test_1.it)('and preserves its context correctly', function () {
            var o = [{ a: 42 }, { b: 42 }]
            var contexts = new Map()
            contexts.set('0', o)
            contexts.set('1', o)
            contexts.set('a', o[0])
            contexts.set('b', o[1])
            function replacer(key, value) {
                if (key !== '') {
                    strict_1.default.equal(this, contexts.get(String(key)))
                }
                return value
            }
            src_1.default.stringify(o, replacer)
        })
        ;(0, node_test_1.describe)('that is an array', function () {
            ;(0, node_test_1.it)('for valid input', function () {
                var replacer = ['c', 'd']
                var o = {
                    a: 0,
                    b: 1,
                    c: 13,
                    d: 42,
                }
                strict_1.default.equal(
                    src_1.default.stringify(o, replacer),
                    JSON.stringify(o, replacer),
                )
            })
            ;(0, node_test_1.it)('for nested valid input', function () {
                var replacer = ['a', 'b']
                strict_1.default.equal(
                    src_1.default.stringify(
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
        ;(0, node_test_1.describe)('that is a function', function () {
            ;(0, node_test_1.it)('for valid input', function () {
                function replacer(key, value) {
                    return key === '' || value > 5 ? value : undefined
                }
                var o = {
                    a: 0,
                    b: 1,
                    c: 13,
                    d: 42,
                }
                strict_1.default.equal(
                    src_1.default.stringify(o, replacer),
                    JSON.stringify(o, replacer),
                )
            })
            ;(0, node_test_1.it)('for validly replaced input', function () {
                function replacer(key, value) {
                    if (key === '') {
                        return value
                    } else {
                        return key === 'replaceMe' ? { y: 42 } : value
                    }
                }
                strict_1.default.equal(
                    src_1.default.stringify(
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
            ;(0, node_test_1.it)('for invalidly replaced input', function () {
                function replacer(key, value) {
                    if (key === '') {
                        return value
                    } else {
                        return key === 'replaceMe' ? { y: Number.NaN } : value
                    }
                }
                assertThrowsAt(
                    function () {
                        src_1.default.stringify(
                            {
                                a: 0,
                                b: 1,
                                c: 13,
                                replaceMe: undefined,
                            },
                            replacer,
                        )
                    },
                    src_1.InvalidValueError,
                    '/replaceMe/y',
                )
            })
        })
    })
    ;(0, node_test_1.describe)('works when both a replacer and toJSON() is used', function () {
        ;(0, node_test_1.it)('for a valid object', function () {
            var o = {
                a: 42,
                b: {
                    toJSON: function () {
                        return {
                            x: 'test',
                            y: [],
                            z: Number.NaN,
                        }
                    },
                },
                c: [0, 8, 15],
            }
            function replacer(key, value) {
                return key === 'z' ? undefined : value
            }
            strict_1.default.equal(
                src_1.default.stringify(o, replacer),
                JSON.stringify(o, replacer),
            )
        })
        ;(0, node_test_1.it)('for an object with circular references', function () {
            var x = { y: 'z' }
            var o = {
                a: 42,
                b: {
                    toJSON: function () {
                        return {
                            x: 'test',
                            y: [],
                            z: {
                                p: Number.NaN,
                                toJSON: function () {
                                    return [null, x]
                                },
                            },
                        }
                    },
                },
                c: [0, 8, 15],
                x: x,
            }
            function replacer(key, value) {
                return key === 'p' ? undefined : value
            }
            assertThrowsAt(
                function () {
                    return src_1.default.stringify(o, replacer)
                },
                src_1.CircularReferenceError,
                '/x',
            )
        })
        ;(0, node_test_1.it)('for an invalid object', function () {
            var o = {
                a: 42,
                b: {
                    toJSON: function () {
                        return {
                            x: 'test',
                            y: [],
                            z: {
                                p: Number.NaN,
                                toJSON: function () {
                                    return [null, /invalid/]
                                },
                            },
                        }
                    },
                },
                c: [0, 8, 15],
            }
            function replacer(key, value) {
                return key === 'p' ? undefined : value
            }
            assertThrowsAt(
                function () {
                    return src_1.default.stringify(o, replacer)
                },
                src_1.InvalidValueError,
                '/b/z/1',
            )
        })
    })
    ;(0, node_test_1.describe)('reports the correct path', function () {
        ;(0, node_test_1.it)('for the root value', function () {
            // eslint-disable-next-line unicorn/no-useless-undefined
            assertThrowsAt(
                function () {
                    return src_1.default.stringify(undefined)
                },
                src_1.InvalidValueError,
                '',
            )
        })
        ;(0, node_test_1.it)('for some nested value', function () {
            assertThrowsAt(
                function () {
                    src_1.default.stringify([
                        null,
                        42,
                        {
                            x: {
                                toJSON: function () {
                                    return [false, { y: undefined }]
                                },
                            },
                        },
                    ])
                },
                src_1.InvalidValueError,
                '/2/x/1/y',
            )
        })
    })
})
