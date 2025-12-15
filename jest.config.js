/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	testTimeout: 10000,
	roots: ["<rootDir>/packages"],
	testMatch: ["**/test/**/*.test.ts"],
	moduleNameMapper: {
		"^@firemix/(.*)$": "<rootDir>/packages/$1/src/index.ts",
		"^(\\.{1,2}/.*)\\.js$": "$1",
	},
	transform: {
		"^.+\\.(t|j)sx?$": ["ts-jest", { tsconfig: "tsconfig.typecheck.json" }],
	},
};
