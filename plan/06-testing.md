# Testing Strategy

## Overview

Comprehensive testing strategy covering unit tests, integration tests, and end-to-end testing with Claude Code.

## Test Framework

- **Framework:** Vitest
- **Assertions:** Expect API (Jest-compatible)
- **Coverage:** v8 (built into Vitest)
- **Fixtures:** Test codebases in `tests/fixtures/`

## Test Structure

```
tests/
├── fixtures/                    # Test codebases
│   ├── simple/                 # Basic function calls
│   ├── complex/                # Nested calls, cycles
│   ├── typescript/             # TS-specific features
│   └── edge-cases/             # Edge cases
├── unit/
│   ├── analyzer/
│   │   ├── project-scanner.test.ts
│   │   ├── function-finder.test.ts
│   │   └── call-analyzer.test.ts
│   ├── graph/
│   │   ├── builder.test.ts
│   │   ├── traverser.test.ts
│   │   └── statistics.test.ts
│   └── visualizer/
│       ├── mermaid.test.ts
│       ├── ascii.test.ts
│       └── json.test.ts
├── integration/
│   ├── end-to-end.test.ts
│   └── mcp-server.test.ts
└── test-utils.ts                # Test helpers
```

## Unit Tests

### 1. Project Scanner Tests

```typescript
// tests/unit/analyzer/project-scanner.test.ts
import { describe, it, expect } from "vitest";
import { scanProject } from "../../../src/analyzer/project-scanner";
import path from "path";

describe("Project Scanner", () => {
  it("finds tsconfig.json", () => {
    const projectRoot = path.join(__dirname, "../../fixtures/typescript");
    const info = scanProject(projectRoot);

    expect(info.tsConfigPath).toBeDefined();
    expect(info.sourceFiles.length).toBeGreaterThan(0);
  });

  it("falls back to file scanning without tsconfig", () => {
    const projectRoot = path.join(__dirname, "../../fixtures/simple");
    const info = scanProject(projectRoot);

    expect(info.tsConfigPath).toBeUndefined();
    expect(info.sourceFiles.length).toBeGreaterThan(0);
  });

  it("excludes node_modules and dist", () => {
    const projectRoot = path.join(__dirname, "../../fixtures/complex");
    const info = scanProject(projectRoot);

    const hasNodeModules = info.sourceFiles.some((f) =>
      f.includes("node_modules"),
    );
    const hasDist = info.sourceFiles.some((f) => f.includes("dist"));

    expect(hasNodeModules).toBe(false);
    expect(hasDist).toBe(false);
  });
});
```

### 2. Function Finder Tests

```typescript
// tests/unit/analyzer/function-finder.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { findFunction } from "../../../src/analyzer/function-finder";
import ts from "typescript";
import { createTestProgram } from "../../test-utils";

describe("Function Finder", () => {
  let program: ts.Program;

  beforeAll(() => {
    const code = `
      function getUserById(id: string) {
        return db.users.find(u => u.id === id);
      }

      class UserService {
        getUser(id: string) {
          return getUserById(id);
        }
      }

      const fetchUser = (id: string) => {
        return getUserById(id);
      };
    `;
    program = createTestProgram({ "test.ts": code });
  });

  it("finds function declaration", () => {
    const results = findFunction(program, "getUserById");
    expect(results).toHaveLength(1);
    expect(results[0].kind).toBe("function");
  });

  it("finds method declaration", () => {
    const results = findFunction(program, "getUser");
    expect(results).toHaveLength(1);
    expect(results[0].kind).toBe("method");
  });

  it("finds arrow function", () => {
    const results = findFunction(program, "fetchUser");
    expect(results).toHaveLength(1);
    expect(results[0].kind).toBe("arrow");
  });

  it("returns empty array for non-existent function", () => {
    const results = findFunction(program, "nonExistent");
    expect(results).toHaveLength(0);
  });

  it("finds multiple definitions across files", () => {
    const multiFileProgram = createTestProgram({
      "a.ts": "function foo() {}",
      "b.ts": "function foo() {}",
    });

    const results = findFunction(multiFileProgram, "foo");
    expect(results).toHaveLength(2);
  });
});
```

### 3. Call Analyzer Tests

```typescript
// tests/unit/analyzer/call-analyzer.test.ts
import { describe, it, expect } from "vitest";
import { findCallsInFunction } from "../../../src/analyzer/call-analyzer";
import { createTestProgram, getFunctionNode } from "../../test-utils";

describe("Call Analyzer", () => {
  it("finds direct function calls", () => {
    const code = `
      function a() { b(); c(); }
      function b() {}
      function c() {}
    `;
    const program = createTestProgram({ "test.ts": code });
    const typeChecker = program.getTypeChecker();
    const functionNode = getFunctionNode(program, "a");
    const sourceFile = functionNode.getSourceFile();

    const calls = findCallsInFunction(functionNode, sourceFile, typeChecker);

    expect(calls).toHaveLength(2);
    expect(calls.map((c) => c.calleeName)).toEqual(["b", "c"]);
  });

  it("finds method calls", () => {
    const code = `
      function a() {
        obj.method();
        this.anotherMethod();
      }
    `;
    const program = createTestProgram({ "test.ts": code });
    const typeChecker = program.getTypeChecker();
    const functionNode = getFunctionNode(program, "a");
    const sourceFile = functionNode.getSourceFile();

    const calls = findCallsInFunction(functionNode, sourceFile, typeChecker);

    expect(calls).toHaveLength(2);
    expect(calls[0].kind).toBe("method");
  });

  it("finds nested calls", () => {
    const code = `
      function a() {
        b(c(d()));
      }
    `;
    const program = createTestProgram({ "test.ts": code });
    const typeChecker = program.getTypeChecker();
    const functionNode = getFunctionNode(program, "a");
    const sourceFile = functionNode.getSourceFile();

    const calls = findCallsInFunction(functionNode, sourceFile, typeChecker);

    expect(calls.length).toBeGreaterThanOrEqual(3);
  });
});
```

### 4. Graph Builder Tests

```typescript
// tests/unit/graph/builder.test.ts
import { describe, it, expect } from "vitest";
import { buildCallGraph } from "../../../src/graph/builder";
import { createTestProgram, getFunctionLocation } from "../../test-utils";

describe("Graph Builder", () => {
  it("builds simple call graph", () => {
    const code = `
      function a() { b(); }
      function b() { c(); }
      function c() { }
    `;
    const program = createTestProgram({ "test.ts": code });
    const typeChecker = program.getTypeChecker();
    const targetFunction = getFunctionLocation(program, "a");

    const graph = buildCallGraph({
      program,
      typeChecker,
      targetFunction,
      depth: 2,
      direction: "callees",
    });

    expect(graph.nodes.size).toBe(3);
    expect(graph.edges.length).toBe(2);
    expect(graph.callees).toContain("b");
  });

  it("respects depth limit", () => {
    const code = `
      function a() { b(); }
      function b() { c(); }
      function c() { d(); }
      function d() { }
    `;
    const program = createTestProgram({ "test.ts": code });
    const typeChecker = program.getTypeChecker();
    const targetFunction = getFunctionLocation(program, "a");

    const graph = buildCallGraph({
      program,
      typeChecker,
      targetFunction,
      depth: 2,
      direction: "callees",
    });

    // Should include a, b, c (depth 2) but not d (depth 3)
    expect(graph.nodes.size).toBeLessThanOrEqual(3);
  });

  it("handles circular dependencies", () => {
    const code = `
      function a() { b(); }
      function b() { a(); }
    `;
    const program = createTestProgram({ "test.ts": code });
    const typeChecker = program.getTypeChecker();
    const targetFunction = getFunctionLocation(program, "a");

    const graph = buildCallGraph({
      program,
      typeChecker,
      targetFunction,
      depth: 5,
      direction: "callees",
    });

    // Should not infinite loop
    expect(graph.nodes.size).toBe(2);
  });
});
```

### 5. Visualizer Tests

```typescript
// tests/unit/visualizer/mermaid.test.ts
import { describe, it, expect } from "vitest";
import { generateMermaidDiagram } from "../../../src/visualizer/mermaid";
import { createTestGraph } from "../../test-utils";

describe("Mermaid Generator", () => {
  it("generates valid Mermaid syntax", () => {
    const graph = createTestGraph();
    const mermaid = generateMermaidDiagram(graph);

    expect(mermaid).toContain("graph TD");
    expect(mermaid).toContain("-->");
  });

  it("sanitizes node IDs", () => {
    const graph = createTestGraph({
      nodes: ["my-function", "another.function"],
    });
    const mermaid = generateMermaidDiagram(graph);

    expect(mermaid).not.toContain("my-function[");
    expect(mermaid).toContain("my_function[");
  });

  it("highlights target node", () => {
    const graph = createTestGraph();
    const mermaid = generateMermaidDiagram(graph);

    expect(mermaid).toMatch(/style.*fill:#f9f/);
  });
});
```

## Integration Tests

### 1. End-to-End Analysis

```typescript
// tests/integration/end-to-end.test.ts
import { describe, it, expect } from "vitest";
import { analyzeCallGraph } from "../../src/analyzer/typescript-analyzer";
import path from "path";

describe("End-to-End Analysis", () => {
  it("analyzes real codebase", async () => {
    const projectRoot = path.join(__dirname, "../fixtures/typescript");

    const graph = await analyzeCallGraph({
      functionName: "main",
      projectRoot,
      depth: 2,
      direction: "both",
    });

    expect(graph.nodes.size).toBeGreaterThan(0);
    expect(graph.edges.length).toBeGreaterThan(0);
  });

  it("handles TypeScript features", async () => {
    const projectRoot = path.join(__dirname, "../fixtures/typescript");

    const graph = await analyzeCallGraph({
      functionName: "genericFunction",
      projectRoot,
      depth: 2,
      direction: "callees",
    });

    expect(graph).toBeDefined();
  });

  it("throws error for non-existent function", async () => {
    const projectRoot = path.join(__dirname, "../fixtures/simple");

    await expect(
      analyzeCallGraph({
        functionName: "nonExistent",
        projectRoot,
        depth: 2,
        direction: "both",
      }),
    ).rejects.toThrow();
  });
});
```

### 2. MCP Server Integration

```typescript
// tests/integration/mcp-server.test.ts
import { describe, it, expect } from "vitest";
import { createServer } from "../../src/mcp/server";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

describe("MCP Server", () => {
  it("lists available tools", async () => {
    const server = await createServer();

    // Mock transport
    const transport = {
      start: async () => {},
      close: async () => {},
      send: async (message: any) => {},
    };

    await server.connect(transport as any);

    // Send tools/list request
    const response = await server.request({ method: "tools/list" }, {});

    expect(response.tools).toBeDefined();
    expect(response.tools.length).toBeGreaterThan(0);
  });
});
```

## Test Fixtures

### Simple Fixture

```typescript
// tests/fixtures/simple/index.ts
function main() {
  processData();
  cleanup();
}

function processData() {
  const data = fetchData();
  transformData(data);
}

function fetchData() {
  return { id: 1, name: "test" };
}

function transformData(data: any) {
  return data;
}

function cleanup() {
  console.log("Done");
}
```

### Complex Fixture (with cycles)

```typescript
// tests/fixtures/complex/index.ts
function a() {
  b();
  c();
}

function b() {
  c();
  a(); // Circular
}

function c() {
  d();
}

function d() {}
```

## Test Utilities

```typescript
// tests/test-utils.ts
import ts from "typescript";

export function createTestProgram(files: Record<string, string>): ts.Program {
  const compilerHost: ts.CompilerHost = {
    getSourceFile: (fileName) => {
      const content = files[fileName];
      if (!content) return undefined;
      return ts.createSourceFile(fileName, content, ts.ScriptTarget.Latest);
    },
    writeFile: () => {},
    getCurrentDirectory: () => "",
    getDirectories: () => [],
    fileExists: (fileName) => fileName in files,
    readFile: (fileName) => files[fileName],
    getCanonicalFileName: (fileName) => fileName,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => "\n",
  };

  return ts.createProgram(Object.keys(files), {}, compilerHost);
}

export function getFunctionNode(
  program: ts.Program,
  functionName: string,
): ts.Node {
  for (const sourceFile of program.getSourceFiles()) {
    const node = findFunctionInNode(sourceFile, functionName);
    if (node) return node;
  }
  throw new Error(`Function ${functionName} not found`);
}

function findFunctionInNode(node: ts.Node, name: string): ts.Node | null {
  if (ts.isFunctionDeclaration(node) && node.name?.text === name) {
    return node;
  }
  let found: ts.Node | null = null;
  ts.forEachChild(node, (child) => {
    if (!found) found = findFunctionInNode(child, name);
  });
  return found;
}

export function createTestGraph(options = {}): CallGraph {
  // Create minimal test graph
  const nodes = new Map();
  nodes.set("a", {
    name: "a",
    location: { file: "test.ts", line: 1, column: 1 },
    kind: "function",
  });
  nodes.set("b", {
    name: "b",
    location: { file: "test.ts", line: 5, column: 1 },
    kind: "function",
  });

  return {
    targetNode: nodes.get("a"),
    nodes,
    edges: [{ from: "a", to: "b", location: { file: "test.ts", line: 2 } }],
    callers: [],
    callees: ["b"],
    ...options,
  };
}
```

## Coverage Goals

- **Unit Tests:** >90% coverage
- **Integration Tests:** All major workflows
- **Edge Cases:** All known edge cases covered

## Continuous Integration

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "20"
      - run: npm install
      - run: npm test
      - run: npm run coverage
```

## Manual Testing with Claude Code

1. Build the project: `npm run build`
2. Add to Claude Code config
3. Test with various codebases:
   - Small projects
   - Large projects
   - Different TS/JS versions
4. Verify output quality
5. Check performance

## Performance Benchmarks

```typescript
// tests/benchmarks/performance.test.ts
import { describe, it, expect } from "vitest";
import { analyzeCallGraph } from "../../src/analyzer/typescript-analyzer";

describe("Performance", () => {
  it("analyzes small project quickly", async () => {
    const start = Date.now();
    await analyzeCallGraph({
      functionName: "main",
      projectRoot: "./fixtures/small",
      depth: 2,
      direction: "both",
    });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(500); // 500ms
  });
});
```
