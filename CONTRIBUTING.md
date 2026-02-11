# Contributing to funcflow

Thank you for your interest in contributing to funcflow!

## Code of Conduct

Please be respectful and constructive in all interactions. We welcome contributors of all backgrounds and experience levels.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues. When creating a bug report, include:

- **Clear title**: Describe the issue clearly
- **Steps to reproduce**: Minimal code example
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Environment**: OS, Node.js version, funcflow version

### Suggesting Features

Feature requests are welcome! Please:

- Check if the feature is already requested
- Explain the problem it solves
- Provide examples of how it would work
- Consider if it fits the project scope

### Pull Requests

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests for your changes
4. Ensure all tests pass (`npm test`)
5. Commit with clear messages
6. Push to your fork (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/funcflow.git
cd funcflow

# Install dependencies
npm install

# Run tests
npm test

# Run in development mode
npm run dev

# Build
npm run build
```

## Project Structure

```
funcflow/
├── src/
│   ├── analyzer/       # TypeScript analysis
│   ├── graph/          # Call graph building
│   ├── visualizer/     # Output generation
│   ├── mcp/            # MCP server
│   └── utils/          # Utilities
├── tests/
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   └── fixtures/       # Test fixtures
└── docs/               # Documentation
```

## Coding Standards

- **TypeScript**: All code must be TypeScript
- **Tests**: Write tests for all new features
- **Commits**: Use clear, descriptive commit messages

### Commit Message Format

```
<type>: <subject>

<body>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:

```
feat: add Python support
fix: handle circular dependencies correctly
docs: add installation instructions
```

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

## Need Help?

- [GitHub Issues](https://github.com/fairy-pitta/funcflow/issues)
- [GitHub Discussions](https://github.com/fairy-pitta/funcflow/discussions)

Thank you for making funcflow better!
