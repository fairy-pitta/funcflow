# Architecture & Technical Stack

## Overview

funcflow is an MCP (Model Context Protocol) server that analyzes function call graphs in TypeScript/JavaScript codebases using static analysis.

## System Architecture

```
┌─────────────────────────────────────────┐
│         Claude Code (MCP Client)        │
└──────────────────┬──────────────────────┘
                   │ JSON-RPC over stdio
                   │
┌──────────────────▼──────────────────────┐
│         MCP Server (funcflow)           │
│  ┌────────────────────────────────────┐ │
│  │   MCP Protocol Handler             │ │
│  │   - Tool definitions               │ │
│  │   - Request/Response handling      │ │
│  └────────────┬───────────────────────┘ │
│               │                          │
│  ┌────────────▼───────────────────────┐ │
│  │   Core Analysis Engine             │ │
│  │  ┌──────────────────────────────┐  │ │
│  │  │  TypeScript Analyzer         │  │ │
│  │  │  - AST parsing               │  │ │
│  │  │  - Type resolution           │  │ │
│  │  │  - Call expression detection │  │ │
│  │  └──────────────────────────────┘  │ │
│  │  ┌──────────────────────────────┐  │ │
│  │  │  Call Graph Builder          │  │ │
│  │  │  - Graph construction        │  │ │
│  │  │  - Depth-limited traversal   │  │ │
│  │  │  - Caller/Callee resolution  │  │ │
│  │  └──────────────────────────────┘  │ │
│  │  ┌──────────────────────────────┐  │ │
│  │  │  Visualizer                  │  │ │
│  │  │  - Mermaid diagram           │  │ │
│  │  │  - ASCII tree                │  │ │
│  │  │  - JSON export               │  │ │
│  │  └──────────────────────────────┘  │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## Technology Stack

### Core Dependencies

- **@modelcontextprotocol/sdk** (^1.0.0) - MCP protocol implementation
- **typescript** (^5.7.0) - TypeScript compiler API for static analysis
- **@typescript-eslint/parser** (optional) - Alternative parser for JSX/TSX support

### Build & Development

- **TypeScript** (^5.7.0) - Language
- **tsx** - Development runtime
- **esbuild** or **tsup** - Fast bundler
- **vitest** - Testing framework

### Utilities

- **graphology** - Graph data structure (if needed)
- **chalk** - Terminal colors (for ASCII output)

## Project Structure

```
funcflow/
├── src/
│   ├── index.ts                    # MCP server entry point
│   ├── mcp/
│   │   ├── server.ts              # MCP server setup
│   │   ├── tools.ts               # Tool definitions
│   │   └── types.ts               # MCP types
│   ├── analyzer/
│   │   ├── typescript-analyzer.ts # TS compiler API wrapper
│   │   ├── ast-visitor.ts         # AST traversal logic
│   │   └── types.ts               # Analyzer types
│   ├── graph/
│   │   ├── call-graph.ts          # Graph data structure
│   │   ├── builder.ts             # Graph construction
│   │   └── traverser.ts           # Graph traversal
│   ├── visualizer/
│   │   ├── mermaid.ts             # Mermaid diagram generator
│   │   ├── ascii.ts               # ASCII tree generator
│   │   └── json.ts                # JSON export
│   └── utils/
│       ├── file-system.ts         # FS utilities
│       └── logger.ts              # Logging
├── tests/
│   ├── fixtures/                   # Test codebases
│   ├── analyzer.test.ts
│   ├── graph.test.ts
│   └── visualizer.test.ts
├── plan/                           # Implementation plans
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

## Key Design Decisions

### 1. TypeScript Compiler API

**Why:**

- Official parser with full type information
- Handles all TS/JS syntax variations
- Accurate symbol resolution
- Supports JSX/TSX out of the box

**Trade-offs:**

- Larger dependency size
- Slower than tree-sitter (but acceptable for this use case)

### 2. Synchronous Analysis

**Why:**

- MCP tools are request-response based
- Simplifies implementation
- Analysis is typically fast enough (<1s for most functions)

**Future:** Could add async/streaming for very large codebases

### 3. In-Memory Graph

**Why:**

- Fast traversal
- No persistence needed
- Typical graphs are small (100-1000 nodes)

**Trade-offs:**

- Memory usage for very large codebases
- Re-analysis on every request (could add caching later)

### 4. Multiple Output Formats

**Why:**

- Mermaid: Rich visualization in Claude Code
- ASCII: Quick terminal-friendly view
- JSON: Machine-readable for further processing

## Performance Targets

- **Small function (<10 calls):** <100ms
- **Medium function (<50 calls):** <500ms
- **Large function (<200 calls):** <2s
- **Memory usage:** <500MB for typical projects

## Future Extensibility

### Language Support

- Phase 1: TypeScript/JavaScript (MVP)
- Phase 2: Python (using `ast` module)
- Phase 3: Go (using `go/parser`)

### Caching

- LRU cache for parsed ASTs
- File watcher for invalidation
- Configurable cache size

### Advanced Features

- Cross-file analysis optimization
- Incremental analysis
- Symbol usage heatmaps
- Call path suggestions
