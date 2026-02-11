# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-02-11

### Added

- Initial release of funcflow MCP server
- TypeScript Compiler API-based analysis engine
  - Project scanning with automatic tsconfig.json detection
  - Function finder supporting functions, methods, arrow functions, and function expressions
  - Call analyzer for detecting function calls within functions
- Call graph builder with configurable depth (1-10 levels)
  - Caller detection (functions that call the target)
  - Callee detection (functions called by the target)
  - Circular dependency handling
- Visualization outputs
  - Mermaid diagram generation
  - ASCII tree representation
  - JSON export with statistics
- MCP server implementation
  - `analyze_function_calls` tool
  - `find_function` tool
  - `visualize_callgraph` tool
- Security features
  - Path validation and normalization
  - Depth parameter limits (1-10)
  - Input sanitization

### Security

- Added path traversal protection
- Added null byte injection prevention
- Added absolute path validation
