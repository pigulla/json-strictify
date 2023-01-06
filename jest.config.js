module.exports = {
    moduleFileExtensions: ['js', 'json', 'ts'],
    transform: {
        '^.+\\.ts$': [
            'ts-jest',
            {
                tsconfig: '<rootDir>/test/tsconfig.json',
            },
        ],
    },
    testEnvironment: 'node',
    testRegex: ['/test/.*.spec.ts$'],
    collectCoverage: true,
    coveragePathIgnorePatterns: ['^<rootDir>/src/(.+/)*index.ts$'],
    collectCoverageFrom: ['src/**/*.ts'],
    coverageThreshold: {
        global: {
            branches: 100,
            functions: 100,
            lines: 100,
            statements: 100,
        },
    },
    moduleNameMapper: {
        '^~src/?$': '<rootDir>/src/index.ts',
        '^~src/(.+)': '<rootDir>/src/$1',
        '^~test/?$': '<rootDir>/test/index.ts',
        '^~test/(.+)': '<rootDir>/test/$1',
    },
}
