'use strict';

/* eslint-disable no-return-assign */

const util = require('util');

const rewire = require('rewire');
const noop = require('lodash.noop');
const expect = require('chai').expect;

const InvalidValueError = require('../dist/InvalidValueError').default;
const CircularReferenceError = require('../dist/CircularReferenceError').default;

/**
 * @param {function()} fn
 * @param {function()} clazz
 * @param {string} reference
 */
function assert_error_at (fn, clazz, reference) {
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
    let module;
    let JSONs;
    let revert;

    // Generic setup for rewire
    beforeEach(function () {
        revert = noop;
    });
    afterEach(function () {
        revert();
    });

    describe('in a non-production environment', function () {
        beforeEach(function () {
            process.env.NODE_ENV = 'development';
            module = rewire('../dist/JSONs');
            JSONs = module.default;
        });

        it('throws an InvalidValueError for unexpected types', function () {
            const impl = module.__get__('JSONstrictify');
            const originalFn = impl.prototype.check_common_types;
            revert = () => impl.prototype.check_common_types = originalFn;

            // Any "non-object" primitive type will now cause an InvalidValueError
            impl.prototype.check_common_types = noop;

            const o = {
                x: undefined
            };

            assert_error_at(() => JSONs.stringify(o), InvalidValueError, '/x');
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
                expect(() => JSONs.stringify({foo () {}})).to.throw(InvalidValueError);
                expect(() => JSONs.stringify([undefined])).to.throw(InvalidValueError);
                expect(() => JSONs.stringify(/regex/)).to.throw(InvalidValueError);
                expect(() => JSONs.stringify(new Error())).to.throw(InvalidValueError);
                expect(() => JSONs.stringify([0, NaN, 2])).to.throw(InvalidValueError);
                expect(() => JSONs.stringify(BigInt(1))).to.throw(InvalidValueError);
                expect(() => JSONs.stringify(Symbol('test'))).to.throw(InvalidValueError);
            });

            it('honors "toJSON" methods', function () {
                const o = {
                    x: 42,
                    y: {
                        toJSON () {
                            return [0, 8, 15];
                        }
                    }
                };

                expect(JSONs.stringify(o)).to.equal(JSON.stringify(o));
            });

            it('works with the prototype chain', function () {
                function A () {}
                A.prototype.a = 42;

                function B () {}
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
                const o = {a: 42};

                o.b = o;

                assert_error_at(() => JSONs.stringify(o), CircularReferenceError, '/b');
            });

            it('that is transitive', function () {
                const o = {a: [{b: {}}]};

                o.a[0].b.circular = o;

                assert_error_at(() => JSONs.stringify(o), CircularReferenceError, '/a/0/b/circular');
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
                            toJSON () {
                                return [
                                    42,
                                    {y: null}
                                ];
                            }
                        }
                    ]
                };

                function replacer (key, value) {
                    return key === 'y' ? o : value;
                }

                assert_error_at(() => JSONs.stringify(o, replacer), CircularReferenceError, '/a/0/1/y');
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
                expect(JSONs.enabled()).to.equal(JSONs);
            });

            it('when enabled and then disabled again', function () {
                // call 'enable' more than necessary to cover all code paths
                expect(JSONs
                    .enabled(false)
                    .enabled()
                    .enabled(false)
                    .enabled(false).parse).to.equal(JSON.parse);
            });
        });

        describe('honors the "replacer" parameter', function () {
            it('and preserves its context correctly', function () {
                const o = [{a: 42}, {b: 42}];
                const contexts = new Map();
                contexts.set('0', o);
                contexts.set('1', o);
                contexts.set('a', o[0]);
                contexts.set('b', o[1]);

                function replacer (key, value) {
                    if (key !== '') {
                        expect(this).to.equal(contexts.get(String(key)));
                    }

                    return value;
                }

                JSONs.stringify(o, replacer);
            });

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
                    }).to.not.throw();
                });
            });

            describe('that is a function', function () {
                it('for valid input', function () {
                    function replacer (key, value) {
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
                    function replacer (key, value) {
                        if (key === '') {
                            return value;
                        } else {
                            return key === 'replaceMe' ? {y: 42} : value;
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
                    function replacer (key, value) {
                        if (key === '') {
                            return value;
                        } else {
                            return key === 'replaceMe' ? {y: NaN} : value;
                        }
                    }

                    assert_error_at(function () {
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
                        toJSON () {
                            return {
                                x: 'test',
                                y: [],
                                z: NaN
                            };
                        }
                    },
                    c: [0, 8, 15]
                };

                function replacer (key, value) {
                    return key === 'z' ? undefined : value;
                }

                expect(JSONs.stringify(o, replacer)).to.equal(JSON.stringify(o, replacer));
            });

            it('for an object with circular references', function () {
                const x = {y: 'z'};
                const o = {
                    a: 42,
                    b: {
                        toJSON () {
                            return {
                                x: 'test',
                                y: [],
                                z: {
                                    p: NaN,
                                    toJSON () {
                                        return [null, x];
                                    }
                                }
                            };
                        }
                    },
                    c: [0, 8, 15],
                    x
                };

                function replacer (key, value) {
                    return key === 'p' ? undefined : value;
                }

                assert_error_at(() => JSONs.stringify(o, replacer), CircularReferenceError, '/x');
            });

            it('for an invalid object', function () {
                const o = {
                    a: 42,
                    b: {
                        toJSON () {
                            return {
                                x: 'test',
                                y: [],
                                z: {
                                    p: NaN,
                                    toJSON () {
                                        return [null, /invalid/];
                                    }
                                }
                            };
                        }
                    },
                    c: [0, 8, 15]
                };

                function replacer (key, value) {
                    return key === 'p' ? undefined : value;
                }

                assert_error_at(() => JSONs.stringify(o, replacer), InvalidValueError, '/b/z/1');
            });
        });

        describe('reports the correct path', function () {
            it('for the root value', function () {
                assert_error_at(() => JSONs.stringify(undefined), InvalidValueError, '');
            });

            it('for some nested value', function () {
                assert_error_at(function () {
                    JSONs.stringify([
                        null,
                        42,
                        {
                            x: {
                                toJSON () {
                                    return [false, {y: undefined}];
                                }
                            }
                        }
                    ]);
                }, InvalidValueError, '/2/x/1/y');
            });
        });
    });

    describe('in a production environment', function () {
        let original_node_env;

        beforeEach(function () {
            original_node_env = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';
            module = rewire('../dist/JSONs');
            JSONs = module.default;
        });

        afterEach(function () {
            process.env.NODE_ENV = original_node_env;
        });

        it('uses native implementation by default', function () {
            expect(JSONs.parse).to.equal(JSON.parse);
            expect(JSONs.stringify).to.equal(JSON.stringify);
        });

        it('can still be enabled', function () {
            expect(JSONs.enabled().stringify).to.not.equal(JSON.stringify);
            expect(JSONs.enabled().parse).to.equal(JSON.parse);
        });
    });
});
