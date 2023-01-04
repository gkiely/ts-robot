### ⚙️ ts-robot

Typescript fork of https://github.com/matthewp/robot

### Repo technologies

- [Typescript](https://github.com/microsoft/TypeScript)
- [ESLint](https://github.com/eslint/eslint) and [Prettier](https://github.com/prettier/prettier)
- [Vitest](https://vitest.dev)
- [pre-commit and pre-push](https://github.com/toplenboren/simple-git-hooks) hooks

### Scripts

`start`: Install dependencies and start dev server

`coverage`: Generate coverage report and open in Chrome

`test`: Test in watch mode

`test-all`: Run all unit and component tests

`test-e2e`: Run all end-to-end tests

`install-latest`: Updates all dependencies

### Additional notes

- ESLint configuration:

  - `.eslintrc.json`: VSCode and vite-checker-plugin
  - `.eslintrc.dev.json`: pre-commit hook
  - `.eslintrc.prod.json`: pre-push hook
