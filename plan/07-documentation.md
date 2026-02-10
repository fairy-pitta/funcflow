# Documentation Plan

## Overview

Comprehensive documentation is critical for OSS adoption. This plan covers all documentation needed from initial setup to advanced usage.

## Documentation Structure

```
funcflow/
├── README.md                    # Main entry point
├── CONTRIBUTING.md              # Contribution guidelines
├── CODE_OF_CONDUCT.md           # Community standards
├── LICENSE                      # MIT License
├── SECURITY.md                  # Security policy
├── CHANGELOG.md                 # Version history
├── docs/
│   ├── getting-started.md       # Quick start guide
│   ├── installation.md          # Installation guide
│   ├── usage.md                 # Usage examples
│   ├── configuration.md         # Configuration options
│   ├── api.md                   # API reference
│   ├── architecture.md          # Technical architecture
│   ├── troubleshooting.md       # Common issues
│   ├── faq.md                   # Frequently asked questions
│   └── examples/
│       ├── basic-usage.md
│       ├── advanced-usage.md
│       └── integration.md
└── examples/
    ├── simple-project/          # Minimal example
    ├── typescript-project/      # Real TypeScript project
    └── react-app/               # React app example
```

## 1. README.md (Main Entry Point)

### Structure

````markdown
# funcflow

> MCP server for analyzing function call graphs in TypeScript/JavaScript codebases

[Badges: npm version, CI status, coverage, license, etc.]

## 🎯 What is funcflow?

funcflow helps you understand code by visualizing function call relationships.
It integrates seamlessly with Claude Code via the Model Context Protocol (MCP).

### Key Features

- 🔍 **Smart Analysis**: Uses TypeScript Compiler API for accurate results
- 📊 **Beautiful Visualizations**: Mermaid diagrams, ASCII trees, JSON export
- 🚀 **Fast**: Analyzes most functions in <500ms
- 🔌 **Zero Config**: Works out of the box with any TypeScript/JavaScript project
- 💻 **Claude Code Integration**: Use directly in your AI coding workflow

## 🎬 Demo

[GIF showing Claude Code using funcflow]

User: "Show me what calls getUserById"
Claude: [Uses funcflow, shows beautiful call graph]

## 📦 Installation

```bash
# Using npx (no installation needed)
npx funcflow

# Or install globally
npm install -g funcflow
```
````

## 🚀 Quick Start

### With Claude Code

Add to your Claude Code configuration:

```json
{
  "mcpServers": {
    "funcflow": {
      "command": "npx",
      "args": ["-y", "funcflow"]
    }
  }
}
```

Then in Claude Code:

```
You: "Show me what functions call getUserById"
Claude: [Automatically uses funcflow to analyze and show results]
```

### Standalone CLI (Coming Soon)

```bash
funcflow analyze getUserById
```

## 📖 Documentation

- [Getting Started](./docs/getting-started.md)
- [Installation Guide](./docs/installation.md)
- [Usage Examples](./docs/usage.md)
- [API Reference](./docs/api.md)
- [Troubleshooting](./docs/troubleshooting.md)

## 🤝 Contributing

We love contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License

MIT © [Your Name]

## 🌟 Show Your Support

Give a ⭐️ if this project helped you!

## 🔗 Links

- [GitHub](https://github.com/fairy-pitta/funcflow)
- [npm](https://www.npmjs.com/package/funcflow)
- [Documentation](https://fairy-pitta.github.io/funcflow)
- [Report Bug](https://github.com/fairy-pitta/funcflow/issues)
- [Request Feature](https://github.com/fairy-pitta/funcflow/issues)

````

### Badges to Include

```markdown
[![npm version](https://badge.fury.io/js/funcflow.svg)](https://www.npmjs.com/package/funcflow)
[![CI](https://github.com/fairy-pitta/funcflow/workflows/CI/badge.svg)](https://github.com/fairy-pitta/funcflow/actions)
[![Coverage](https://codecov.io/gh/fairy-pitta/funcflow/branch/main/graph/badge.svg)](https://codecov.io/gh/fairy-pitta/funcflow)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
````

## 2. CONTRIBUTING.md

````markdown
# Contributing to funcflow

Thank you for your interest in contributing! 🎉

## Code of Conduct

This project adheres to a [Code of Conduct](./CODE_OF_CONDUCT.md).
By participating, you are expected to uphold this code.

## How Can I Contribute?

### 🐛 Reporting Bugs

Before creating bug reports, please check existing issues. When creating a bug report, include:

- **Clear title**: Describe the issue clearly
- **Steps to reproduce**: Minimal code example
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Environment**: OS, Node.js version, funcflow version

### 💡 Suggesting Features

Feature requests are welcome! Please:

- Check if the feature is already requested
- Explain the problem it solves
- Provide examples of how it would work
- Consider if it fits the project scope

### 🔧 Pull Requests

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests for your changes
4. Ensure all tests pass (`npm test`)
5. Commit with clear messages (`git commit -m 'Add amazing feature'`)
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
````

## Project Structure

See [architecture documentation](./docs/architecture.md).

## Coding Standards

- **TypeScript**: All code must be TypeScript
- **Formatting**: Use Prettier (runs automatically)
- **Linting**: Use ESLint (enforced in CI)
- **Tests**: Maintain >90% coverage
- **Commits**: Use conventional commits

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:

```
feat(analyzer): add Python support
fix(graph): handle circular dependencies correctly
docs(readme): add installation instructions
```

## Testing

- Write tests for all new features
- Update tests when changing existing features
- Ensure all tests pass before submitting PR

```bash
# Run all tests
npm test

# Run specific test
npm test -- function-finder

# Watch mode
npm test -- --watch

# Coverage
npm run test:coverage
```

## Documentation

Update documentation when adding features:

- README.md for user-facing changes
- Code comments for complex logic
- API docs for new public APIs
- Examples for new use cases

## Need Help?

- 💬 [GitHub Discussions](https://github.com/fairy-pitta/funcflow/discussions)
- 🐛 [Issues](https://github.com/fairy-pitta/funcflow/issues)

## Recognition

Contributors will be recognized in:

- README.md
- Release notes
- GitHub contributors page

Thank you for making funcflow better! 🙏

````

## 3. Getting Started Guide

```markdown
# Getting Started with funcflow

## What is funcflow?

funcflow analyzes your TypeScript/JavaScript code to show you:
- Which functions call a specific function (callers)
- Which functions are called by a specific function (callees)
- The complete call graph with beautiful visualizations

## Prerequisites

- Node.js 18+ (or use npx without installation)
- A TypeScript or JavaScript project

## Installation

### Option 1: Use with npx (Recommended)

No installation needed! Just configure in Claude Code:

```json
{
  "mcpServers": {
    "funcflow": {
      "command": "npx",
      "args": ["-y", "funcflow"]
    }
  }
}
````

### Option 2: Global Installation

```bash
npm install -g funcflow
```

Then configure:

```json
{
  "mcpServers": {
    "funcflow": {
      "command": "funcflow"
    }
  }
}
```

## Your First Analysis

1. **Open your project in Claude Code**

2. **Ask Claude to analyze a function**

   ```
   You: "Show me what calls the getUserById function"
   ```

3. **Claude automatically uses funcflow**

   Claude will:
   - Find the function
   - Analyze call relationships
   - Show you a beautiful Mermaid diagram

4. **Example output**

   ```mermaid
   graph TD
       getUserById["getUserById<br/>src/users.ts:45"]
       handleRequest["handleRequest<br/>src/api.ts:12"]
       authenticate["authenticate<br/>src/auth.ts:78"]

       handleRequest --> getUserById
       authenticate --> getUserById

       style getUserById fill:#f9f,stroke:#333,stroke-width:4px
   ```

## Common Use Cases

### Find All Callers

```
You: "What functions call validateEmail?"
```

### Find All Callees

```
You: "What does the processOrder function call?"
```

### Understand a Complex Function

```
You: "Show me the complete call graph for handleCheckout with depth 3"
```

### Refactoring Assistance

```
You: "I'm refactoring getUserById. Show me all the places it's called
     so I can update them."
```

## Configuration Options

funcflow works with zero configuration, but you can customize:

```json
{
  "mcpServers": {
    "funcflow": {
      "command": "npx",
      "args": ["-y", "funcflow"],
      "env": {
        "FUNCFLOW_MAX_DEPTH": "5",
        "FUNCFLOW_TIMEOUT": "30000"
      }
    }
  }
}
```

## Next Steps

- [Usage Examples](./usage.md)
- [Configuration Guide](./configuration.md)
- [Troubleshooting](./troubleshooting.md)
- [API Reference](./api.md)

````

## 4. Examples Directory

### Example 1: Simple Project

```typescript
// examples/simple-project/index.ts

/**
 * Example: Basic function call analysis
 *
 * Run: Ask Claude "Show me what calls greet"
 * Expected: Shows that main() calls greet()
 */

function main() {
  const message = greet("World");
  console.log(message);
  cleanup();
}

function greet(name: string): string {
  return `Hello, ${name}!`;
}

function cleanup() {
  console.log("Cleaning up...");
}

main();
````

### Example 2: Complex Project

```typescript
// examples/typescript-project/src/users/service.ts

/**
 * Example: Complex call graph with multiple layers
 *
 * Run: Ask Claude "Analyze the createUser function"
 * Expected: Shows full call chain including validation, database, email
 */

export class UserService {
  async createUser(data: CreateUserDto) {
    // Validates input
    await this.validateUser(data);

    // Creates in database
    const user = await this.userRepository.create(data);

    // Sends welcome email
    await this.emailService.sendWelcomeEmail(user);

    return user;
  }

  private async validateUser(data: CreateUserDto) {
    await this.validateEmail(data.email);
    await this.validatePassword(data.password);
  }

  // ... more methods
}
```

## 5. API Documentation

````markdown
# API Reference

## MCP Tools

### analyze_function_calls

Analyzes function call relationships.

**Input:**

```typescript
{
  functionName: string;      // Function name to analyze
  projectRoot: string;        // Absolute path to project root
  filePath?: string;          // Optional: specific file
  depth?: number;             // Default: 2
  direction?: "callers" | "callees" | "both";  // Default: "both"
}
```
````

**Output:**

```typescript
{
  content: [
    {
      type: "text",
      text: string;  // Markdown with Mermaid diagram
    }
  ]
}
```

**Example:**

```json
{
  "functionName": "getUserById",
  "projectRoot": "/Users/you/my-project",
  "depth": 3,
  "direction": "both"
}
```

### find_function

Finds all definitions of a function.

[Similar detailed documentation for each tool]

## Environment Variables

- `FUNCFLOW_LOG_LEVEL`: `"info" | "debug" | "error"` (default: `"info"`)
- `FUNCFLOW_MAX_DEPTH`: Maximum analysis depth (default: `5`)
- `FUNCFLOW_TIMEOUT`: Analysis timeout in ms (default: `30000`)

## Programmatic API (Future)

```typescript
import { analyzeCallGraph } from "funcflow";

const result = await analyzeCallGraph({
  functionName: "getUserById",
  projectRoot: process.cwd(),
  depth: 2,
  direction: "both",
});

console.log(result.nodes.size); // Number of functions found
```

````

## 6. Troubleshooting Guide

```markdown
# Troubleshooting

## Common Issues

### funcflow is not found

**Problem:** Claude Code says "Tool funcflow not found"

**Solution:**
1. Check your config: `~/.config/claude-code/settings.json`
2. Ensure you have:
   ```json
   {
     "mcpServers": {
       "funcflow": {
         "command": "npx",
         "args": ["-y", "funcflow"]
       }
     }
   }
````

3. Restart Claude Code

### Function not found

**Problem:** "Function 'myFunction' not found"

**Solutions:**

- Ensure the function name is correct (case-sensitive)
- Check if the function is in your project root
- Try specifying the file path explicitly
- Ensure your project has a `tsconfig.json` or is JavaScript

### Analysis is slow

**Problem:** Analysis takes >10 seconds

**Solutions:**

- Reduce depth: Ask for "depth 1" or "depth 2"
- Specify file path to narrow search
- Exclude large directories (node_modules is already excluded)

### Out of memory

**Problem:** "JavaScript heap out of memory"

**Solution:**

- Analyze smaller portions of code
- Reduce depth
- Increase Node.js memory: `NODE_OPTIONS=--max-old-space-size=4096`

## Getting Help

If you're still stuck:

1. Check [existing issues](https://github.com/fairy-pitta/funcflow/issues)
2. Create a new issue with:
   - funcflow version: `npm list -g funcflow`
   - Node.js version: `node -v`
   - Operating system
   - Steps to reproduce
   - Error messages

```

## 7. Website / GitHub Pages

### Landing Page Structure

```

docs/
├── index.html # Landing page
├── getting-started.html # Tutorial
├── examples.html # Live examples
├── api.html # API docs
└── assets/
├── demo.gif # Demo animation
├── screenshot.png # Screenshots
└── styles.css # Styling

```

### Content

- Hero section with demo GIF
- Feature highlights
- Installation instructions
- Live examples (if possible)
- Link to GitHub
- Community/support links

## Implementation Checklist

### Phase 1: Core Documentation

- [ ] Write comprehensive README.md
- [ ] Create CONTRIBUTING.md
- [ ] Add CODE_OF_CONDUCT.md
- [ ] Write getting-started.md
- [ ] Create usage examples

### Phase 2: Technical Documentation

- [ ] Write API reference
- [ ] Document architecture
- [ ] Create troubleshooting guide
- [ ] Write FAQ

### Phase 3: Examples & Tutorials

- [ ] Create simple example project
- [ ] Create TypeScript example
- [ ] Create React app example
- [ ] Record demo video/GIF

### Phase 4: Website

- [ ] Set up GitHub Pages
- [ ] Create landing page
- [ ] Add examples page
- [ ] Add API documentation

### Phase 5: Maintenance

- [ ] Keep CHANGELOG.md updated
- [ ] Update docs with each release
- [ ] Respond to documentation issues
- [ ] Add more examples based on feedback

## Documentation Quality Standards

### Clarity
- Write for beginners
- Use clear, simple language
- Include examples for everything
- Avoid jargon (or explain it)

### Completeness
- Cover all features
- Include error scenarios
- Provide troubleshooting steps
- Link related topics

### Accuracy
- Test all examples
- Keep docs in sync with code
- Update with each release
- Review regularly

### Accessibility
- Clear headings hierarchy
- Alt text for images
- Code examples with syntax highlighting
- Mobile-friendly

## Metrics for Success

- GitHub stars growth
- Documentation page views
- Issue resolution time
- User questions in Discussions
- Positive feedback/testimonials
```
