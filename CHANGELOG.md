## 6.3.0 (2019-11-12)

 - move tests to TypeScript as well
 - fix included TypeScript definitions broken in previous version

## 6.2.0 (2019-11-10) - *deprecated*

 - InvalidValueError and CircularReferenceError now both extend JsonStrictifyError
 - TypeScript definitions for custom errors are now exported

## 6.1.0 (2019-11-09)

 - update dependencies
 - update code style
 - add Node.js 13 to build targets

## 6.0.0 (2019-08-09)

 - move to TypeScript
 - remove the *Async-methods

## 5.1.0 (2019-07-17)

 - the replacer function now correctly preservers its context
 - update dependencies to resolve potential security issues

## 5.0.5 (2019-07-10)

 - add support for BigInts and Symbols in error reporting
 - tests require Node.js 10.4 or higher to run

## 5.0.4 (2019-07-08)

 - use rewire to test an edge case (instead of ignoring it)
 
## 5.0.3 (2019-04-19)

 - update dependencies to fix known security vulnerabilities
 
## 5.0.2 (2019-04-08)

 - update dependencies
 - replace Istanbul with nyc
 
## 5.0.1 (2019-02-19)

 - update dependencies
 
## 5.0.0 (2019-01-23)

 - use JavaScript Standard Style (mostly)
 - remove nsp and use 'npm audit' instead
 - require Node.js >= 10

## 4.0.0 (2018-01-19)

 - disable by default if NODE_ENV is "production"

## 3.0.0 (2017-11-14)

 - drop support for Node.js version 5 and below
 - move from 'referee' to 'chai'
 - remove dependency 'fkt'

## 2.0.3 (2017-06-28)
 
 - update dependencies

## 2.0.2 (2016-10-28)

 - update dependencies

## 2.0.1 (2016-10-05)
 
 - update dependencies
 - use more efficient ES6 data structure

## 2.0.0 (2016-08-29)

 - remove Gulp
 - use external ESLint config
 - update dependencies
 - requires Node.js version 4 or higher 

## 1.0.0 (2016-06-20)

 - add Node.js 6 to build targets
 - slightly rephrase error messages
 - update dependencies

## 0.3.8 (2016-04-06)

 - maintenance release (update dependencies)

## 0.3.7 (2015-11-27)

 - move from JSHint/JSCS to ESLint

## 0.3.6 (2015-11-13)

 - maintenance release (update dependencies and fix typo)
 - fix test coverage report

## 0.3.5 (2015-11-04)

 - maintenance release (update dependencies)

## 0.3.4 (2015-09-27)

 - maintenance release (update dependencies)

## 0.3.3 (2015-02-13)

 - maintenance release (update dependencies)

## 0.3.2 (2015-01-24)

 - maintenance release (update dependencies)

## 0.3.1 (2014-11-28)

 - maintenance release (update dependencies)

## 0.3.0 (2014-10-14)

 - Breaking Change: `enable` is now called `enabled`
 - added `parseAsync` and `stringifyAsync`

## 0.2.1 (2014-10-10)

 - maintenance release

## 0.2.0 (2014-09-19)
 - added circular reference detection
 - added support for JSON.stringify's `replacer` parameter
 - added support for `toJSON` methods
 - improved error messages

## 0.1.0 (2014-09-18)

- initial release
