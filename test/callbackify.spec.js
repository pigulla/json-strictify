'use strict';

const expect = require('chai').expect;

const callbackify = require('../src/callbackify');

describe('callbackify', function () {
    it('returns the result on sucess', function (done) {
        callbackify(JSON.parse)('{"a":42}', function (error, result) {
            expect(error).to.be.null;
            expect(result).to.deep.equal({ a: 42 });
            done();
        });
    });

    it('returns an error on failure', function (done) {
        callbackify(JSON.parse)('blub', function (error, result) {
            expect(error).to.be.an.instanceof(SyntaxError);
            expect(arguments).to.have.lengthOf(1);
            done();
        });
    });
});
