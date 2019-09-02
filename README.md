[![npm version](http://img.shields.io/npm/v/json-strictify.svg)](http://badge.fury.io/js/json-strictify)
![Typescript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-blue.svg)
[![Build Status](http://img.shields.io/travis/pigulla/json-strictify.svg)](https://travis-ci.org/pigulla/json-strictify)
[![Coverage Status](https://img.shields.io/coveralls/pigulla/json-strictify.svg)](https://coveralls.io/r/pigulla/json-strictify)
[![Greenkeeper badge](https://badges.greenkeeper.io/pigulla/json-strictify.svg)](https://greenkeeper.io/)
[![Dependency Status](https://david-dm.org/pigulla/json-strictify.svg)](https://david-dm.org/pigulla/json-strictify)
[![Known Vulnerabilities](https://snyk.io/test/github/pigulla/json-strictify/badge.svg)](https://snyk.io/test/github/pigulla/json-strictify)
![node](https://img.shields.io/node/v/json-strictify.svg)
[![License](https://img.shields.io/npm/l/json-strictify.svg)](https://github.com/pigulla/json-strictify/blob/master/LICENSE)

# json-strictify

Safely serialize a value to JSON without unintended loss of data or going into an infinite loop due to circular references.

#### Why

The native [`JSON.stringify`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify) function drops or silently modifies all values that are not supported by the [JSON specification](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf):

```js
JSON.stringify({ a: 42, b: undefined });
// returns '{"a":42}'

JSON.parse(JSON.stringify(NaN));
// returns null

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

```typescript
import JSON from 'json-strictify';

JSON.stringify(someObject);
```

The `parse` method is simply a reference to the native `JSON.parse` function.

---

### Examples

The `stringify` function throws an error if the input to be serialized contains invalid values:
```typescript
import JSONs from 'json-strictify';

JSONs.stringify({ x: 42, y: NaN });
// InvalidValueError: Invalid value at /y (NaN is not JSON-serializable)
```

Also, if the data you want to stringify contains circular references a `CircularReferenceError` is thrown:
```typescript
const data = [];
data.push(data);
JSONs.stringify(data);
// CircularReferenceError: Circular reference found at "/0"
```

The location of the value that caused the error is given as a [JSON Pointer](http://tools.ietf.org/html/rfc6901) reference.

---

### ESLint integration

If you want to ensure that all serialization is done through json-strictify you can disable the global `JSON` variable like so:
```json
"globals": {
    "JSON": "off"
}
```
See the ESLint documentation on [configuring globals](https://eslint.org/docs/user-guide/configuring#specifying-globals) for details.

---

### Disabling json-strictify

In production you may not want to have the additional overhead introduced by json-strictify. This can easily be avoided by calling the `enabled` method:

```typescript
import JSONs from 'json-strictify';
const JSON = JSONs.enabled(config.debug);

// or for older versions of Javascript:
const JSON = require('json-strictify').enabled(config.debug);
```

If called with a falsy parameter, `enabled` will return an object that delegates directly to the native JSON object so there will be no performance penalty whatsoever.

**Note:** json-strictify is disabled by default if `NODE_ENV` is set to `production` (you may still enable it manually, of course).  
