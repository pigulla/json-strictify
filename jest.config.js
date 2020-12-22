// This is the basic configuration file. For your convenience it will run the unit and component tests, but you should
// preferably use one of the more specialized configurations (e.g., run "jest --config jest.unit.config.js" or
// "npm run jest:unit").

module.exports = {
    moduleFileExtensions: ['js', 'json', 'ts'],
    transform: {
        '^.+\\.ts$': 'ts-jest'
    },
    testEnvironment: 'node',
    testRegex: ['/test/.*.spec.ts$'],
    collectCoverage: false,
    coveragePathIgnorePatterns: ['^<rootDir>/src/(.+/)*index.ts$'],
    collectCoverageFrom: ['src/**/*.ts'],
    coverageThreshold: {
        global: {
            branches: 100,
            functions: 100,
            lines: 100,
            statements: 100
        }
    },
    moduleNameMapper: {
        '^~src/?$': '<rootDir>/src/index.ts',
        '^~src/(.+)': '<rootDir>/src/$1',
        '^~test/?$': '<rootDir>/test/index.ts',
        '^~test/(.+)': '<rootDir>/test/$1'
    },
    preset: 'ts-jest',
    globals: {
        'ts-jest': {
            tsconfig: '<rootDir>/test/tsconfig.json'
        }
    }
}
