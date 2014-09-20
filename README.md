[![Build Status](http://img.shields.io/travis/pigulla/json-strictify.svg?style=flat-square)](https://travis-ci.org/pigulla/json-strictify)
[![NPM version](http://img.shields.io/npm/v/json-strictify.svg?style=flat-square)](http://badge.fury.io/js/json-strictify)
[![Coverage Status](https://img.shields.io/coveralls/pigulla/json-strictify.svg?style=flat-square)](https://coveralls.io/r/pigulla/json-strictify)
[![Dependency Status](https://david-dm.org/pigulla/json-strictify.svg?style=flat-square)](https://david-dm.org/pigulla/json-strictify)
[![devDependency Status](https://david-dm.org/pigulla/json-strictify/dev-status.svg?style=flat-square)](https://david-dm.org/pigulla/json-strictify#info=devDependencies)

# json-strictify

Safely serialize a value to JSON without unintended loss of data or going into an infinite loop due to circular references.

#### Why

The native [`JSON.stringify`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify) function drops all values that are not supported by the [JSON specification](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf):

```js
JSON.stringify({ a: 42, b: undefined });
// returns '{"a":42}'

JSON.parse(JSON.stringify(NaN));
// returns 'null'

JSON.stringify([1, NaN, 3]);
// returns '[1,null,3]'
```

In many cases this is not the behaviour you want: relying on the serialization method to clean up your data is error prone and can lead to subtle bugs that are annoying to find. json-strictify helps you to easily avoid these issues with literally a single line of code.

Unlike [`json-stringify-safe`](https://www.npmjs.org/package/json-stringify-safe) it does not attempt to "fix" its input but always bails out when it encounters something that would prevent it from being serialized properly.

---

### Installation

Simply install via npm:
```
npm install json-strictify
```

### Usage

json-strictify exposes three methods: `stringify`, `parse` and `enable`, so it can be used as a drop-in replacement for the native JSON object:

```javascript
var JSON = require('json-strictify');

JSON.stringify(someObject);
```

The `parse` method is simply a reference to the native `JSON.parse` function.

---

### Examples

The `stringify` function throws an error if the input to be serialized contains invalid values:
```javascript
var JSONs = require('json-strictify');
JSONs.stringify({ x: 42, y: NaN });
// InvalidValueError: Invalid value at /y (non-finite number is not a valid JSON type)
```

Also, if the data you want to stringify contains circular references a `CircularReferenceError` is thrown:
```javascript
var data = [];
data.push(data);
JSONs.stringify(data);
// CircularReferenceError: Circular reference found at "/0"
```

The location of the value that caused the error is given as a [JSON Pointer](http://tools.ietf.org/html/rfc6901) reference.

---

### Disabling json-strictify

In production you may not want to have the additional overhead introduced by json-strictify. This can easily be avoided by calling the `enable` method:

```javascript
var JSON = require('json-strictify').enable(config.debug);
```

If called with a falsy parameter, `enable` will return the native JSON object so there will be no performance penalty whatsoever.
