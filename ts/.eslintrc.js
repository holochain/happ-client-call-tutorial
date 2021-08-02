module.exports = {
    'env': {
        'node': true
    },
    'extends': [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended'
    ],
    'parser': '@typescript-eslint/parser',
    'parserOptions': {
        'ecmaVersion': 'latest',
        'sourceType': 'module'
    },
    'plugins': [
        '@typescript-eslint'
    ],
    'rules': {
        'quotes': ['error', 'single'],
        'semi': ['error', 'always'],
        '@typescript-eslint/no-var-requires': 'off'
    }
};