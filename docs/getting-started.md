# Getting Started with funcflow

## What is funcflow?

funcflow analyzes your TypeScript/JavaScript code to show you:

- Which functions call a specific function (callers)
- Which functions are called by a specific function (callees)
- The complete call graph with beautiful visualizations

## Prerequisites

- Node.js 18+
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
```

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
You: "I'm refactoring getUserById. Show me all the places it's called."
```

## Next Steps

- [API Reference](./api.md)
- [Troubleshooting](./troubleshooting.md)
