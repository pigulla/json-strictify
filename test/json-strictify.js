var util = require('util');

var buster = require('buster');

var JSONs = require('../src/index');

var assert = buster.referee.assert,
    refute = buster.referee.refute;

describe('JSONs', function () {
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
    
    it('uses native JSON.parse', function () {
        assert.same(JSONs.parse, JSON.parse);
    });
    
    it('uses native JSON when disabled', function () {
        assert.same(JSONs.enable(false), JSON);
    });
    
    it('honors toJSON methods', function () {
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
                            return [{
                                y: undefined
                            }];
                        }
                    }
                }]);
            } catch (e) {
                error = e;
            }

            assert(error);
            assert.same(error.name, 'InvalidValueError');
            assert.same(error.path, '/2/x/0/y');
        });
    });
});
