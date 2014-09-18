var util = require('util');

var buster = require('buster');

var JSONs = require('../src/JSONs');

var assert = buster.referee.assert,
    refute = buster.referee.refute;

describe('JSONs', function () {
    describe('basic functionality', function () {
        it('accepts a valid object', function () {
            var o = { foo: 'bar', meaning: 42, awesome: true, stuff: [1, 2, 3] };

            assert.equals(JSONs.stringify(o), JSON.stringify(o));
        });

        it('refuses invalid values', function () {
            assert.exception(function () {
                JSONs.stringify({ foo: function () {} });
            }, 'InvalidValueError');
            assert.exception(function () {
                JSONs.stringify([undefined]);
            }, 'InvalidValueError');
            assert.exception(function () {
                JSONs.stringify(/regex/);
            }, 'InvalidValueError');
            assert.exception(function () {
                JSONs.stringify(new Error());
            }, 'InvalidValueError');
            assert.exception(function () {
                JSONs.stringify([0, NaN, 2]);
            }, 'InvalidValueError');
        });

        it('honors "toJSON" methods', function () {
            var o = {
                x: 42,
                y: {
                    toJSON: function () {
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

            var b = new B();

            assert.same(JSONs.stringify(b), JSON.stringify(b));
        });

        it('ignores non-enumerable properties', function () {
            var o = {
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

    describe('delegates to native methods', function () {
        it('for JSON.parse', function () {
            assert.same(JSONs.parse, JSON.parse);
        });

        it('and passes all parameters to JSON.stringify', function () {
            var o = {
                x: 42,
                y: [0, 8, 15]
            };

            assert.same(JSONs.stringify(o, null, 4), JSON.stringify(o, 0, 4));
        });

        it('when disabled', function () {
            assert.same(JSONs.enable(false), JSON);
        });
    });

    describe('honors the "replacer" parameter', function () {
        describe('that is an array', function () {
            it('for valid input', function () {
                var replacer = ['c', 'd'],
                    o = {
                        a: 0,
                        b: 1,
                        c: 13,
                        d: 42
                    };

                assert.same(JSONs.stringify(o, replacer), JSON.stringify(o, replacer));
            });

            it('for nested valid input', function () {
                var replacer = ['a', 'b'];

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

                var o = {
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

                var error;

                try {
                    JSONs.stringify({
                        a: 0,
                        b: 1,
                        c: 13,
                        replaceMe: undefined
                    }, replacer);
                } catch (e) {
                    error = e;
                }

                assert(error);
                assert.same(error.name, 'InvalidValueError');
                assert.same(error.path, '/replaceMe/y');
            });
        });
    });

    describe('works when both "replacer" and "toJSON" is used', function () {
        it('for a valid object', function () {
            var o = {
                a: 42,
                b: {
                    toJSON: function () {
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
            var error,
                o = {
                    a: 42,
                    b: {
                        toJSON: function () {
                            return {
                                x: 'test',
                                y: [],
                                z: {
                                    p: NaN,
                                    toJSON: function () {
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

            try {
                JSONs.stringify(o, replacer);
            } catch (e) {
                error = e;
            }

            assert(error);
            assert.same(error.name, 'InvalidValueError');
            assert.same(error.path, '/b/z/1');
        });
    });

    describe('reports the correct path', function () {
        it('for the root value', function () {
            var error;

            try {
                JSONs.stringify(undefined);
            } catch (e) {
                error = e;
            }

            assert(error);
            assert.same(error.name, 'InvalidValueError');
            assert.same(error.path, '');
        });

        it('for some nested value', function () {
            var error;
            
            try {
                JSONs.stringify([null, 42, {
                    x: {
                        toJSON: function () {
                            return [false, { y: undefined }];
                        }
                    }
                }]);
            } catch (e) {
                error = e;
            }

            assert(error);
            assert.same(error.name, 'InvalidValueError');
            assert.same(error.path, '/2/x/1/y');
        });
    });
});
