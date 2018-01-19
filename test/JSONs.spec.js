'use strict';

/* eslint-disable no-empty-function */

const util = require('util');

const expect = require('chai').expect;

const InvalidValueError = require('../src/InvalidValueError');
const CircularReferenceError = require('../src/CircularReferenceError');

/**
 * @param {function()} fn
 * @param {function()} clazz
 * @param {string} reference
 */
function assertErrorAt(fn, clazz, reference) {
    let error;

    try {
        fn();
    } catch (e) {
        error = e;
    }

    expect(error);
    expect(error).to.be.an.instanceof(clazz);
    expect(error.path).to.deep.equal(reference);
}

describe('JSONs', function () {
    let JSONs;

    beforeEach(function () {
        const resolved = require.resolve('../src/JSONs');
        delete require.cache[resolved];
    });

    describe('in a non-production environment', function () {
        beforeEach(function () {
            process.env.NODE_ENV = 'development'; // eslint-disable-line no-process-env
            JSONs = require('../src/JSONs'); // eslint-disable-line global-require
        });

        describe('provides basic functionality', function () {
            it('accepts a valid object', function () {
                const o = {
                    foo: 'bar',
                    meaning: 42,
                    awesome: true,
                    stuff: [1, 2, 3]
                };

                expect(JSONs.stringify(o)).to.equal(JSON.stringify(o));
            });

            it('refuses invalid values', function () {
                expect(() => JSONs.stringify({ foo() {} })).to.throw(InvalidValueError);
                expect(() => JSONs.stringify([undefined])).to.throw(InvalidValueError);
                expect(() => JSONs.stringify(/regex/)).to.throw(InvalidValueError);
                expect(() => JSONs.stringify(new Error())).to.throw(InvalidValueError);
                expect(() => JSONs.stringify([0, NaN, 2])).to.throw(InvalidValueError);
                expect(() => JSONs.stringify([0, NaN, 2])).to.throw(InvalidValueError);
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

                expect(JSONs.stringify(o)).to.equal(JSON.stringify(o));
            });

            it('works with the prototype chain', function () {
                function A() {}
                A.prototype.a = 42;

                function B() {}
                util.inherits(B, A);
                B.prototype.b = 'foo';

                const b = new B();

                expect(JSONs.stringify(b)).to.equal(JSON.stringify(b));
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

                expect(JSONs.stringify(o)).to.equal(JSON.stringify(o));
            });
        });

        describe('detects circular references', function () {
            it('that is a self loop', function () {
                const o = { a: 42 };

                o.b = o;

                assertErrorAt(() => JSONs.stringify(o), CircularReferenceError, '/b');
            });

            it('that is transitive', function () {
                const o = { a: [{ b: {} }] };

                o.a[0].b.circular = o;

                assertErrorAt(() => JSONs.stringify(o), CircularReferenceError, '/a/0/b/circular');
            });

            it('that is none', function () {
                // This is the case that used to break json-stringify-safe, so we want to get it right.
                // See https://github.com/isaacs/json-stringify-safe/issues/9
                const p = {};
                const o = {
                    a: p,
                    b: p
                };

                expect(() => JSONs.stringify(o)).to.not.throw();
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

                assertErrorAt(() => JSONs.stringify(o, replacer), CircularReferenceError, '/a/0/1/y');
            });
        });

        describe('delegates to native methods', function () {
            it('for JSON.parse', function () {
                expect(JSONs.parse).to.equal(JSON.parse);
            });

            it('and passes all parameters to JSON.stringify', function () {
                const o = {
                    x: 42,
                    y: [0, 8, 15]
                };

                expect(JSONs.stringify(o, null, 4)).to.equal(JSON.stringify(o, 0, 4));
            });

            it('when disabled', function () {
                expect(JSONs.enabled(false).parse).to.equal(JSON.parse);
            });

            it('not when enabled', function () {
                expect(JSONs.enabled(true)).to.equal(JSONs);
            });

            it('when enabled and then disabled again', function () {
                // call 'enable' more than necessary to cover all code paths
                expect(JSONs
                    .enabled(false)
                    .enabled(true)
                    .enabled(false)
                    .enabled(false).parse).to.equal(JSON.parse);
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

                    expect(JSONs.stringify(o, replacer)).to.equal(JSON.stringify(o, replacer));
                });

                it('for nested valid input', function () {
                    const replacer = ['a', 'b'];

                    expect(function () {
                        JSONs.stringify({
                            a: 0,
                            b: {
                                a: 1,
                                invalid: NaN
                            },
                            invalid: undefined
                        }, replacer);
                    }).not.to.throw();
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

                    expect(JSONs.stringify(o, replacer)).to.equal(JSON.stringify(o, replacer));
                });

                it('for validly replaced input', function () {
                    function replacer(key, value) {
                        if (key === '') {
                            return value;
                        } else {
                            return key === 'replaceMe' ? { y: 42 } : value;
                        }
                    }

                    expect(function () {
                        JSONs.stringify({
                            a: 0,
                            b: 1,
                            c: 13,
                            replaceMe: undefined
                        }, replacer);
                    }).to.not.throw();
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
                    }, InvalidValueError, '/replaceMe/y');
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

                expect(JSONs.stringify(o, replacer)).to.equal(JSON.stringify(o, replacer));
            });

            it('for an object with circular references', function () {
                const x = { y: 'z' };
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
                                        return [null, x];
                                    }
                                }
                            };
                        }
                    },
                    c: [0, 8, 15],
                    x
                };

                function replacer(key, value) {
                    return key === 'p' ? undefined : value;
                }

                assertErrorAt(() => JSONs.stringify(o, replacer), CircularReferenceError, '/x');
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

                assertErrorAt(() => JSONs.stringify(o, replacer), InvalidValueError, '/b/z/1');
            });
        });

        describe('reports the correct path', function () {
            it('for the root value', function () {
                assertErrorAt(() => JSONs.stringify(undefined), InvalidValueError, '');
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
                }, InvalidValueError, '/2/x/1/y');
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
                        expect(error).to.be.null;
                        expect(result).to.equal(JSONs.stringify(o));
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

                    expect(JSONs.stringify(o, replacer)).to.equal(JSON.stringify(o, replacer));

                    JSONs.stringifyAsync(o, replacer, function (error, result) {
                        expect(error).to.be.null;
                        expect(result).to.equal(JSONs.stringify(o, replacer));
                        done();
                    });
                });

                it('with InvalidValueError', function (done) {
                    JSONs.stringifyAsync([function () {}], function (error, result) {
                        expect(error).to.be.an.instanceof(InvalidValueError);
                        expect(error.path).to.equal('/0');
                        expect(arguments).to.have.a.lengthOf(1);
                        done();
                    });
                });

                it('with CircularReferenceError', function (done) {
                    const o = [1];

                    o.push(o);

                    JSONs.stringifyAsync(o, function (error, result) {
                        expect(error).to.be.an.instanceof(CircularReferenceError);
                        expect(error.path).to.equal('/1');
                        expect(arguments).to.have.a.lengthOf(1);
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
                        expect(error).to.be.null;
                        expect(result).to.deep.equal(JSON.parse(data));
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
                        expect(error).to.be.null;
                        expect(result).to.deep.equal(JSON.parse(data, reviver));
                        done();
                    });
                });

                it('with error', function (done) {
                    JSONs.parseAsync('foo', function (error, result) {
                        expect(error).to.be.an.instanceof(SyntaxError);
                        expect(arguments).to.have.a.lengthOf(1);
                        done();
                    });
                });
            });
        });
    });

    describe('in a production environment', function () {
        beforeEach(function () {
            process.env.NODE_ENV = 'production'; // eslint-disable-line no-process-env
            JSONs = require('../src/JSONs'); // eslint-disable-line global-require
        });

        it('uses native implementation by default', function () {
            expect(JSONs.parse).to.equal(JSON.parse);
            expect(JSONs.stringify).to.equal(JSON.stringify);
        });

        it('can still be enabled', function () {
            expect(JSONs.enabled(true).parse).to.equal(JSON.parse);
        });
    });
});
