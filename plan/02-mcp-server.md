# MCP Server Implementation Plan

## Overview

The MCP server is the entry point that handles communication between Claude Code and the analysis engine using the Model Context Protocol.

## MCP Protocol Basics

### Communication

- **Transport:** stdio (stdin/stdout)
- **Format:** JSON-RPC 2.0
- **Messages:** Tools, Resources, Prompts

### Tool Definition

```typescript
interface Tool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
}
```

## Tools to Implement

### 1. `analyze_function_calls`

**Purpose:** Analyze call graph for a specific function

**Input Schema:**

```typescript
{
  functionName: string;      // e.g., "getUserById"
  projectRoot: string;        // Absolute path to project root
  filePath?: string;          // Optional: specific file to search
  depth?: number;             // Default: 2 (how many levels to traverse)
  direction?: "callers" | "callees" | "both";  // Default: "both"
}
```

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

**Example Usage in Claude Code:**

```
User: "Show me what calls getUserById"
Claude: [calls analyze_function_calls with direction="callers"]
```

### 2. `find_function`

**Purpose:** Find all definitions of a function by name

**Input Schema:**

```typescript
{
  functionName: string;
  projectRoot: string;
  pattern?: string;  // Optional regex pattern
}
```

**Output:**

```typescript
{
  content: [
    {
      type: "text",
      text: string;  // List of locations
    }
  ]
}
```

**Example:**

```
Found 3 definitions of "getUserById":
1. src/users/repository.ts:45
2. src/users/cache.ts:123
3. tests/users.test.ts:89
```

### 3. `visualize_callgraph`

**Purpose:** Generate visualization in specific format

**Input Schema:**

```typescript
{
  functionName: string;
  projectRoot: string;
  format: "mermaid" | "ascii" | "json";
  depth?: number;
  direction?: "callers" | "callees" | "both";
}
```

**Output:**
Varies by format (Mermaid diagram, ASCII tree, or JSON)

## Implementation Steps

### Phase 1: Basic MCP Server Setup

1. **Initialize MCP Server**

```typescript
// src/mcp/server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

export async function createServer() {
  const server = new Server(
    {
      name: "funcflow",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  return server;
}
```

2. **Register Tools**

```typescript
// src/mcp/tools.ts
import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const ANALYZE_FUNCTION_CALLS: Tool = {
  name: "analyze_function_calls",
  description:
    "Analyze function call graph showing callers and callees. " +
    "Use this to understand which functions call or are called by a target function.",
  inputSchema: {
    type: "object",
    properties: {
      functionName: {
        type: "string",
        description: "Name of the function to analyze",
      },
      projectRoot: {
        type: "string",
        description: "Absolute path to project root directory",
      },
      filePath: {
        type: "string",
        description: "Optional: specific file path to search in",
      },
      depth: {
        type: "number",
        description: "How many levels deep to traverse (default: 2)",
        default: 2,
      },
      direction: {
        type: "string",
        enum: ["callers", "callees", "both"],
        description: "Which direction to analyze (default: both)",
        default: "both",
      },
    },
    required: ["functionName", "projectRoot"],
  },
};
```

3. **Handle Tool Calls**

```typescript
// src/mcp/handlers.ts
import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { analyzeCallGraph } from "../analyzer/typescript-analyzer.js";
import { generateMermaidDiagram } from "../visualizer/mermaid.js";

export async function handleToolCall(request: any) {
  const { name, arguments: args } = CallToolRequestSchema.parse(request.params);

  if (name === "analyze_function_calls") {
    // Parse arguments
    const {
      functionName,
      projectRoot,
      filePath,
      depth = 2,
      direction = "both",
    } = args;

    try {
      // Analyze call graph
      const graph = await analyzeCallGraph({
        functionName,
        projectRoot,
        filePath,
        depth,
        direction,
      });

      // Generate visualization
      const mermaid = generateMermaidDiagram(graph);

      // Format response
      const markdown =
        `## Call Graph: \`${functionName}\`\n\n` +
        `**Found in:** ${graph.targetNode.location.file}:${graph.targetNode.location.line}\n\n` +
        `### Visualization\n\n` +
        `\`\`\`mermaid\n${mermaid}\n\`\`\`\n\n` +
        `### Summary\n\n` +
        `- **Callers:** ${graph.callers.length}\n` +
        `- **Callees:** ${graph.callees.length}\n` +
        `- **Total nodes:** ${graph.nodes.size}\n`;

      return {
        content: [
          {
            type: "text",
            text: markdown,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error analyzing function: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  throw new Error(`Unknown tool: ${name}`);
}
```

### Phase 2: Server Lifecycle

1. **Setup Request Handlers**

```typescript
// src/index.ts
import { createServer } from "./mcp/server.js";
import { ANALYZE_FUNCTION_CALLS } from "./mcp/tools.js";
import { handleToolCall } from "./mcp/handlers.js";

async function main() {
  const server = await createServer();

  // List available tools
  server.setRequestHandler("tools/list", async () => ({
    tools: [ANALYZE_FUNCTION_CALLS],
  }));

  // Handle tool execution
  server.setRequestHandler("tools/call", handleToolCall);

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("funcflow MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
```

2. **Error Handling**

- Validate all inputs
- Catch and report analysis errors
- Provide helpful error messages
- Log errors to stderr (not stdout, as stdout is used for MCP)

3. **Logging**

```typescript
// src/utils/logger.ts
export function log(level: "info" | "error", message: string) {
  // Log to stderr to not interfere with stdio transport
  console.error(`[${level.toUpperCase()}] ${message}`);
}
```

### Phase 3: Testing

1. **Unit Tests**

- Test tool registration
- Test request handler logic
- Mock analysis engine

2. **Integration Tests**

- Use MCP SDK test utilities
- Send JSON-RPC requests
- Verify responses

3. **Manual Testing**

```bash
# Run server
node dist/index.js

# Send test request (in another terminal)
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js
```

## Configuration

### Environment Variables

```typescript
// Optional configuration
process.env.FUNCFLOW_LOG_LEVEL = "info" | "debug" | "error";
process.env.FUNCFLOW_MAX_DEPTH = "5"; // Max allowed depth
process.env.FUNCFLOW_TIMEOUT = "30000"; // Analysis timeout in ms
```

## Performance Considerations

1. **Timeout Handling**
   - Set reasonable timeout for analysis (30s)
   - Return partial results if timeout occurs

2. **Memory Limits**
   - Monitor memory usage
   - Fail gracefully if project is too large

3. **Concurrent Requests**
   - MCP is typically single-threaded
   - Queue requests if needed

## Next Steps

After completing the MCP server:

1. Implement TypeScript analyzer (plan/03-typescript-analyzer.md)
2. Implement graph builder (plan/04-graph-builder.md)
3. Implement visualizers (plan/05-visualizer.md)
