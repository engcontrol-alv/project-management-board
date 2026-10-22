import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

/** Camadas (ARCHITECTURE §3.2): cada uma só importa as anteriores. */
const ELEMENTS = [
  { type: 'shared', pattern: 'src/shared/**', mode: 'full' },
  { type: 'core', pattern: 'src/core/**', mode: 'full' },
  {
    type: 'module-logic',
    pattern: ['src/modules/*/model/**', 'src/modules/*/domain/**', 'src/modules/*/manifest.ts', 'src/modules/*/index.ts'],
    mode: 'full',
    capture: ['moduleName'],
  },
  { type: 'project', pattern: 'src/project/**', mode: 'full' },
  { type: 'analytics', pattern: 'src/analytics/**', mode: 'full' },
  { type: 'commands', pattern: 'src/commands/**', mode: 'full' },
  { type: 'platform', pattern: 'src/platform/**', mode: 'full' },
  {
    type: 'module-ui',
    pattern: ['src/modules/*/ui/**', 'src/modules/*/examples.ts'],
    mode: 'full',
    capture: ['moduleName'],
  },
  { type: 'registers', pattern: 'src/registers/**', mode: 'full' },
  { type: 'app', pattern: 'src/app/**', mode: 'full' },
];

const below = (...types) => types;
const LOGIC = ['shared', 'core'];
const sameModule = ['module-logic', { moduleName: '${from.moduleName}' }];

const PURE_LAYERS = ['src/core/**', 'src/modules/*/model/**', 'src/modules/*/domain/**', 'src/modules/*/manifest.ts', 'src/modules/*/index.ts', 'src/project/**', 'src/analytics/**', 'src/commands/**'];

export default tseslint.config(
  { ignores: ['dist', 'node_modules', '.claude', '_bakeoff', 'playwright-report', 'test-results', '*.js', '!eslint.config.js'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { boundaries, 'react-hooks': reactHooks },
    settings: {
      'boundaries/elements': ELEMENTS,
      'boundaries/include': ['src/**/*'],
      'boundaries/ignore': ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/test/**'],
      'import/resolver': { typescript: { alwaysTryTypes: true, project: './tsconfig.json' } },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'boundaries/no-unknown-files': 'off',
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          message: '${file.type} não pode importar ${dependency.type} (regra de camadas)',
          rules: [
            { from: 'shared', allow: below('shared') },
            { from: 'core', allow: below('shared', 'core') },
            // Lógica de um módulo não importa a lógica de outro: vínculos são dados (RefDef).
            { from: 'module-logic', allow: [...LOGIC, sameModule] },
            { from: 'project', allow: [...LOGIC, 'module-logic', 'project'] },
            { from: 'analytics', allow: [...LOGIC, 'module-logic', 'project', 'analytics'] },
            { from: 'commands', allow: [...LOGIC, 'module-logic', 'project', 'analytics', 'commands'] },
            { from: 'platform', allow: [...LOGIC, 'module-logic', 'project', 'analytics', 'commands', 'platform'] },
            // UI de um módulo: a própria lógica e UI, nunca a UI de outro módulo.
            {
              from: 'module-ui',
              allow: [
                ...LOGIC,
                sameModule,
                ['module-ui', { moduleName: '${from.moduleName}' }],
                'project',
                'analytics',
                'commands',
                'platform',
                'registers',
              ],
            },
            { from: 'registers', allow: [...LOGIC, 'module-logic', 'project', 'analytics', 'commands', 'platform', 'registers'] },
            { from: 'app', allow: [...LOGIC, 'module-logic', 'project', 'analytics', 'commands', 'platform', 'module-ui', 'registers', 'app'] },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/platform/persistence/**', 'src/**/*.test.ts', 'src/**/*.test.tsx', 'src/test/**'],
    rules: {
      'no-restricted-imports': ['error', { paths: [{ name: 'dexie', message: 'Só platform/persistence acessa o Dexie.' }] }],
    },
  },
  {
    files: PURE_LAYERS,
    ignores: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'dexie', message: 'Só platform/persistence acessa o Dexie.' },
            { name: 'react', message: 'Camadas puras não importam React.' },
            { name: 'react-dom', message: 'Camadas puras não importam React.' },
            { name: 'dexie-react-hooks', message: 'Camadas puras não importam React.' },
          ],
        },
      ],
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'indexedDB'],
      'no-restricted-syntax': [
        'error',
        { selector: "NewExpression[callee.name='Date'][arguments.length=0]", message: 'Camadas puras não leem o relógio.' },
        { selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']", message: 'Camadas puras não leem o relógio.' },
      ],
    },
  },
  {
    files: ['src/**/*.test.{ts,tsx}', 'src/test/**'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
);
