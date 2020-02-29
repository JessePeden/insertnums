module.exports = {
    "env": {
        "es6": true
    },
    "root": true,
    "parser": "@typescript-eslint/parser",
    "extends": [
        'eslint.recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'prettier/@typescript-eslint',
        'plugin:prettier/recommended',
               ],
    "parserOptions": {
        "sourceType": "module"
    },
    "plugins": [
        "@typescript-eslint"
    ],
    "rules": {
        "@typescript-eslint/class-name-casing": "warn",
        "@typescript-eslint/member-delimiter-style": [
            "warn",
            {
                "multiline": {
                    "delimiter": "semi",
                    "requireLast": true
                },
                "singleline": {
                    "delimiter": "semi",
                    "requireLast": false
                }
            }
        ],
        "@typescript-eslint/no-use-before-define": "off",
        "@typescript-eslint/semi": [
            "warn",
            "always"
        ],
        "curly": "warn",
        "no-redeclare": "warn",
        "no-throw-literal": "warn",
        "no-unused-expressions": "warn"
    }
};
