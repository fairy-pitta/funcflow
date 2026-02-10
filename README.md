# funcflow

> MCP server for analyzing function call graphs in TypeScript/JavaScript codebases

**Status:** 🚧 In Development | [See detailed implementation plans](./plan/)

## What is funcflow?

funcflow helps developers understand complex codebases by analyzing and visualizing function call relationships. It integrates seamlessly with [Claude Code](https://claude.com/claude-code) via the Model Context Protocol (MCP).

Simply ask Claude "Show me what calls getUserById" and funcflow will automatically:

- Analyze your codebase using the TypeScript Compiler API
- Find all callers and callees
- Generate beautiful Mermaid diagrams
- Show results directly in Claude Code

## Features (Planned)

- 🔍 **Smart Analysis** - Uses TypeScript Compiler API for accurate type-aware analysis
- 📊 **Beautiful Visualizations** - Mermaid diagrams, ASCII trees, and JSON export
- 🎯 **Configurable Depth** - Control how deep to traverse the call graph
- 🚀 **Fast Performance** - Analyzes most functions in <500ms
- 🔌 **Zero Config** - Works out of the box with any TypeScript/JavaScript project
- 💯 **Free & Open Source** - MIT licensed, always free

## Project Status

This project is currently in **active development**. We are working towards v0.1.0 release.

### Roadmap

- [ ] **Phase 1:** Core analysis engine (Week 1)
- [ ] **Phase 2:** Graph building (Week 1-2)
- [ ] **Phase 3:** Visualization (Week 2)
- [ ] **Phase 4:** MCP integration (Week 2-3)
- [ ] **Phase 5:** Testing & polish (Week 3)
- [ ] **Phase 6:** Documentation & OSS setup (Week 3-4)
- [ ] **Phase 7:** Public launch 🚀

[See detailed implementation plan →](./plan/README.md)

## Quick Start (Coming Soon)

Once released, installation will be simple:

```bash
# Using npx (no installation needed)
npx funcflow

# Or install globally
npm install -g funcflow
```

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

## Documentation

Comprehensive documentation is being prepared:

- 📚 [Implementation Plans](./plan/) - Detailed technical plans
- 🚀 Getting Started Guide (Coming soon)
- 📖 API Reference (Coming soon)
- 💡 Usage Examples (Coming soon)

## Contributing

We welcome contributions! Here's how you can help:

1. **⭐ Star this repo** to show your support
2. **🐛 Report bugs** by opening an issue
3. **💡 Suggest features** in discussions
4. **🔧 Submit PRs** (see [CONTRIBUTING.md](./CONTRIBUTING.md) - coming soon)

## Development

Want to contribute or run locally?

```bash
# Clone the repository
git clone https://github.com/fairy-pitta/funcflow.git
cd funcflow

# Install dependencies (coming soon)
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Build
npm run build
```

## Why funcflow?

Understanding code is hard. Especially when:

- Jumping between files to trace function calls
- Trying to understand legacy code
- Refactoring without breaking things
- Reviewing pull requests

funcflow makes it easy by visualizing the entire call graph instantly.

## Inspiration

This project was inspired by a need identified on Hacker News: developers want better tools to understand function call relationships, especially when using AI coding assistants like Claude Code.

## License

MIT © [fairy-pitta](https://github.com/fairy-pitta)

Free and open source, forever.

## Support

- 🐛 [Report Issues](https://github.com/fairy-pitta/funcflow/issues)
- 💬 [Discussions](https://github.com/fairy-pitta/funcflow/discussions) (coming soon)
- ⭐ Star this repo if you find it useful!

---

**Note:** This project is under active development. Watch this repository to get notified when v0.1.0 is released!
