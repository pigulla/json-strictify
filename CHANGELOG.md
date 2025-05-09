## 8.0.5 (2025-01-07)

- update dependencies to resolve a potential security issue
- replace ESLint and Prettier with Biome

## 8.0.4 (2025-01-07)

- update dependencies to resolve a potential security issue

## 8.0.3 (2024-09-15)

- update dependencies to resolve a potential security issue

## 8.0.2 (2024-02-18)

- pipelines now run with Node.js v20 and npm@10
- no longer fail the build if the upload to Codecov failed
- dependencies are now pinned
- replace `tsx` with `ts-node`
- use built-in Node.js test runner instead of Jest and Chai
- add signature validation to audit check
- add linting for `package.json`

## 8.0.1 (2023-08-17)

- update dependencies to resolve a potential security issue

## 8.0.0 (2022-04-12)

- filenames are now kebab-cased instead of CamelCased (does not affect exports from the barrel file)
- require Node.js >= 14 (as Node.js 12 it will reach end-of-life on April 30th)
- migrate from Travis CI to GitHub Actions
- add Prettier for more "standard-compliant" formatting
- update dependencies to resolve potential security issues

## 7.0.1 (2021-05-23)

- update dependencies to resolve a potential security issue

## 7.0.0 (2021-03-19)

- require Node.js >= 12 (as Node.js 10 it will reach end-of-life on March 30th)
- remove Node.js 10 and 11 from build targets

## 6.4.1 (2020-10-24)

- update dependencies to resolve a potential security issue
- add Node.js 15 to build targets

## 6.4.0 (2020-06-24)

- move to Jest for testing

## 6.3.3 (2020-03-25)

- update dependencies to resolve potential security issues

## 6.3.2 (2019-12-27)

- add [lockfile-lint](https://github.com/lirantal/lockfile-lint) to tests

## 6.3.1 (2019-12-04)

- fixed missing `tslib` dependency (@kylejlin)

## 6.3.0 (2019-11-12)

- move tests to TypeScript as well
- fix included TypeScript definitions broken in previous version

## 6.2.0 (2019-11-10) - _deprecated_

- InvalidValueError and CircularReferenceError now both extend JsonStrictifyError
- TypeScript definitions for custom errors are now exported

## 6.1.0 (2019-11-09)

- update dependencies
- update code style
- add Node.js 13 to build targets

## 6.0.0 (2019-08-09)

- move to TypeScript
- remove the \*Async-methods

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
