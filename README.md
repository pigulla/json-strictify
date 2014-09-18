[![Build Status](http://img.shields.io/travis/pigulla/json-strictify.svg?style=flat-square)](https://travis-ci.org/pigulla/json-strictify)
[![NPM version](http://img.shields.io/npm/v/json-strictify.svg?style=flat-square)](http://badge.fury.io/js/json-strictify)
[![Coverage Status](https://img.shields.io/coveralls/pigulla/json-strictify.svg?style=flat-square)](https://coveralls.io/r/pigulla/json-strictify)
[![Dependency Status](https://david-dm.org/pigulla/json-strictify.svg?style=flat-square)](https://david-dm.org/pigulla/json-strictify)
[![devDependency Status](https://david-dm.org/pigulla/json-strictify/dev-status.svg?style=flat-square)](https://david-dm.org/pigulla/json-strictify#info=devDependencies)

# json-strictify

Assert that a value can safely be serialized to JSON, i.e. that it doesn't contain values that would be dropped (such as functions, `undefined` or `NaN`).

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

### Examples

The `stringify` function throws an error if the input to be serialized contains invalid values:
```javascript
var JSONs = require('json-strictify');
var serialized = JSONs.stringify({ x: 42, y: NaN });
// "InvalidValueError: Invalid value at /y (non-finite number is not a valid JSON type)"
```

The location of the value that caused the error is a [JSON Pointer](http://tools.ietf.org/html/rfc6901) reference.

### Disabling json-strictify

In production you may not want to have the additional overhead introduced by json-strictify. This can easily be avoided by calling the `enable` method:

```javascript
var JSON = require('json-strictify').enable(config.debug);
```

If called with a falsy parameter, `enable` will return the native JSON object so there will be no performance penalty whatsoever.
