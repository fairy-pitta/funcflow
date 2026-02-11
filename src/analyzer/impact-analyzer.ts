/**
 * Impact Analyzer - Analyzes the potential impact of changing a function
 *
 * Unique differentiating features:
 * - "If I change this function, what else might break?"
 * - Calculate risk score based on number of callers
 * - Show transitive impact (callers of callers)
 * - Detect circular dependencies
 * - Calculate complexity metrics (fan-in, fan-out, hotspot detection)
 */

import ts from "typescript";
import { scanProject } from "./project-scanner.js";
import { findFunction, type FunctionLocation } from "./function-finder.js";
import { findCallsInFunction } from "./call-analyzer.js";
import { logger } from "../utils/logger.js";

/**
 * Complexity metrics for a function
 */
export interface ComplexityMetrics {
  /** Number of functions that call this function (fan-in) */
  fanIn: number;
  /** Number of functions this function calls (fan-out) */
  fanOut: number;
  /** Cyclomatic complexity hint (count of branches) */
  cyclomaticComplexity: number;
  /** Whether this function is a "hotspot" (high fan-in AND fan-out) */
  isHotspot: boolean;
  /** Hotspot score (0-100) - higher means more critical */
  hotspotScore: number;
}

/**
 * Impact analysis result for a single function
 */
export interface ImpactResult {
  /** Function name */
  functionName: string;
  /** File location */
  location: {
    file: string;
    line: number;
    column: number;
  };
  /** Direct callers (functions that directly call this function) */
  directCallers: string[];
  /** Transitive callers (callers of callers, up to specified depth) */
  transitiveCallers: Map<number, string[]>;
  /** Total number of potentially affected functions */
  totalAffected: number;
  /** Risk score (0-100) - higher means more risky to change */
  riskScore: number;
  /** Risk level description */
  riskLevel: "low" | "medium" | "high" | "critical";
  /** Complexity metrics */
  complexity: ComplexityMetrics;
  /** Detected circular dependencies involving this function */
  circularDependencies: string[][];
  /** Smart suggestions for the developer */
  suggestions: SmartSuggestion[];
}

/**
 * Smart suggestion for developers
 */
export interface SmartSuggestion {
  /** Suggestion type */
  type: "warning" | "info" | "refactor";
  /** Human-readable message */
  message: string;
  /** Severity (1-5, 5 being most severe) */
  severity: number;
}

/**
 * Options for impact analysis
 */
export interface ImpactAnalysisOptions {
  /** Function name to analyze */
  functionName: string;
  /** Project root path */
  projectRoot: string;
  /** Optional specific file to search in */
  filePath?: string;
  /** Depth for transitive impact analysis (default: 3) */
  depth?: number;
  /** Include complexity metrics (default: true) */
  includeComplexity?: boolean;
}

/**
 * Analyze the impact of changing a function
 */
export async function analyzeImpact(
  options: ImpactAnalysisOptions,
): Promise<ImpactResult> {
  const {
    functionName,
    projectRoot,
    filePath,
    depth = 3,
    includeComplexity = true,
  } = options;

  logger.info(`Analyzing impact for function: ${functionName}`);

  // 1. Scan project and create program
  const projectInfo = scanProject(projectRoot);
  if (projectInfo.sourceFiles.length === 0) {
    throw new Error(`No source files found in ${projectRoot}`);
  }

  const program = ts.createProgram(
    projectInfo.sourceFiles,
    projectInfo.compilerOptions,
  );
  const typeChecker = program.getTypeChecker();

  // 2. Find target function
  const locations = findFunction(program, functionName, filePath);
  if (locations.length === 0) {
    throw new Error(
      `Function "${functionName}" not found in ${filePath || projectRoot}`,
    );
  }

  const targetLocation = locations[0];

  // 3. Build function call map for the entire project
  const { functionCallMap, callersMap } = buildProjectCallMap(
    program,
    typeChecker,
  );

  // 4. Find direct callers
  const directCallers = callersMap.get(functionName) || [];

  // 5. Find transitive callers
  const transitiveCallers = findTransitiveCallers(
    functionName,
    callersMap,
    depth,
  );

  // 6. Detect circular dependencies
  const circularDependencies = detectCircularDependencies(
    functionName,
    functionCallMap,
    callersMap,
  );

  // 7. Calculate complexity metrics
  const complexity = includeComplexity
    ? calculateComplexity(
        targetLocation,
        program,
        typeChecker,
        directCallers.length,
        functionCallMap.get(functionName)?.callees.length || 0,
      )
    : {
        fanIn: directCallers.length,
        fanOut: functionCallMap.get(functionName)?.callees.length || 0,
        cyclomaticComplexity: 0,
        isHotspot: false,
        hotspotScore: 0,
      };

  // 8. Calculate total affected functions
  const allAffected = new Set<string>(directCallers);
  for (const callers of transitiveCallers.values()) {
    callers.forEach((c) => allAffected.add(c));
  }
  const totalAffected = allAffected.size;

  // 9. Calculate risk score
  const riskScore = calculateRiskScore(
    directCallers.length,
    totalAffected,
    complexity,
    circularDependencies.length,
  );

  // 10. Determine risk level
  const riskLevel = getRiskLevel(riskScore);

  // 11. Generate smart suggestions
  const suggestions = generateSuggestions(
    functionName,
    directCallers.length,
    complexity,
    circularDependencies,
    functionCallMap.get(functionName)?.callees || [],
  );

  return {
    functionName,
    location: {
      file: targetLocation.filePath,
      line: targetLocation.line,
      column: targetLocation.column,
    },
    directCallers,
    transitiveCallers,
    totalAffected,
    riskScore,
    riskLevel,
    complexity,
    circularDependencies,
    suggestions,
  };
}

/**
 * Build a map of all function calls in the project
 */
function buildProjectCallMap(
  program: ts.Program,
  typeChecker: ts.TypeChecker,
): {
  functionCallMap: Map<string, { info: FunctionInfo; callees: string[] }>;
  callersMap: Map<string, string[]>;
} {
  const functionCallMap = new Map<
    string,
    { info: FunctionInfo; callees: string[] }
  >();
  const callersMap = new Map<string, string[]>();

  const sourceFiles = program
    .getSourceFiles()
    .filter(
      (sf) => !sf.isDeclarationFile && !sf.fileName.includes("node_modules"),
    );

  for (const sourceFile of sourceFiles) {
    collectFunctions(sourceFile, sourceFile, program, typeChecker);
  }

  // Build reverse map (callers)
  for (const [funcName, data] of functionCallMap) {
    for (const callee of data.callees) {
      if (!callersMap.has(callee)) {
        callersMap.set(callee, []);
      }
      const callers = callersMap.get(callee)!;
      if (!callers.includes(funcName)) {
        callers.push(funcName);
      }
    }
  }

  return { functionCallMap, callersMap };

  function collectFunctions(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    program: ts.Program,
    typeChecker: ts.TypeChecker,
  ): void {
    const functionInfo = getFunctionInfo(node, sourceFile);
    if (functionInfo) {
      const calls = findCallsInFunction(node, sourceFile, typeChecker);
      const calleeNames = [
        ...new Set(calls.map((c) => c.calleeName).filter((n) => !isBuiltIn(n))),
      ];
      functionCallMap.set(functionInfo.name, {
        info: functionInfo,
        callees: calleeNames,
      });
    }
    ts.forEachChild(node, (child) =>
      collectFunctions(child, sourceFile, program, typeChecker),
    );
  }
}

interface FunctionInfo {
  name: string;
  location: { file: string; line: number; column: number };
  kind: "function" | "method" | "arrow" | "expression";
}

function getFunctionInfo(
  node: ts.Node,
  sourceFile: ts.SourceFile,
): FunctionInfo | null {
  if (ts.isFunctionDeclaration(node) && node.name) {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(
      node.getStart(sourceFile),
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
      node.getStart(sourceFile),
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
      (ts.isArrowFunction(node.initializer) ||
        ts.isFunctionExpression(node.initializer))
    ) {
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(
        node.getStart(sourceFile),
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

/**
 * Find transitive callers (callers of callers) up to specified depth
 */
function findTransitiveCallers(
  functionName: string,
  callersMap: Map<string, string[]>,
  maxDepth: number,
): Map<number, string[]> {
  const result = new Map<number, string[]>();
  const visited = new Set<string>([functionName]);
  let currentLevel = callersMap.get(functionName) || [];

  for (let depth = 1; depth <= maxDepth; depth++) {
    const nextLevel: string[] = [];

    for (const caller of currentLevel) {
      if (!visited.has(caller)) {
        visited.add(caller);
        if (!result.has(depth)) {
          result.set(depth, []);
        }
        result.get(depth)!.push(caller);

        // Get callers of this caller for next level
        const callerCallers = callersMap.get(caller) || [];
        nextLevel.push(...callerCallers.filter((c) => !visited.has(c)));
      }
    }

    currentLevel = nextLevel;
  }

  return result;
}

/**
 * Detect circular dependencies involving the target function
 */
function detectCircularDependencies(
  functionName: string,
  functionCallMap: Map<string, { info: FunctionInfo; callees: string[] }>,
  callersMap: Map<string, string[]>,
): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const path: string[] = [];

  function dfs(current: string): void {
    if (path.includes(current)) {
      // Found a cycle
      const cycleStart = path.indexOf(current);
      const cycle = [...path.slice(cycleStart), current];

      // Only include cycles that involve the target function
      if (cycle.includes(functionName)) {
        // Check if we already have this cycle (in any rotation)
        const cycleSet = new Set(cycle);
        const isDuplicate = cycles.some(
          (existing) =>
            existing.length === cycle.length &&
            existing.every((f) => cycleSet.has(f)),
        );
        if (!isDuplicate) {
          cycles.push(cycle);
        }
      }
      return;
    }

    if (visited.has(current)) return;
    visited.add(current);
    path.push(current);

    const callees = functionCallMap.get(current)?.callees || [];
    for (const callee of callees) {
      dfs(callee);
    }

    path.pop();
  }

  // Start DFS from target function and its callers
  const startPoints = [functionName, ...(callersMap.get(functionName) || [])];

  for (const start of startPoints) {
    visited.clear();
    path.length = 0;
    dfs(start);
  }

  return cycles;
}

/**
 * Calculate cyclomatic complexity of a function
 * Counts: if, else if, case, for, while, do, catch, &&, ||, ?, nullish
 */
function calculateCyclomaticComplexity(node: ts.Node): number {
  let complexity = 1; // Base complexity

  function visit(n: ts.Node): void {
    if (
      ts.isIfStatement(n) ||
      ts.isConditionalExpression(n) || // ternary
      ts.isForStatement(n) ||
      ts.isForInStatement(n) ||
      ts.isForOfStatement(n) ||
      ts.isWhileStatement(n) ||
      ts.isDoStatement(n) ||
      ts.isCatchClause(n) ||
      ts.isCaseClause(n)
    ) {
      complexity++;
    }

    if (ts.isBinaryExpression(n)) {
      if (
        n.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
        n.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
        n.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
      ) {
        complexity++;
      }
    }

    ts.forEachChild(n, visit);
  }

  visit(node);
  return complexity;
}

/**
 * Calculate complexity metrics for a function
 */
function calculateComplexity(
  location: FunctionLocation,
  _program: ts.Program,
  _typeChecker: ts.TypeChecker,
  fanIn: number,
  fanOut: number,
): ComplexityMetrics {
  const cyclomaticComplexity = calculateCyclomaticComplexity(location.node);

  // Hotspot detection: functions with both high fan-in AND high fan-out
  // These are "junction" functions that are risky to change
  const fanInThreshold = 5;
  const fanOutThreshold = 5;
  const isHotspot = fanIn >= fanInThreshold && fanOut >= fanOutThreshold;

  // Hotspot score: weighted combination of fan-in, fan-out, and complexity
  const hotspotScore = Math.min(
    100,
    Math.round(
      (fanIn * 3 + fanOut * 2 + cyclomaticComplexity * 2) *
        (isHotspot ? 1.5 : 1),
    ),
  );

  return {
    fanIn,
    fanOut,
    cyclomaticComplexity,
    isHotspot,
    hotspotScore,
  };
}

/**
 * Calculate overall risk score for changing the function
 */
function calculateRiskScore(
  directCallers: number,
  totalAffected: number,
  complexity: ComplexityMetrics,
  circularDeps: number,
): number {
  // Weighted risk factors
  const callerWeight = 2;
  const transitiveWeight = 1;
  const hotspotWeight = 15;
  const circularWeight = 10;
  const complexityWeight = 1;

  const score =
    directCallers * callerWeight +
    (totalAffected - directCallers) * transitiveWeight +
    (complexity.isHotspot ? hotspotWeight : 0) +
    circularDeps * circularWeight +
    Math.floor(complexity.cyclomaticComplexity / 5) * complexityWeight;

  return Math.min(100, score);
}

/**
 * Get risk level description based on score
 */
function getRiskLevel(score: number): "low" | "medium" | "high" | "critical" {
  if (score < 10) return "low";
  if (score < 30) return "medium";
  if (score < 60) return "high";
  return "critical";
}

/**
 * Generate smart suggestions based on analysis results
 */
function generateSuggestions(
  functionName: string,
  callerCount: number,
  complexity: ComplexityMetrics,
  circularDeps: string[][],
  callees: string[],
): SmartSuggestion[] {
  const suggestions: SmartSuggestion[] = [];

  // High caller count warning
  if (callerCount >= 10) {
    suggestions.push({
      type: "warning",
      message: `This function has ${callerCount} callers - consider if changes are safe and plan thorough testing`,
      severity: 4,
    });
  } else if (callerCount >= 5) {
    suggestions.push({
      type: "info",
      message: `This function has ${callerCount} callers - changes may have moderate impact`,
      severity: 2,
    });
  }

  // Circular dependency warning
  for (const cycle of circularDeps) {
    const cycleStr = cycle.join(" -> ");
    suggestions.push({
      type: "warning",
      message: `Circular dependency detected: ${cycleStr}`,
      severity: 5,
    });
  }

  // High fan-out suggestion
  if (callees.length >= 15) {
    suggestions.push({
      type: "refactor",
      message: `This function calls ${callees.length} others - consider breaking it up into smaller functions`,
      severity: 3,
    });
  } else if (callees.length >= 10) {
    suggestions.push({
      type: "info",
      message: `This function calls ${callees.length} other functions - consider if it has too many responsibilities`,
      severity: 2,
    });
  }

  // Hotspot warning
  if (complexity.isHotspot) {
    suggestions.push({
      type: "warning",
      message: `"${functionName}" is a hotspot (high fan-in AND fan-out) - changes here are high-risk`,
      severity: 5,
    });
  }

  // High cyclomatic complexity
  if (complexity.cyclomaticComplexity >= 15) {
    suggestions.push({
      type: "refactor",
      message: `High cyclomatic complexity (${complexity.cyclomaticComplexity}) - consider simplifying the logic`,
      severity: 3,
    });
  } else if (complexity.cyclomaticComplexity >= 10) {
    suggestions.push({
      type: "info",
      message: `Moderate cyclomatic complexity (${complexity.cyclomaticComplexity}) - function has many decision paths`,
      severity: 2,
    });
  }

  // Sort by severity (highest first)
  suggestions.sort((a, b) => b.severity - a.severity);

  return suggestions;
}

/**
 * Check if a function name is a built-in
 */
function isBuiltIn(name: string): boolean {
  const builtIns = new Set([
    "console",
    "log",
    "error",
    "warn",
    "info",
    "debug",
    "setTimeout",
    "setInterval",
    "clearTimeout",
    "clearInterval",
    "parseInt",
    "parseFloat",
    "JSON",
    "parse",
    "stringify",
    "require",
    "map",
    "filter",
    "reduce",
    "forEach",
    "push",
    "pop",
    "shift",
    "unshift",
    "slice",
    "splice",
    "join",
    "split",
    "toString",
    "valueOf",
  ]);
  return builtIns.has(name);
}

/**
 * Format impact result as a human-readable report
 */
export function formatImpactReport(result: ImpactResult): string {
  const lines: string[] = [];

  // Header
  lines.push(`## Impact Analysis: \`${result.functionName}\``);
  lines.push("");

  // Location
  const shortPath = result.location.file.split("/").slice(-2).join("/");
  lines.push(`**Location:** ${shortPath}:${result.location.line}`);
  lines.push("");

  // Risk Assessment
  const riskEmoji =
    result.riskLevel === "critical"
      ? "[CRITICAL]"
      : result.riskLevel === "high"
        ? "[HIGH]"
        : result.riskLevel === "medium"
          ? "[MEDIUM]"
          : "[LOW]";
  lines.push(`### Risk Assessment`);
  lines.push("");
  lines.push(`- **Risk Score:** ${result.riskScore}/100 ${riskEmoji}`);
  lines.push(`- **Risk Level:** ${result.riskLevel.toUpperCase()}`);
  lines.push(
    `- **Total Functions Potentially Affected:** ${result.totalAffected}`,
  );
  lines.push("");

  // Direct Callers
  lines.push(`### Direct Callers (${result.directCallers.length})`);
  lines.push("");
  if (result.directCallers.length === 0) {
    lines.push("_No direct callers found (this may be an entry point)_");
  } else {
    const maxShow = 10;
    const toShow = result.directCallers.slice(0, maxShow);
    for (const caller of toShow) {
      lines.push(`- \`${caller}\``);
    }
    if (result.directCallers.length > maxShow) {
      lines.push(`- _...and ${result.directCallers.length - maxShow} more_`);
    }
  }
  lines.push("");

  // Transitive Impact
  if (result.transitiveCallers.size > 0) {
    lines.push(`### Transitive Impact`);
    lines.push("");
    for (const [depth, callers] of result.transitiveCallers) {
      lines.push(`**Level ${depth}:** ${callers.length} function(s)`);
      const toShow = callers.slice(0, 5);
      for (const caller of toShow) {
        lines.push(`  - \`${caller}\``);
      }
      if (callers.length > 5) {
        lines.push(`  - _...and ${callers.length - 5} more_`);
      }
    }
    lines.push("");
  }

  // Complexity Metrics
  lines.push(`### Complexity Metrics`);
  lines.push("");
  lines.push(`- **Fan-In (callers):** ${result.complexity.fanIn}`);
  lines.push(`- **Fan-Out (callees):** ${result.complexity.fanOut}`);
  lines.push(
    `- **Cyclomatic Complexity:** ${result.complexity.cyclomaticComplexity}`,
  );
  lines.push(
    `- **Hotspot:** ${result.complexity.isHotspot ? "Yes - High Risk" : "No"}`,
  );
  lines.push(`- **Hotspot Score:** ${result.complexity.hotspotScore}/100`);
  lines.push("");

  // Circular Dependencies
  if (result.circularDependencies.length > 0) {
    lines.push(`### Circular Dependencies Detected`);
    lines.push("");
    for (const cycle of result.circularDependencies) {
      lines.push(`- ${cycle.join(" -> ")}`);
    }
    lines.push("");
  }

  // Smart Suggestions
  if (result.suggestions.length > 0) {
    lines.push(`### Suggestions`);
    lines.push("");
    for (const suggestion of result.suggestions) {
      const prefix =
        suggestion.type === "warning"
          ? "[!]"
          : suggestion.type === "refactor"
            ? "[R]"
            : "[i]";
      lines.push(`${prefix} ${suggestion.message}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
