/**
 * Main Analyzer
 * Entry point for call graph analysis - supports TypeScript/JavaScript and Python
 */

import ts from "typescript";
import path from "path";
import fs from "fs";
import { scanProject } from "./project-scanner.js";
import { findFunction } from "./function-finder.js";
import { buildCallGraph } from "../graph/builder.js";
import type { CallGraph } from "../graph/types.js";
import { logger } from "../utils/logger.js";
import { ErrorMessages } from "../constants/errors.js";
import {
  analyzePythonCallGraph,
  findPythonFunctionDefinitions,
  hasPythonFiles,
} from "./python/python-analyzer.js";

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

/** Supported languages for analysis */
export type SupportedLanguage = "typescript" | "python";

/**
 * Detect the primary language of a project based on file extensions and configuration
 */
export function detectProjectLanguage(
  projectRoot: string,
  filePath?: string,
): SupportedLanguage {
  // If a specific file is provided, use its extension
  if (filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".py") {
      return "python";
    }
    if (
      [".ts", ".tsx", ".js", ".jsx", ".mts", ".cts", ".mjs", ".cjs"].includes(
        ext,
      )
    ) {
      return "typescript";
    }
  }

  // Check for language-specific configuration files
  const hasTsConfig = fs.existsSync(path.join(projectRoot, "tsconfig.json"));
  const hasPackageJson = fs.existsSync(path.join(projectRoot, "package.json"));
  const hasPyproject = fs.existsSync(path.join(projectRoot, "pyproject.toml"));
  const hasRequirements = fs.existsSync(
    path.join(projectRoot, "requirements.txt"),
  );
  const hasSetupPy = fs.existsSync(path.join(projectRoot, "setup.py"));

  // If we have TypeScript/Node config, prefer TypeScript
  if (hasTsConfig || hasPackageJson) {
    return "typescript";
  }

  // If we have Python config, use Python
  if (hasPyproject || hasRequirements || hasSetupPy) {
    return "python";
  }

  // Fallback: check for actual source files
  if (hasPythonFiles(projectRoot)) {
    return "python";
  }

  // Default to TypeScript
  return "typescript";
}

/**
 * Analyze call graph for a function
 * Automatically detects the language and uses the appropriate analyzer
 */
export async function analyzeCallGraph(
  options: AnalyzeOptions,
): Promise<CallGraph> {
  const { functionName, projectRoot, filePath, depth, direction } = options;

  // Detect project language
  const language = detectProjectLanguage(projectRoot, filePath);
  logger.info(`Detected language: ${language}`);

  // Delegate to appropriate analyzer
  if (language === "python") {
    return analyzePythonCallGraph({
      functionName,
      projectRoot,
      filePath,
      depth,
      direction,
    });
  }

  // TypeScript/JavaScript analysis
  return analyzeTypeScriptCallGraph(options);
}

/**
 * Analyze call graph for a TypeScript/JavaScript function
 */
async function analyzeTypeScriptCallGraph(
  options: AnalyzeOptions,
): Promise<CallGraph> {
  const { functionName, projectRoot, filePath, depth, direction } = options;

  logger.info(`Analyzing function: ${functionName}`);
  logger.debug(`Project root: ${projectRoot}`);
  logger.debug(`Depth: ${depth}, Direction: ${direction}`);

  // 1. Scan project
  const projectInfo = scanProject(projectRoot);

  if (projectInfo.sourceFiles.length === 0) {
    throw new Error(ErrorMessages.NO_SOURCE_FILES(projectRoot));
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
      ErrorMessages.FUNCTION_NOT_FOUND(
        functionName,
        searchScope,
        projectInfo.sourceFiles.length,
      ),
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
 * Automatically detects the language and uses the appropriate analyzer
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
  // Detect project language
  const language = detectProjectLanguage(projectRoot, filePath);

  // Delegate to appropriate finder
  if (language === "python") {
    return findPythonFunctionDefinitions(projectRoot, functionName, filePath);
  }

  // TypeScript/JavaScript
  return findTypeScriptFunctionDefinitions(projectRoot, functionName, filePath);
}

/**
 * Find all definitions of a TypeScript/JavaScript function
 */
async function findTypeScriptFunctionDefinitions(
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
