/**
 * Graph Builder - Constructs call graphs from analysis results
 */

import ts from "typescript";
import { findCallsInFunction } from "../analyzer/call-analyzer.js";
import { findFunction, FunctionLocation } from "../analyzer/function-finder.js";
import type { CallGraph, FunctionNode, CallEdge } from "./types.js";
import { logger } from "../utils/logger.js";

export interface BuildGraphOptions {
  program: ts.Program;
  typeChecker: ts.TypeChecker;
  targetFunction: FunctionLocation;
  depth: number;
  direction: "callers" | "callees" | "both";
}

/**
 * Build a call graph from a target function
 */
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
      line: targetFunction.line,
      column: targetFunction.column,
    },
    kind: targetFunction.kind,
  };
  nodes.set(targetFunction.name, targetNode);

  let callers: string[] = [];
  let callees: string[] = [];

  // Build callees graph
  if (direction === "callees" || direction === "both") {
    logger.debug(`Building callees graph with depth ${depth}`);
    callees = buildCallees(
      targetFunction.name,
      targetFunction.node,
      0,
      nodes,
      edges,
      visited,
      program,
      typeChecker,
      depth
    );
  }

  // Build callers graph
  if (direction === "callers" || direction === "both") {
    logger.debug("Finding callers");
    callers = findCallers(program, typeChecker, targetFunction.name, depth, nodes, edges);
  }

  logger.info(
    `Built graph with ${nodes.size} nodes, ${edges.length} edges, ` +
      `${callers.length} callers, ${callees.length} callees`
  );

  return {
    targetNode,
    nodes,
    edges,
    callers,
    callees,
  };
}

/**
 * Build callees graph (functions called BY the target)
 */
function buildCallees(
  functionName: string,
  functionNode: ts.Node,
  currentDepth: number,
  nodes: Map<string, FunctionNode>,
  edges: CallEdge[],
  visited: Set<string>,
  program: ts.Program,
  typeChecker: ts.TypeChecker,
  maxDepth: number
): string[] {
  const directCallees: string[] = [];

  if (currentDepth >= maxDepth) return directCallees;
  if (visited.has(functionName)) return directCallees;
  visited.add(functionName);

  const sourceFile = functionNode.getSourceFile();
  const calls = findCallsInFunction(functionNode, sourceFile, typeChecker);

  for (const call of calls) {
    const calleeName = call.calleeName;

    // Skip built-in functions and common library calls
    if (isBuiltInFunction(calleeName, call.fullExpression)) {
      continue;
    }

    // Add edge
    edges.push({
      from: functionName,
      to: calleeName,
      location: {
        file: call.location.file,
        line: call.location.line,
      },
    });

    // Track as direct callee (only for the first level from target)
    if (currentDepth === 0) {
      directCallees.push(calleeName);
    }

    // Add node if not exists
    if (!nodes.has(calleeName)) {
      nodes.set(calleeName, {
        name: calleeName,
        location: call.location,
        kind: "function",
      });
    }

    // Recursively analyze callee if we can find its definition
    const calleeLocations = findFunction(program, calleeName);
    if (calleeLocations.length > 0) {
      // Update node with actual location
      nodes.set(calleeName, {
        name: calleeName,
        location: {
          file: calleeLocations[0].filePath,
          line: calleeLocations[0].line,
          column: calleeLocations[0].column,
        },
        kind: calleeLocations[0].kind,
      });

      buildCallees(
        calleeName,
        calleeLocations[0].node,
        currentDepth + 1,
        nodes,
        edges,
        visited,
        program,
        typeChecker,
        maxDepth
      );
    }
  }

  return directCallees;
}

/**
 * Find all functions that call the target function (with depth support)
 */
function findCallers(
  program: ts.Program,
  typeChecker: ts.TypeChecker,
  targetFunctionName: string,
  maxDepth: number,
  nodes: Map<string, FunctionNode>,
  edges: CallEdge[]
): string[] {
  const directCallers: string[] = [];
  const visited = new Set<string>();
  const sourceFiles = program
    .getSourceFiles()
    .filter((sf) => !sf.isDeclarationFile && !sf.fileName.includes("node_modules"));

  // Build a map of all functions and their calls for efficient lookup
  const functionCallMap = new Map<
    string,
    { info: ReturnType<typeof getFunctionInfo>; calls: string[] }
  >();

  for (const sourceFile of sourceFiles) {
    collectFunctions(sourceFile, sourceFile);
  }

  // Find callers recursively with depth limit
  findCallersRecursive(targetFunctionName, 0, true);

  return directCallers;

  function collectFunctions(node: ts.Node, sourceFile: ts.SourceFile): void {
    const functionInfo = getFunctionInfo(node, sourceFile);
    if (functionInfo) {
      const calls = findCallsInFunction(node, sourceFile, typeChecker);
      const calleeNames = calls.map((c) => c.calleeName);
      functionCallMap.set(functionInfo.name, {
        info: functionInfo,
        calls: calleeNames,
      });
    }
    ts.forEachChild(node, (child) => collectFunctions(child, sourceFile));
  }

  function findCallersRecursive(
    funcName: string,
    currentDepth: number,
    isDirectCaller: boolean
  ): void {
    if (currentDepth >= maxDepth) return;
    if (visited.has(funcName)) return;
    visited.add(funcName);

    // Find all functions that call funcName
    for (const [callerName, data] of functionCallMap) {
      if (data.calls.includes(funcName) && callerName !== funcName) {
        // Track direct callers of the original target
        if (isDirectCaller && funcName === targetFunctionName) {
          directCallers.push(callerName);
        }

        // Add caller node
        if (!nodes.has(callerName) && data.info) {
          nodes.set(callerName, {
            name: callerName,
            location: data.info.location,
            kind: data.info.kind,
          });
        }

        // Add edge from caller to callee
        const edgeExists = edges.some((e) => e.from === callerName && e.to === funcName);
        if (!edgeExists && data.info) {
          edges.push({
            from: callerName,
            to: funcName,
            location: {
              file: data.info.location.file,
              line: data.info.location.line,
            },
          });
        }

        // Recursively find callers of this caller
        findCallersRecursive(callerName, currentDepth + 1, false);
      }
    }
  }

  function getFunctionInfo(
    node: ts.Node,
    sourceFile: ts.SourceFile
  ): {
    name: string;
    location: { file: string; line: number; column: number };
    kind: FunctionNode["kind"];
  } | null {
    if (ts.isFunctionDeclaration(node) && node.name) {
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(
        node.getStart(sourceFile)
      );
      return {
        name: node.name.text,
        location: {
          file: sourceFile.fileName,
          line: line + 1,
          column: character + 1,
        },
        kind: "function",
      };
    }
    if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(
        node.getStart(sourceFile)
      );
      return {
        name: node.name.text,
        location: {
          file: sourceFile.fileName,
          line: line + 1,
          column: character + 1,
        },
        kind: "method",
      };
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      if (
        node.initializer &&
        (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
      ) {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(
          node.getStart(sourceFile)
        );
        return {
          name: node.name.text,
          location: {
            file: sourceFile.fileName,
            line: line + 1,
            column: character + 1,
          },
          kind: ts.isArrowFunction(node.initializer) ? "arrow" : "expression",
        };
      }
    }
    return null;
  }
}

/**
 * Check if a function call is to a built-in or common library function
 * Only skip truly global built-ins that users are unlikely to redefine
 */
function isBuiltInFunction(name: string, fullExpression?: string): boolean {
  // Global functions that are definitely built-in
  const globalBuiltIns = new Set([
    "setTimeout",
    "setInterval",
    "clearTimeout",
    "clearInterval",
    "setImmediate",
    "clearImmediate",
    "require",
    "eval",
    "parseInt",
    "parseFloat",
    "isNaN",
    "isFinite",
    "encodeURI",
    "decodeURI",
    "encodeURIComponent",
    "decodeURIComponent",
  ]);

  // Check if it's a global built-in
  if (globalBuiltIns.has(name)) {
    return true;
  }

  // Check if it's a method call on a known built-in object
  if (fullExpression) {
    const builtInReceivers = [
      "console",
      "Math",
      "JSON",
      "Object",
      "Array",
      "String",
      "Number",
      "Boolean",
      "Date",
      "Promise",
      "Reflect",
      "Proxy",
      "Symbol",
      "BigInt",
      "Map",
      "Set",
      "WeakMap",
      "WeakSet",
      "RegExp",
      "Error",
      "process",
    ];

    // Check for patterns like "console.log", "Math.floor", etc.
    for (const receiver of builtInReceivers) {
      if (fullExpression.startsWith(`${receiver}.`)) {
        return true;
      }
    }
  }

  return false;
}
