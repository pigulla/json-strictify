'use strict';

/* eslint-disable no-empty-function */

const util = require('util');

const referee = require('referee');

const JSONs = require('../src/JSONs');

const assert = referee.assert;
const refute = referee.refute;

/**
 * @param {function()} fn
 * @param {string} name
 * @param {string} reference
 */
function assertErrorAt(fn, name, reference) {
    let error;

    try {
        fn();
    } catch (e) {
        error = e;
    }

    assert(error);
    assert.same(error.name, name);
    assert.same(error.path, reference);
}

describe('JSONs', function () {
    describe('basic functionality', function () {
        it('accepts a valid object', function () {
            const o = {
                foo: 'bar',
                meaning: 42,
                awesome: true,
                stuff: [1, 2, 3]
            };

            assert.equals(JSONs.stringify(o), JSON.stringify(o));
        });

        it('refuses invalid values', function () {
            assert.exception(() => JSONs.stringify({ foo() {} }), 'InvalidValueError');
            assert.exception(() => JSONs.stringify([undefined]), 'InvalidValueError');
            assert.exception(() => JSONs.stringify(/regex/), 'InvalidValueError');
            assert.exception(() => JSONs.stringify(new Error()), 'InvalidValueError');
            assert.exception(() => JSONs.stringify([0, NaN, 2]), 'InvalidValueError');
            assert.exception(() => JSONs.stringify([0, NaN, 2]), 'InvalidValueError');
        });

        it('honors "toJSON" methods', function () {
            const o = {
                x: 42,
                y: {
                    toJSON() {
                        return [0, 8, 15];
                    }
                }
            };

            assert.same(JSONs.stringify(o), JSON.stringify(o));
        });

        it('works with the prototype chain', function () {
            function A() {}
            A.prototype.a = 42;

            function B() {}
            util.inherits(B, A);
            B.prototype.b = 'foo';

            const b = new B();

            assert.same(JSONs.stringify(b), JSON.stringify(b));
        });

        it('ignores non-enumerable properties', function () {
            const o = {
                a: 42,
                b: false
            };

            Object.defineProperty(o, 'c', {
                enumerable: false,
                value: 'hello'
            });

            assert.same(JSONs.stringify(o), JSON.stringify(o));
        });
    });

    describe('detects circular references', function () {
        it('that is a self loop', function () {
            const o = { a: 42 };

            o.b = o;

            assertErrorAt(() => JSONs.stringify(o), 'CircularReferenceError', '/b');
        });

        it('that is transitive', function () {
            const o = { a: [{ b: {} }] };

            o.a[0].b.circular = o;

            assertErrorAt(() => JSONs.stringify(o), 'CircularReferenceError', '/a/0/b/circular');
        });

        it('that is none', function () {
            // This is the case that breaks json-stringify-safe, so we want to get it right.
            // See https://github.com/isaacs/json-stringify-safe/issues/9
            const p = {};
            const o = {
                a: p,
                b: p
            };

            refute.exception(() => JSONs.stringify(o));
        });

        it('introduced by toJSON and a replacer', function () {
            const o = {
                a: [
                    {
                        x: NaN,
                        toJSON() {
                            return [
                                42,
                                { y: null }
                            ];
                        }
                    }
                ]
            };

            function replacer(key, value) {
                return key === 'y' ? o : value;
            }

            assertErrorAt(() => JSONs.stringify(o, replacer), 'CircularReferenceError', '/a/0/1/y');
        });
    });

    describe('delegates to native methods', function () {
        it('for JSON.parse', function () {
            assert.same(JSONs.parse, JSON.parse);
        });

        it('and passes all parameters to JSON.stringify', function () {
            const o = {
                x: 42,
                y: [0, 8, 15]
            };

            assert.same(JSONs.stringify(o, null, 4), JSON.stringify(o, 0, 4));
        });

        it('when disabled', function () {
            assert.same(JSONs.enabled(false).parse, JSON.parse);
        });

        it('not when enabled', function () {
            assert.same(JSONs.enabled(true), JSONs);
        });

        it('when enabled and then disabled again', function () {
            // call 'enable' more than necessary to cover all code paths
            assert.same(JSONs
                .enabled(false)
                .enabled(true)
                .enabled(false)
                .enabled(false).parse, JSON.parse);
        });
    });

    describe('honors the "replacer" parameter', function () {
        describe('that is an array', function () {
            it('for valid input', function () {
                const replacer = ['c', 'd'];
                const o = {
                    a: 0,
                    b: 1,
                    c: 13,
                    d: 42
                };

                assert.same(JSONs.stringify(o, replacer), JSON.stringify(o, replacer));
            });

            it('for nested valid input', function () {
                const replacer = ['a', 'b'];

                refute.exception(function () {
                    JSONs.stringify({
                        a: 0,
                        b: {
                            a: 1,
                            invalid: NaN
                        },
                        invalid: undefined
                    }, replacer);
                });
            });
        });

        describe('that is a function', function () {
            it('for valid input', function () {
                function replacer(key, value) {
                    return (key === '' || value > 5) ? value : undefined;
                }

                const o = {
                    a: 0,
                    b: 1,
                    c: 13,
                    d: 42
                };

                assert.same(JSONs.stringify(o, replacer), JSON.stringify(o, replacer));
            });

            it('for validly replaced input', function () {
                function replacer(key, value) {
                    if (key === '') {
                        return value;
                    } else {
                        return key === 'replaceMe' ? { y: 42 } : value;
                    }
                }

                refute.exception(function () {
                    JSONs.stringify({
                        a: 0,
                        b: 1,
                        c: 13,
                        replaceMe: undefined
                    }, replacer);
                });
            });

            it('for invalidly replaced input', function () {
                function replacer(key, value) {
                    if (key === '') {
                        return value;
                    } else {
                        return key === 'replaceMe' ? { y: NaN } : value;
                    }
                }

                assertErrorAt(function () {
                    JSONs.stringify({
                        a: 0,
                        b: 1,
                        c: 13,
                        replaceMe: undefined
                    }, replacer);
                }, 'InvalidValueError', '/replaceMe/y');
            });
        });
    });

    describe('works when both a replacer and toJSON() is used', function () {
        it('for a valid object', function () {
            const o = {
                a: 42,
                b: {
                    toJSON() {
                        return {
                            x: 'test',
                            y: [],
                            z: NaN
                        };
                    }
                },
                c: [0, 8, 15]
            };

            function replacer(key, value) {
                return key === 'z' ? undefined : value;
            }

            assert.same(JSONs.stringify(o, replacer), JSON.stringify(o, replacer));
        });

        it('for an invalid object', function () {
            const o = {
                a: 42,
                b: {
                    toJSON() {
                        return {
                            x: 'test',
                            y: [],
                            z: {
                                p: NaN,
                                toJSON() {
                                    return [null, /invalid/];
                                }
                            }
                        };
                    }
                },
                c: [0, 8, 15]
            };

            function replacer(key, value) {
                return key === 'p' ? undefined : value;
            }

            assertErrorAt(() => JSONs.stringify(o, replacer), 'InvalidValueError', '/b/z/1');
        });
    });

    describe('reports the correct path', function () {
        it('for the root value', function () {
            assertErrorAt(() => JSONs.stringify(undefined), 'InvalidValueError', '');
        });

        it('for some nested value', function () {
            assertErrorAt(function () {
                JSONs.stringify([
                    null,
                    42,
                    {
                        x: {
                            toJSON() {
                                return [false, { y: undefined }];
                            }
                        }
                    }
                ]);
            }, 'InvalidValueError', '/2/x/1/y');
        });
    });

    describe('works as callbacks', function () {
        describe('via stringifyAsync', function () {
            it('without arguments', function (done) {
                const o = {
                    foo: 'bar',
                    meaning: 42,
                    awesome: true,
                    stuff: [1, 2, 3]
                };

                JSONs.stringifyAsync(o, function (error, result) {
                    assert.isNull(error);
                    assert.equals(result, JSONs.stringify(o));
                    done();
                });
            });

            it('with arguments', function (done) {
                const replacer = ['c', 'd'];
                const o = {
                    a: 0,
                    b: 1,
                    c: 13,
                    d: 42
                };

                assert.same(JSONs.stringify(o, replacer), JSON.stringify(o, replacer));

                JSONs.stringifyAsync(o, replacer, function (error, result) {
                    assert.isNull(error);
                    assert.equals(result, JSONs.stringify(o, replacer));
                    done();
                });
            });

            it('with InvalidValueError', function (done) {
                JSONs.stringifyAsync([function () {}], function (error, result) {
                    assert.equals(error.name, 'InvalidValueError');
                    assert.equals(error.path, '/0');
                    refute.defined(result);
                    done();
                });
            });

            it('with CircularReferenceError', function (done) {
                const o = [1];

                o.push(o);

                JSONs.stringifyAsync(o, function (error, result) {
                    assert.equals(error.name, 'CircularReferenceError');
                    assert.equals(error.path, '/1');
                    refute.defined(result);
                    done();
                });
            });
        });

        describe('via parseAsync', function () {
            it('without arguments', function (done) {
                const data = JSON.stringify({
                    foo: 'bar',
                    meaning: 42,
                    awesome: true,
                    stuff: [1, 2, 3]
                });

                JSONs.parseAsync(data, function (error, result) {
                    assert.isNull(error);
                    assert.equals(result, JSON.parse(data));
                    done();
                });
            });

            it('with arguments', function (done) {
                const data = JSON.stringify({
                    foo: 'bar',
                    meaning: 42,
                    awesome: true,
                    stuff: [1, 2, 3]
                });

                function reviver(k, v) {
                    return k === 'meaning' ? 'none' : v;
                }

                JSONs.parseAsync(data, reviver, function (error, result) {
                    assert.isNull(error);
                    assert.equals(result, JSON.parse(data, reviver));
                    done();
                });
            });

            it('with error', function (done) {
                JSONs.parseAsync('foo', function (error, result) {
                    assert.equals(error.name, 'SyntaxError');
                    refute.defined(result);
                    done();
                });
            });
        });
    });
});
