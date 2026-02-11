/**
 * Main TypeScript Analyzer
 * Entry point for call graph analysis
 */

import ts from "typescript";
import { scanProject } from "./project-scanner.js";
import { findFunction } from "./function-finder.js";
import { buildCallGraph } from "../graph/builder.js";
import type { CallGraph } from "../graph/types.js";
import { logger } from "../utils/logger.js";

export interface AnalyzeOptions {
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
 * Analyze call graph for a function
 */
export async function analyzeCallGraph(
  options: AnalyzeOptions,
): Promise<CallGraph> {
  const { functionName, projectRoot, filePath, depth, direction } = options;

  logger.info(`Analyzing function: ${functionName}`);
  logger.debug(`Project root: ${projectRoot}`);
  logger.debug(`Depth: ${depth}, Direction: ${direction}`);

  // 1. Scan project
  const projectInfo = scanProject(projectRoot);

  if (projectInfo.sourceFiles.length === 0) {
    throw new Error(`No source files found in ${projectRoot}`);
  }

  // 2. Create TypeScript program
  const program = ts.createProgram(
    projectInfo.sourceFiles,
    projectInfo.compilerOptions,
  );

  const typeChecker = program.getTypeChecker();

  // 3. Find target function
  const locations = findFunction(program, functionName, filePath);

  if (locations.length === 0) {
    // Provide helpful error message
    const searchScope = filePath || projectRoot;
    throw new Error(
      `Function "${functionName}" not found in ${searchScope}. ` +
        `Searched ${projectInfo.sourceFiles.length} files.`,
    );
  }

  logger.info(`Found ${locations.length} definition(s) of "${functionName}"`);

  // If multiple locations, use the first one
  // TODO: Could expose option to let user choose
  const targetLocation = locations[0];

  logger.debug(
    `Using definition at: ${targetLocation.filePath}:${targetLocation.line}`,
  );

  // 4. Build call graph
  const graph = buildCallGraph({
    program,
    typeChecker,
    targetFunction: targetLocation,
    depth,
    direction,
  });

  return graph;
}

/**
 * Find all definitions of a function (useful for multi-location functions)
 */
export async function findFunctionDefinitions(
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
  const projectInfo = scanProject(projectRoot);
  const program = ts.createProgram(
    projectInfo.sourceFiles,
    projectInfo.compilerOptions,
  );

  const locations = findFunction(program, functionName, filePath);

  return locations.map((loc) => ({
    file: loc.filePath,
    line: loc.line,
    column: loc.column,
    kind: loc.kind,
  }));
}
