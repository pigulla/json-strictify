'use strict';

module.exports = function callbackify(fn, scope) {
    return function () {
        const cb = arguments[arguments.length - 1];
        const args = Array.prototype.slice.call(arguments, 0, arguments.length - 1);

        try {
            const result = fn.apply(scope, args);
            return cb(null, result);
        } catch (error) {
            return cb(error);
        }
    };
};
