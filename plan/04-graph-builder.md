# Call Graph Builder Implementation Plan

## Overview

The graph builder takes analysis results from the TypeScript analyzer and constructs a directed graph representing function call relationships.

## Data Structure

### Graph Representation

```typescript
// src/graph/types.ts

export interface FunctionNode {
  name: string;
  location: {
    file: string;
    line: number;
    column: number;
  };
  kind: "function" | "method" | "arrow" | "expression";
}

export interface CallEdge {
  from: string; // caller function name
  to: string; // callee function name
  location: {
    // where the call happens
    file: string;
    line: number;
  };
}

export interface CallGraph {
  targetNode: FunctionNode; // The function we're analyzing
  nodes: Map<string, FunctionNode>;
  edges: CallEdge[];
  callers: string[]; // Functions that call targetNode
  callees: string[]; // Functions called by targetNode
}
```

## Algorithm

### 1. Build Graph for "callees" (functions called BY target)

```typescript
// src/graph/builder.ts
import ts from "typescript";
import { findCallsInFunction } from "../analyzer/call-analyzer.js";
import { findFunction } from "../analyzer/function-finder.js";
import { CallGraph, FunctionNode, CallEdge } from "./types.js";

export interface BuildGraphOptions {
  program: ts.Program;
  typeChecker: ts.TypeChecker;
  targetFunction: {
    name: string;
    node: ts.Node;
    filePath: string;
  };
  depth: number;
  direction: "callers" | "callees" | "both";
}

export function buildCallGraph(options: BuildGraphOptions): CallGraph {
  const { program, typeChecker, targetFunction, depth, direction } = options;

  const nodes = new Map<string, FunctionNode>();
  const edges: CallEdge[] = [];
  const visited = new Set<string>();

  // Add target node
  const targetNode: FunctionNode = {
    name: targetFunction.name,
    location: {
      file: targetFunction.filePath,
      line: 0, // Will be set properly
      column: 0,
    },
    kind: "function",
  };
  nodes.set(targetFunction.name, targetNode);

  // Build callees graph
  if (direction === "callees" || direction === "both") {
    buildCallees(targetFunction.name, targetFunction.node, 0);
  }

  // Build callers graph
  let callers: string[] = [];
  if (direction === "callers" || direction === "both") {
    callers = findCallers(program, typeChecker, targetFunction.name, depth);
    for (const caller of callers) {
      edges.push({
        from: caller,
        to: targetFunction.name,
        location: { file: "", line: 0 }, // Simplified
      });
    }
  }

  return {
    targetNode,
    nodes,
    edges,
    callers,
    callees: Array.from(nodes.keys()).filter((n) => n !== targetFunction.name),
  };

  function buildCallees(
    functionName: string,
    functionNode: ts.Node,
    currentDepth: number,
  ) {
    if (currentDepth >= depth) return;
    if (visited.has(functionName)) return; // Avoid cycles
    visited.add(functionName);

    const sourceFile = functionNode.getSourceFile();
    const calls = findCallsInFunction(functionNode, sourceFile, typeChecker);

    for (const call of calls) {
      const calleeName = call.calleeName;

      // Add edge
      edges.push({
        from: functionName,
        to: calleeName,
        location: {
          file: call.location.file,
          line: call.location.line,
        },
      });

      // Add node if not exists
      if (!nodes.has(calleeName)) {
        nodes.set(calleeName, {
          name: calleeName,
          location: call.location,
          kind: "function", // Simplified
        });
      }

      // Recursively analyze callee
      const calleeLocations = findFunction(program, calleeName);
      if (calleeLocations.length > 0) {
        buildCallees(calleeName, calleeLocations[0].node, currentDepth + 1);
      }
    }
  }
}
```

### 2. Find Callers (Reverse Lookup)

```typescript
// src/graph/callers-finder.ts
import ts from "typescript";
import { findCallsInFunction } from "../analyzer/call-analyzer.js";

export function findCallers(
  program: ts.Program,
  typeChecker: ts.TypeChecker,
  targetFunctionName: string,
  maxDepth: number,
): string[] {
  const callers = new Set<string>();
  const sourceFiles = program
    .getSourceFiles()
    .filter((sf) => !sf.isDeclarationFile);

  for (const sourceFile of sourceFiles) {
    visitNode(sourceFile);
  }

  return Array.from(callers);

  function visitNode(node: ts.Node) {
    // Check if this is a function
    const functionName = getFunctionName(node);
    if (functionName) {
      // Check if this function calls our target
      const calls = findCallsInFunction(
        node,
        node.getSourceFile(),
        typeChecker,
      );
      const callsTarget = calls.some(
        (call) => call.calleeName === targetFunctionName,
      );

      if (callsTarget) {
        callers.add(functionName);
      }
    }

    ts.forEachChild(node, visitNode);
  }

  function getFunctionName(node: ts.Node): string | null {
    if (ts.isFunctionDeclaration(node) && node.name) {
      return node.name.text;
    }
    if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
      return node.name.text;
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      if (
        node.initializer &&
        (ts.isArrowFunction(node.initializer) ||
          ts.isFunctionExpression(node.initializer))
      ) {
        return node.name.text;
      }
    }
    return null;
  }
}
```

### 3. Graph Traversal

```typescript
// src/graph/traverser.ts
import { CallGraph, FunctionNode } from "./types.js";

export function getSubgraph(
  graph: CallGraph,
  rootNode: string,
  maxDepth: number,
): CallGraph {
  const subgraphNodes = new Map<string, FunctionNode>();
  const subgraphEdges = [];
  const visited = new Set<string>();

  traverse(rootNode, 0);

  return {
    ...graph,
    nodes: subgraphNodes,
    edges: subgraphEdges,
  };

  function traverse(nodeName: string, depth: number) {
    if (depth > maxDepth) return;
    if (visited.has(nodeName)) return;
    visited.add(nodeName);

    const node = graph.nodes.get(nodeName);
    if (node) {
      subgraphNodes.set(nodeName, node);
    }

    // Get outgoing edges
    const outgoing = graph.edges.filter((e) => e.from === nodeName);
    for (const edge of outgoing) {
      subgraphEdges.push(edge);
      traverse(edge.to, depth + 1);
    }
  }
}

export function findPath(
  graph: CallGraph,
  from: string,
  to: string,
): string[] | null {
  const visited = new Set<string>();
  const path: string[] = [];

  function dfs(current: string): boolean {
    if (current === to) {
      path.push(current);
      return true;
    }

    if (visited.has(current)) return false;
    visited.add(current);
    path.push(current);

    const neighbors = graph.edges
      .filter((e) => e.from === current)
      .map((e) => e.to);

    for (const neighbor of neighbors) {
      if (dfs(neighbor)) return true;
    }

    path.pop();
    return false;
  }

  return dfs(from) ? path : null;
}
```

## Cycle Detection

```typescript
// src/graph/cycle-detector.ts
import { CallGraph } from "./types.js";

export function detectCycles(graph: CallGraph): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  for (const [nodeName] of graph.nodes) {
    if (!visited.has(nodeName)) {
      dfs(nodeName, []);
    }
  }

  return cycles;

  function dfs(node: string, path: string[]) {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const neighbors = graph.edges
      .filter((e) => e.from === node)
      .map((e) => e.to);

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path]);
      } else if (recursionStack.has(neighbor)) {
        // Cycle detected
        const cycleStart = path.indexOf(neighbor);
        const cycle = path.slice(cycleStart);
        cycle.push(neighbor);
        cycles.push(cycle);
      }
    }

    recursionStack.delete(node);
  }
}
```

## Graph Statistics

```typescript
// src/graph/statistics.ts
import { CallGraph } from "./types.js";

export interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  maxDepth: number;
  averageDegree: number;
  hasCycles: boolean;
}

export function calculateStats(graph: CallGraph): GraphStats {
  const degrees = new Map<string, number>();

  for (const edge of graph.edges) {
    degrees.set(edge.from, (degrees.get(edge.from) || 0) + 1);
  }

  const totalDegree = Array.from(degrees.values()).reduce((a, b) => a + b, 0);
  const averageDegree = degrees.size > 0 ? totalDegree / degrees.size : 0;

  return {
    totalNodes: graph.nodes.size,
    totalEdges: graph.edges.length,
    maxDepth: calculateMaxDepth(graph),
    averageDegree,
    hasCycles: detectCycles(graph).length > 0,
  };
}

function calculateMaxDepth(graph: CallGraph): number {
  let maxDepth = 0;
  const visited = new Set<string>();

  function dfs(node: string, depth: number) {
    if (visited.has(node)) return;
    visited.add(node);
    maxDepth = Math.max(maxDepth, depth);

    const neighbors = graph.edges
      .filter((e) => e.from === node)
      .map((e) => e.to);
    for (const neighbor of neighbors) {
      dfs(neighbor, depth + 1);
    }
  }

  dfs(graph.targetNode.name, 0);
  return maxDepth;
}
```

## Performance Considerations

### 1. Cycle Handling

- Detect cycles early to avoid infinite loops
- Mark visited nodes to prevent re-processing

### 2. Depth Limiting

- Enforce max depth strictly
- Stop traversal once limit is reached

### 3. Memory Management

- Use Set for O(1) lookup
- Prune unnecessary nodes outside depth limit

## Testing

```typescript
// tests/graph-builder.test.ts
import { describe, it, expect } from "vitest";
import { buildCallGraph } from "../src/graph/builder";

describe("buildCallGraph", () => {
  it("builds simple call graph", () => {
    // Test with fixture code
    const code = `
      function a() { b(); }
      function b() { c(); }
      function c() { }
    `;

    const graph = buildCallGraph(/* ... */);

    expect(graph.nodes.size).toBe(3);
    expect(graph.edges.length).toBe(2);
  });

  it("handles cycles", () => {
    const code = `
      function a() { b(); }
      function b() { a(); }
    `;

    const graph = buildCallGraph(/* ... */);
    const cycles = detectCycles(graph);

    expect(cycles.length).toBeGreaterThan(0);
  });

  it("respects depth limit", () => {
    const graph = buildCallGraph({ /* ... */ depth: 2 });
    const stats = calculateStats(graph);

    expect(stats.maxDepth).toBeLessThanOrEqual(2);
  });
});
```

## Next Steps

After completing the graph builder:

1. Implement visualizers (plan/05-visualizer.md)
2. Integrate all components with MCP server
3. Test end-to-end
