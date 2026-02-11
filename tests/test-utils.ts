/**
 * Test utilities for funcflow
 */

import ts from "typescript";
import type { CallGraph, FunctionNode } from "../src/graph/types.js";

/**
 * Create a TypeScript program from inline code
 */
export function createTestProgram(files: Record<string, string>): ts.Program {
  const compilerHost: ts.CompilerHost = {
    getSourceFile: (fileName) => {
      const content = files[fileName];
      if (!content) return undefined;
      return ts.createSourceFile(
        fileName,
        content,
        ts.ScriptTarget.Latest,
        true,
      );
    },
    writeFile: () => {},
    getCurrentDirectory: () => "",
    getDirectories: () => [],
    fileExists: (fileName) => fileName in files,
    readFile: (fileName) => files[fileName],
    getCanonicalFileName: (fileName) => fileName,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => "\n",
    getDefaultLibFileName: () => "lib.d.ts",
  };

  return ts.createProgram(
    Object.keys(files),
    {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
    },
    compilerHost,
  );
}

/**
 * Get a function node from a program by name
 */
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
  if (
    ts.isVariableDeclaration(node) &&
    ts.isIdentifier(node.name) &&
    node.name.text === name &&
    node.initializer &&
    (ts.isArrowFunction(node.initializer) ||
      ts.isFunctionExpression(node.initializer))
  ) {
    return node;
  }

  let found: ts.Node | null = null;
  ts.forEachChild(node, (child) => {
    if (!found) found = findFunctionInNode(child, name);
  });
  return found;
}

/**
 * Create a test call graph
 */
export function createTestGraph(
  options: Partial<{
    targetName: string;
    nodes: string[];
    edges: Array<{ from: string; to: string }>;
    callers: string[];
    callees: string[];
  }> = {},
): CallGraph {
  const {
    targetName = "target",
    callers = ["caller1"],
    callees = ["callee1"],
  } = options;

  // Default nodes include target, callers, and callees
  const defaultNodes = [targetName, ...callers, ...callees];
  const nodes = options.nodes ?? defaultNodes;

  // Ensure targetName is always in nodes
  const allNodes = nodes.includes(targetName) ? nodes : [targetName, ...nodes];

  const edges = options.edges ?? [
    ...callers.map((c) => ({ from: c, to: targetName })),
    ...callees.map((c) => ({ from: targetName, to: c })),
  ];

  const nodeMap = new Map<string, FunctionNode>();
  allNodes.forEach((name, index) => {
    nodeMap.set(name, {
      name,
      location: {
        file: "test.ts",
        line: index * 5 + 1,
        column: 1,
      },
      kind: "function",
    });
  });

  const targetNode = nodeMap.get(targetName)!;

  return {
    targetNode,
    nodes: nodeMap,
    edges: edges.map((e) => ({
      from: e.from,
      to: e.to,
      location: { file: "test.ts", line: 1 },
    })),
    callers,
    callees,
  };
}

/**
 * Assert that a string contains expected substrings
 */
export function assertContains(
  actual: string,
  expected: string[],
  message?: string,
): void {
  for (const substr of expected) {
    if (!actual.includes(substr)) {
      throw new Error(
        `${message || "Assertion failed"}: expected "${substr}" in "${actual.slice(0, 100)}..."`,
      );
    }
  }
}
