import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

const SHARED = ['shared'];
const CORE = [...SHARED, 'core'];
const PROJECT = [...CORE, 'module-logic', 'project'];
const ANALYTICS = [...PROJECT, 'analytics'];
const COMMANDS = [...ANALYTICS, 'commands'];
const PLATFORM = [...COMMANDS, 'platform'];
const PURE_LAYERS = [
  'src/core/**',
  'src/modules/*/model/**',
  'src/modules/*/domain/**',
  'src/modules/*/manifest.ts',
  'src/modules/*/index.ts',
  'src/project/**',
  'src/analytics/**',
  'src/commands/**',
];

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', 'playwright-report', 'test-results', 'trecho-prototipo.js'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/**/*.test.{ts,tsx}', 'src/test/**'],
    plugins: { boundaries },
    settings: {
      'boundaries/include': ['src/**/*'],
      'import/resolver': { typescript: { alwaysTryTypes: true, project: './tsconfig.json' } },
      'boundaries/elements': [
        { type: 'shared', pattern: 'src/shared/**', mode: 'full' },
        { type: 'core', pattern: 'src/core/**', mode: 'full' },
        {
          type: 'module-ui',
          pattern: ['src/modules/*/ui/**', 'src/modules/*/examples.ts'],
          mode: 'full',
          capture: ['module'],
        },
        { type: 'module-logic', pattern: ['src/modules/*/**'], mode: 'full', capture: ['module'] },
        { type: 'project', pattern: 'src/project/**', mode: 'full' },
        { type: 'analytics', pattern: 'src/analytics/**', mode: 'full' },
        { type: 'commands', pattern: 'src/commands/**', mode: 'full' },
        { type: 'platform', pattern: 'src/platform/**', mode: 'full' },
        { type: 'registers', pattern: 'src/registers/**', mode: 'full' },
        { type: 'app', pattern: 'src/app/**', mode: 'full' },
      ],
    },
    rules: {
      'boundaries/no-unknown-files': 'error',
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: 'shared', allow: SHARED },
            { from: 'core', allow: CORE },
            { from: 'module-logic', allow: [...CORE, ['module-logic', { module: '{{ from.module }}' }]] },
            { from: 'project', allow: PROJECT },
            { from: 'analytics', allow: ANALYTICS },
            { from: 'commands', allow: COMMANDS },
            { from: 'platform', allow: PLATFORM },
            { from: 'registers', allow: [...PLATFORM, 'registers'] },
            {
              from: 'module-ui',
              allow: [...PLATFORM, 'registers', ['module-ui', { module: '{{ from.module }}' }]],
            },
            { from: 'app', allow: [...PLATFORM, 'registers', 'module-ui', 'app'] },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/platform/persistence/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: [{ name: 'dexie', message: 'Só platform/persistence importa Dexie.' }] },
      ],
    },
  },
  {
    files: PURE_LAYERS,
    ignores: ['src/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'dexie', message: 'Só platform/persistence importa Dexie.' },
            { name: 'react', message: 'Camada pura não importa React.' },
            { name: 'dexie-react-hooks', message: 'Camada pura não importa React.' },
          ],
        },
      ],
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'indexedDB'],
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: 'Camada pura não lê o relógio.',
        },
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'Camada pura não lê o relógio.',
        },
      ],
    },
  },
  {
    files: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'e2e/**'],
    rules: { '@typescript-eslint/no-explicit-any': 'off', '@typescript-eslint/no-non-null-assertion': 'off' },
  },
);
