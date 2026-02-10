# funcflow

MCP (Model Context Protocol) server for analyzing function call graphs in codebases.

## Overview

This MCP server provides tools to analyze and visualize function call relationships in TypeScript/JavaScript projects. It helps developers understand code structure by showing:

- Which functions call a specific function (callers)
- Which functions are called by a specific function (callees)
- Complete call graph visualization

## Features

- 🔍 Static analysis using TypeScript Compiler API
- 📊 Multiple visualization formats (Mermaid, ASCII tree, JSON)
- 🎯 Configurable depth for call graph traversal
- 🚀 Fast analysis with caching
- 🔌 Seamless integration with Claude Code

## Installation

```bash
npm install
npm run build
```

## Usage with Claude Code

Add to your Claude Code configuration:

```json
{
  "mcpServers": {
    "funcflow": {
      "command": "node",
      "args": ["/path/to/funcflow/dist/index.js"]
    }
  }
}
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Development mode with watch
npm run dev

# Run tests
npm test
```

## License

MIT
