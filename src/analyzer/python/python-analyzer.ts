/**
 * Main Python Analyzer
 * Entry point for Python call graph analysis
 */

import { scanPythonProject } from "./python-scanner.js";
import {
  parsePythonFile,
  findCallsInPythonFunction,
  isPythonBuiltIn,
  type PythonParseResult,
  type PythonFunctionLocation,
  type PythonCallInfo,
} from "./python-parser.js";
import type { CallGraph, FunctionNode, CallEdge } from "../../graph/types.js";
import { logger } from "../../utils/logger.js";

export interface PythonAnalyzeOptions {
  /** Name of the function to analyze */
  functionName: string;
  /** Absolute path to project root */
  projectRoot: string;
  /** Optional: specific file path to search in */
  filePath?: string;
  /** How many levels deep to traverse (default: 2) */
  depth: number;
  /** Direction to analyze: callers, callees, or both */
  direction: "callers" | "callees" | "both";
}

/**
 * Analyze call graph for a Python function
 */
export async function analyzePythonCallGraph(
  options: PythonAnalyzeOptions,
): Promise<CallGraph> {
  const { functionName, projectRoot, filePath, depth, direction } = options;

  logger.info(`Analyzing Python function: ${functionName}`);
  logger.debug(`Project root: ${projectRoot}`);
  logger.debug(`Depth: ${depth}, Direction: ${direction}`);

  // 1. Scan project for Python files
  const projectInfo = scanPythonProject(projectRoot);

  if (projectInfo.sourceFiles.length === 0) {
    throw new Error(`No Python source files found in ${projectRoot}`);
  }

  // 2. Parse all Python files
  const parseResults = new Map<string, PythonParseResult>();
  for (const sourceFile of projectInfo.sourceFiles) {
    try {
      const result = parsePythonFile(sourceFile);
      parseResults.set(sourceFile, result);
    } catch (error) {
      logger.warn(`Error parsing ${sourceFile}: ${error}`);
    }
  }

  // 3. Find target function
  const locations = findPythonFunctionLocations(
    parseResults,
    functionName,
    filePath,
  );

  if (locations.length === 0) {
    const searchScope = filePath || projectRoot;
    throw new Error(
      `Function "${functionName}" not found in ${searchScope}. ` +
        `Searched ${projectInfo.sourceFiles.length} files.`,
    );
  }

  logger.info(`Found ${locations.length} definition(s) of "${functionName}"`);

  // Use the first location
  const targetLocation = locations[0];

  logger.debug(
    `Using definition at: ${targetLocation.filePath}:${targetLocation.line}`,
  );

  // 4. Build call graph
  const graph = buildPythonCallGraph({
    parseResults,
    targetFunction: targetLocation,
    depth,
    direction,
  });

  return graph;
}

/**
 * Find all definitions of a Python function
 */
export async function findPythonFunctionDefinitions(
  projectRoot: string,
  functionName: string,
  filePath?: string,
): Promise<
  Array<{
    file: string;
    line: number;
    column: number;
    kind: string;
  }>
> {
  const projectInfo = scanPythonProject(projectRoot);
  const parseResults = new Map<string, PythonParseResult>();

  for (const sourceFile of projectInfo.sourceFiles) {
    try {
      const result = parsePythonFile(sourceFile);
      parseResults.set(sourceFile, result);
    } catch (error) {
      logger.warn(`Error parsing ${sourceFile}: ${error}`);
    }
  }

  const locations = findPythonFunctionLocations(
    parseResults,
    functionName,
    filePath,
  );

  return locations.map((loc) => ({
    file: loc.filePath,
    line: loc.line,
    column: loc.column,
    kind: loc.kind,
  }));
}

/**
 * Find function locations from parse results
 */
function findPythonFunctionLocations(
  parseResults: Map<string, PythonParseResult>,
  functionName: string,
  filePath?: string,
): PythonFunctionLocation[] {
  const results: PythonFunctionLocation[] = [];

  for (const [file, parseResult] of parseResults) {
    if (filePath && file !== filePath) continue;

    for (const func of parseResult.functions) {
      if (func.name === functionName) {
        results.push(func);
      }
    }
  }

  return results;
}

interface BuildPythonGraphOptions {
  parseResults: Map<string, PythonParseResult>;
  targetFunction: PythonFunctionLocation;
  depth: number;
  direction: "callers" | "callees" | "both";
}

/**
 * Build a Python call graph
 */
function buildPythonCallGraph(options: BuildPythonGraphOptions): CallGraph {
  const { parseResults, targetFunction, depth, direction } = options;

  const nodes = new Map<string, FunctionNode>();
  const edges: CallEdge[] = [];
  const visited = new Set<string>();

  // Convert Python kind to graph kind
  const graphKind = convertKind(targetFunction.kind);

  // Add target node
  const targetNode: FunctionNode = {
    name: targetFunction.name,
    location: {
      file: targetFunction.filePath,
      line: targetFunction.line,
      column: targetFunction.column,
    },
    kind: graphKind,
  };
  nodes.set(targetFunction.name, targetNode);

  let callers: string[] = [];
  let callees: string[] = [];

  // Build callees graph
  if (direction === "callees" || direction === "both") {
    logger.debug(`Building callees graph with depth ${depth}`);
    callees = buildPythonCallees(
      targetFunction,
      0,
      nodes,
      edges,
      visited,
      parseResults,
      depth,
    );
  }

  // Build callers graph
  if (direction === "callers" || direction === "both") {
    logger.debug("Finding callers");
    callers = findPythonCallers(
      parseResults,
      targetFunction.name,
      depth,
      nodes,
      edges,
    );
  }

  logger.info(
    `Built graph with ${nodes.size} nodes, ${edges.length} edges, ` +
      `${callers.length} callers, ${callees.length} callees`,
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
 * Build callees graph for Python
 */
function buildPythonCallees(
  func: PythonFunctionLocation,
  currentDepth: number,
  nodes: Map<string, FunctionNode>,
  edges: CallEdge[],
  visited: Set<string>,
  parseResults: Map<string, PythonParseResult>,
  maxDepth: number,
): string[] {
  const directCallees: string[] = [];

  if (currentDepth >= maxDepth) return directCallees;

  const funcKey = `${func.filePath}:${func.name}`;
  if (visited.has(funcKey)) return directCallees;
  visited.add(funcKey);

  const calls = findCallsInPythonFunction(func);

  for (const call of calls) {
    const calleeName = call.calleeName;

    // Skip built-in functions
    if (isPythonBuiltIn(calleeName, call.fullExpression)) {
      continue;
    }

    // Add edge
    edges.push({
      from: func.name,
      to: calleeName,
      location: {
        file: call.location.file,
        line: call.location.line,
      },
    });

    // Track as direct callee (only for first level from target)
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
    const calleeLocations = findPythonFunctionLocations(
      parseResults,
      calleeName,
    );
    if (calleeLocations.length > 0) {
      const calleeLoc = calleeLocations[0];
      // Update node with actual location
      nodes.set(calleeName, {
        name: calleeName,
        location: {
          file: calleeLoc.filePath,
          line: calleeLoc.line,
          column: calleeLoc.column,
        },
        kind: convertKind(calleeLoc.kind),
      });

      buildPythonCallees(
        calleeLoc,
        currentDepth + 1,
        nodes,
        edges,
        visited,
        parseResults,
        maxDepth,
      );
    }
  }

  return directCallees;
}

/**
 * Find all Python functions that call the target function
 */
function findPythonCallers(
  parseResults: Map<string, PythonParseResult>,
  targetFunctionName: string,
  maxDepth: number,
  nodes: Map<string, FunctionNode>,
  edges: CallEdge[],
): string[] {
  const directCallers: string[] = [];
  const visited = new Set<string>();

  // Build a map of all functions and their calls
  const functionCallMap = new Map<
    string,
    { func: PythonFunctionLocation; calls: PythonCallInfo[] }
  >();

  for (const [_filePath, parseResult] of parseResults) {
    for (const func of parseResult.functions) {
      const calls = findCallsInPythonFunction(func);
      functionCallMap.set(`${func.filePath}:${func.name}`, { func, calls });
    }
  }

  // Find callers recursively
  findCallersRecursive(targetFunctionName, 0, true);

  return directCallers;

  function findCallersRecursive(
    funcName: string,
    currentDepth: number,
    isDirectCaller: boolean,
  ): void {
    if (currentDepth >= maxDepth) return;
    if (visited.has(funcName)) return;
    visited.add(funcName);

    // Find all functions that call funcName
    for (const [_key, data] of functionCallMap) {
      const callsTarget = data.calls.some((c) => c.calleeName === funcName);
      if (callsTarget && data.func.name !== funcName) {
        const callerName = data.func.name;

        // Track direct callers of the original target
        if (isDirectCaller && funcName === targetFunctionName) {
          directCallers.push(callerName);
        }

        // Add caller node
        if (!nodes.has(callerName)) {
          nodes.set(callerName, {
            name: callerName,
            location: {
              file: data.func.filePath,
              line: data.func.line,
              column: data.func.column,
            },
            kind: convertKind(data.func.kind),
          });
        }

        // Add edge from caller to callee
        const edgeExists = edges.some(
          (e) => e.from === callerName && e.to === funcName,
        );
        if (!edgeExists) {
          edges.push({
            from: callerName,
            to: funcName,
            location: {
              file: data.func.filePath,
              line: data.func.line,
            },
          });
        }

        // Recursively find callers of this caller
        findCallersRecursive(callerName, currentDepth + 1, false);
      }
    }
  }
}

/**
 * Convert Python function kind to graph function kind
 */
function convertKind(
  pythonKind: PythonFunctionLocation["kind"],
): FunctionNode["kind"] {
  switch (pythonKind) {
    case "function":
    case "async_function":
      return "function";
    case "method":
    case "async_method":
      return "method";
    default:
      return "function";
  }
}

// Re-export types and utilities
export {
  scanPythonProject,
  hasPythonFiles,
  type PythonProjectInfo,
} from "./python-scanner.js";

export {
  parsePythonFile,
  parsePythonContent,
  findCallsInPythonFunction,
  findPythonFunction,
  findAllPythonFunctions,
  isPythonBuiltIn,
  type PythonFunctionLocation,
  type PythonCallInfo,
  type PythonImport,
  type PythonParseResult,
  type PythonClassInfo,
} from "./python-parser.js";
