'use strict'
var __extends =
    (this && this.__extends) ||
    (function () {
        var extendStatics = function (d, b) {
            extendStatics =
                Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array &&
                    function (d, b) {
                        d.__proto__ = b
                    }) ||
                function (d, b) {
                    for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]
                }
            return extendStatics(d, b)
        }
        return function (d, b) {
            if (typeof b !== 'function' && b !== null)
                throw new TypeError(
                    'Class extends value ' + String(b) + ' is not a constructor or null',
                )
            extendStatics(d, b)
            function __() {
                this.constructor = d
            }
            d.prototype = b === null ? Object.create(b) : ((__.prototype = b.prototype), new __())
        }
    })()
Object.defineProperty(exports, '__esModule', { value: true })
var pointer = require('json-pointer')
var json_strictify_error_1 = require('./json-strictify-error')
var CircularReferenceError = /** @class */ (function (_super) {
    __extends(CircularReferenceError, _super)
    function CircularReferenceError(references) {
        return (
            _super.call(
                this,
                'Circular reference found at "'.concat(pointer.compile(references), '"\''),
                references,
            ) || this
        )
    }
    return CircularReferenceError
})(json_strictify_error_1.default)
exports.default = CircularReferenceError
