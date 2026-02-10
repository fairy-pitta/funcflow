# OSS Setup & Publishing Plan

## Overview

This document covers all technical setup needed to publish funcflow as a high-quality open-source project.

## 1. License

### MIT License

```
MIT License

Copyright (c) 2026 [Your Name]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

**File:** `LICENSE`

## 2. Package.json Configuration

```json
{
  "name": "funcflow",
  "version": "0.1.0",
  "description": "MCP server for analyzing function call graphs in TypeScript/JavaScript codebases",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "funcflow": "dist/index.js"
  },
  "files": ["dist", "README.md", "LICENSE"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "format:check": "prettier --check \"src/**/*.ts\"",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "npm run build && npm run test && npm run lint",
    "prepare": "husky install"
  },
  "keywords": [
    "mcp",
    "model-context-protocol",
    "typescript",
    "javascript",
    "call-graph",
    "code-analysis",
    "static-analysis",
    "developer-tools",
    "claude-code",
    "ai-tools"
  ],
  "author": {
    "name": "Your Name",
    "email": "your.email@example.com",
    "url": "https://github.com/fairy-pitta"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/fairy-pitta/funcflow.git"
  },
  "bugs": {
    "url": "https://github.com/fairy-pitta/funcflow/issues"
  },
  "homepage": "https://github.com/fairy-pitta/funcflow#readme",
  "license": "MIT",
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "typescript": "^5.7.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "@vitest/coverage-v8": "^1.0.0",
    "eslint": "^8.0.0",
    "eslint-config-prettier": "^9.0.0",
    "husky": "^8.0.0",
    "lint-staged": "^15.0.0",
    "prettier": "^3.0.0",
    "tsup": "^8.0.0",
    "vitest": "^1.0.0"
  },
  "lint-staged": {
    "*.ts": ["eslint --fix", "prettier --write"]
  }
}
```

## 3. TypeScript Configuration

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### tsconfig.test.json

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": ["vitest/globals", "node"]
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

## 4. Build Configuration

### tsup.config.ts

```typescript
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  shims: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
});
```

## 5. Code Quality Tools

### ESLint Configuration (.eslintrc.json)

```json
{
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": [
      "error",
      { "argsIgnorePattern": "^_" }
    ],
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-explicit-any": "warn",
    "no-console": ["error", { "allow": ["error", "warn"] }]
  },
  "ignorePatterns": ["dist", "node_modules", "*.config.ts"]
}
```

### Prettier Configuration (.prettierrc)

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": false,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

### .prettierignore

```
dist
node_modules
coverage
*.md
```

## 6. Git Hooks (Husky + lint-staged)

### Setup

```bash
npm install --save-dev husky lint-staged
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
npx husky add .husky/pre-push "npm test"
```

### .husky/pre-commit

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

### .husky/pre-push

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm test
```

## 7. CI/CD with GitHub Actions

### .github/workflows/ci.yml

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node-version: [18.x, 20.x, 22.x]

    steps:
      - uses: actions/checkout@v4

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run typecheck

      - name: Lint
        run: npm run lint

      - name: Format check
        run: npm run format:check

      - name: Build
        run: npm run build

      - name: Test
        run: npm test

      - name: Upload coverage
        if: matrix.os == 'ubuntu-latest' && matrix.node-version == '20.x'
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/coverage-final.json
```

### .github/workflows/release.yml

```yaml
name: Release

on:
  push:
    tags:
      - "v*"

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Use Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20.x"
          registry-url: "https://registry.npmjs.org"

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Publish to npm
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Create GitHub Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          draft: false
          prerelease: false
```

## 8. GitHub Issue & PR Templates

### .github/ISSUE_TEMPLATE/bug_report.md

```markdown
---
name: Bug report
about: Create a report to help us improve
title: "[BUG] "
labels: bug
assignees: ""
---

## Describe the bug

A clear and concise description of what the bug is.

## To Reproduce

Steps to reproduce the behavior:

1. Configure funcflow with '...'
2. Run '....'
3. See error

## Expected behavior

A clear and concise description of what you expected to happen.

## Actual behavior

What actually happened.

## Environment

- OS: [e.g. macOS, Ubuntu, Windows]
- Node.js version: [e.g. 20.0.0]
- funcflow version: [e.g. 0.1.0]
- TypeScript version: [e.g. 5.3.0]

## Additional context

Add any other context about the problem here.
```

### .github/ISSUE_TEMPLATE/feature_request.md

```markdown
---
name: Feature request
about: Suggest an idea for this project
title: "[FEATURE] "
labels: enhancement
assignees: ""
---

## Is your feature request related to a problem?

A clear and concise description of what the problem is. Ex. I'm always frustrated when [...]

## Describe the solution you'd like

A clear and concise description of what you want to happen.

## Describe alternatives you've considered

A clear and concise description of any alternative solutions or features you've considered.

## Additional context

Add any other context or screenshots about the feature request here.
```

### .github/pull_request_template.md

```markdown
## Description

Please include a summary of the changes and which issue is fixed.

Fixes # (issue)

## Type of change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## How Has This Been Tested?

Please describe the tests that you ran to verify your changes.

- [ ] Test A
- [ ] Test B

## Checklist:

- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

## 9. Security Policy

### SECURITY.md

```markdown
# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it by emailing
[your.email@example.com](mailto:your.email@example.com).

**Please do not report security vulnerabilities through public GitHub issues.**

We will acknowledge your email within 48 hours and send a more detailed response
within 7 days indicating the next steps in handling your report.

After the initial reply, we will keep you informed of the progress towards a fix
and full announcement, and may ask for additional information or guidance.

## Disclosure Policy

When we receive a security bug report, we will:

1. Confirm the problem and determine the affected versions
2. Audit code to find any similar problems
3. Prepare fixes for all supported releases
4. Release new versions as soon as possible
```

## 10. Code of Conduct

### CODE_OF_CONDUCT.md

Use Contributor Covenant:

```markdown
# Contributor Covenant Code of Conduct

## Our Pledge

We as members, contributors, and leaders pledge to make participation in our
community a harassment-free experience for everyone.

## Our Standards

Examples of behavior that contributes to a positive environment:

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community

Examples of unacceptable behavior:

- The use of sexualized language or imagery
- Trolling, insulting or derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information without explicit permission

## Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be
reported to [your.email@example.com]. All complaints will be reviewed and
investigated promptly and fairly.

## Attribution

This Code of Conduct is adapted from the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct.html).
```

## 11. Changelog Management

### CHANGELOG.md

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial release
- TypeScript/JavaScript call graph analysis
- MCP server integration
- Mermaid visualization

## [0.1.0] - 2026-XX-XX

### Added

- Initial release of funcflow
- Static analysis using TypeScript Compiler API
- Function call graph generation
- Support for callers and callees analysis
- Mermaid diagram visualization
- MCP server for Claude Code integration
```

## 12. npm Publishing

### Initial Setup

```bash
# Login to npm
npm login

# Verify package name is available
npm search funcflow

# Test publish (dry run)
npm publish --dry-run
```

### Publishing Process

```bash
# Update version
npm version patch  # or minor, or major

# This triggers prepublishOnly script:
# - Runs build
# - Runs tests
# - Runs lint

# Publish
npm publish

# Push tags
git push --tags
```

### Version Strategy

Follow Semantic Versioning:

- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): New features, backward compatible
- **PATCH** (0.0.1): Bug fixes, backward compatible

Pre-releases:

- **alpha**: `0.1.0-alpha.1` - Very early, unstable
- **beta**: `0.1.0-beta.1` - Feature complete, testing
- **rc**: `0.1.0-rc.1` - Release candidate

## 13. GitHub Repository Settings

### Branch Protection

Enable for `main` branch:

- Require pull request reviews before merging
- Require status checks to pass (CI)
- Require branches to be up to date
- Require linear history
- Include administrators

### Discussions

Enable GitHub Discussions:

- Q&A category
- Ideas category
- Show and Tell category
- Announcements category

### Labels

Create labels:

- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Improvements or additions to documentation
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention is needed
- `question` - Further information is requested
- `wontfix` - This will not be worked on
- `duplicate` - This issue or pull request already exists

## 14. Release Checklist

Before each release:

- [ ] All tests pass
- [ ] Documentation is up to date
- [ ] CHANGELOG.md is updated
- [ ] Version is bumped in package.json
- [ ] README examples work
- [ ] No known critical bugs
- [ ] Security vulnerabilities addressed
- [ ] Performance is acceptable
- [ ] Backward compatibility maintained (or noted)

## 15. Post-Release Tasks

After publishing:

- [ ] Create GitHub release with changelog
- [ ] Announce on Twitter/X
- [ ] Post on Reddit (r/typescript, r/javascript)
- [ ] Post on Hacker News (Show HN)
- [ ] Update documentation website
- [ ] Respond to feedback
- [ ] Monitor npm download stats
- [ ] Monitor GitHub issues

## Implementation Timeline

### Week 1: Initial Setup

- [ ] Add LICENSE file
- [ ] Configure package.json
- [ ] Set up TypeScript
- [ ] Configure build tools
- [ ] Set up linting/formatting
- [ ] Configure git hooks

### Week 2: CI/CD

- [ ] Set up GitHub Actions
- [ ] Configure code coverage
- [ ] Add issue templates
- [ ] Add PR template
- [ ] Write SECURITY.md
- [ ] Write CODE_OF_CONDUCT.md

### Week 3: Pre-Release

- [ ] Write CHANGELOG.md
- [ ] Test npm publishing (dry run)
- [ ] Configure GitHub repository
- [ ] Enable discussions
- [ ] Create labels

### Week 4: Release

- [ ] Publish v0.1.0 to npm
- [ ] Create GitHub release
- [ ] Announce to community
- [ ] Monitor feedback
