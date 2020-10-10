module.exports = {
    "preset": 'ts-jest',
    "roots": [
        "<rootDir>lib",
        "<rootDir>test"
    ],
    "reporters": [
        "default"
    ],
    "coverageReporters": [
        "text",
        "lcov",
        "cobertura"
    ],
    "collectCoverageFrom": [
        '**/lib/**/*.{ts,tsx,js,jsx}',
	'**/lib/*.{ts,js}'
    ],
    "testEnvironment": 'node'
};

