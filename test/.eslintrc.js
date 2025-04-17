const path = require("node:path");

module.exports = {
	parserOptions: {
		ecmaVersion: 2020,
		sourceType: "module",
		tsconfigRootDir: path.join(__dirname, ".."),
		project: ["./test/tsconfig.json"],
	},
	rules: {
		"no-return-assign": "off",
		"no-unused-expressions": "off",
		"unicorn/consistent-function-scoping": "off",
		"@typescript-eslint/ban-ts-comment": "off",
		"@typescript-eslint/ban-types": "off",
		"@typescript-eslint/explicit-function-return-type": "off",
		"@typescript-eslint/no-empty-function": "off",
		"@typescript-eslint/no-unsafe-member-access": "off",
		"@typescript-eslint/unbound-method": "off",
	},
};
