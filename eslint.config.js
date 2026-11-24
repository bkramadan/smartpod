// Linter rules for the whole repository. Run with `npm run lint`.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

export default defineConfig(
  {
    ignores: [
      '**/node_modules/',
      '**/dist/',
      '**/coverage/',
      '**/.expo/',
      'mobile/android/',
      'mobile/ios/',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['shared/**', 'backend/**', 'pod-simulator/**', '*.js'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['web/**/*.{ts,tsx}', 'mobile/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['mobile/*.config.js'],
    languageOptions: { globals: globals.node, sourceType: 'commonjs' },
  },
  // Must stay last: turns off style rules that Prettier already handles.
  prettier,
);
