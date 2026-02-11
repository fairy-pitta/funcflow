/**
 * JSON Exporter
 *
 * Enhanced with complexity metrics and smart suggestions
 * - Cyclomatic complexity hints
 * - Fan-in / Fan-out metrics
 * - Hotspot detection
 * - Circular dependency detection
 */

import type { CallGraph } from "../graph/types.js";

/**
 * Complexity metrics for a function
 */
export interface ComplexityMetrics {
  /** Number of functions that call this function (fan-in) */
  fanIn: number;
  /** Number of functions this function calls (fan-out) */
  fanOut: number;
  /** Whether this function is a "hotspot" (high fan-in AND fan-out) */
  isHotspot: boolean;
  /** Hotspot score (0-100) - higher means more critical */
  hotspotScore: number;
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

export interface JsonOutput {
  target: {
    name: string;
    location: {
      file: string;
      line: number;
      column: number;
    };
    kind: string;
  };
  callers: string[];
  callees: string[];
  nodes: Array<{
    name: string;
    location: {
      file: string;
      line: number;
      column: number;
    };
    kind: string;
  }>;
  edges: Array<{
    from: string;
    to: string;
    location: {
      file: string;
      line: number;
    };
  }>;
  statistics: {
    totalNodes: number;
    totalEdges: number;
    maxDepth: number;
  };
  /** Complexity metrics for the target function */
  complexity: ComplexityMetrics;
  /** Detected circular dependencies */
  circularDependencies: string[][];
  /** Smart suggestions based on analysis */
  suggestions: SmartSuggestion[];
}

/**
 * Export call graph to JSON format with complexity metrics and suggestions
 */
export function exportToJson(graph: CallGraph): string {
  const fanIn = graph.callers.length;
  const fanOut = graph.callees.length;
  const complexity = calculateComplexityMetrics(fanIn, fanOut);
  const circularDeps = detectCircularDependencies(graph);
  const suggestions = generateSmartSuggestions(
    graph.targetNode.name,
    fanIn,
    fanOut,
    circularDeps,
  );

  const output: JsonOutput = {
    target: {
      name: graph.targetNode.name,
      location: graph.targetNode.location,
      kind: graph.targetNode.kind,
    },
    callers: graph.callers,
    callees: graph.callees,
    nodes: Array.from(graph.nodes.values()).map((node) => ({
      name: node.name,
      location: node.location,
      kind: node.kind,
    })),
    edges: graph.edges.map((edge) => ({
      from: edge.from,
      to: edge.to,
      location: edge.location,
    })),
    statistics: {
      totalNodes: graph.nodes.size,
      totalEdges: graph.edges.length,
      maxDepth: calculateMaxDepth(graph),
    },
    complexity,
    circularDependencies: circularDeps,
    suggestions,
  };

  return JSON.stringify(output, null, 2);
}

/**
 * Export call graph to compact JSON (single line)
 */
export function exportToCompactJson(graph: CallGraph): string {
  const output = {
    target: graph.targetNode.name,
    callers: graph.callers,
    callees: graph.callees,
    nodeCount: graph.nodes.size,
    edgeCount: graph.edges.length,
  };

  return JSON.stringify(output);
}

/**
 * Calculate maximum depth in the graph
 */
function calculateMaxDepth(graph: CallGraph): number {
  let maxDepth = 0;
  const visited = new Set<string>();

  function dfs(node: string, depth: number): void {
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

/**
 * Calculate complexity metrics for a function
 */
function calculateComplexityMetrics(
  fanIn: number,
  fanOut: number,
): ComplexityMetrics {
  // Hotspot detection: functions with both high fan-in AND high fan-out
  // These are "junction" functions that are risky to change
  const fanInThreshold = 5;
  const fanOutThreshold = 5;
  const isHotspot = fanIn >= fanInThreshold && fanOut >= fanOutThreshold;

  // Hotspot score: weighted combination of fan-in and fan-out
  const hotspotScore = Math.min(
    100,
    Math.round((fanIn * 3 + fanOut * 2) * (isHotspot ? 1.5 : 1)),
  );

  return {
    fanIn,
    fanOut,
    isHotspot,
    hotspotScore,
  };
}

/**
 * Detect circular dependencies in the call graph
 */
function detectCircularDependencies(graph: CallGraph): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const path: string[] = [];
  const targetName = graph.targetNode.name;

  // Build adjacency list from edges
  const adjacency = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (!adjacency.has(edge.from)) {
      adjacency.set(edge.from, []);
    }
    adjacency.get(edge.from)!.push(edge.to);
  }

  function dfs(current: string): void {
    if (path.includes(current)) {
      // Found a cycle
      const cycleStart = path.indexOf(current);
      const cycle = [...path.slice(cycleStart), current];

      // Only include cycles that involve the target function
      if (cycle.includes(targetName)) {
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

    const callees = adjacency.get(current) || [];
    for (const callee of callees) {
      dfs(callee);
    }

    path.pop();
  }

  // Start DFS from target function
  dfs(targetName);

  // Also check from callers
  for (const caller of graph.callers) {
    visited.clear();
    path.length = 0;
    dfs(caller);
  }

  return cycles;
}

/**
 * Generate smart suggestions based on analysis
 */
function generateSmartSuggestions(
  functionName: string,
  fanIn: number,
  fanOut: number,
  circularDeps: string[][],
): SmartSuggestion[] {
  const suggestions: SmartSuggestion[] = [];

  // High caller count warning
  if (fanIn >= 15) {
    suggestions.push({
      type: "warning",
      message: `This function has ${fanIn} callers - consider if changes are safe and plan thorough testing`,
      severity: 4,
    });
  } else if (fanIn >= 10) {
    suggestions.push({
      type: "warning",
      message: `This function has ${fanIn} callers - consider if changes are safe`,
      severity: 3,
    });
  } else if (fanIn >= 5) {
    suggestions.push({
      type: "info",
      message: `This function has ${fanIn} callers - changes may have moderate impact`,
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
  if (fanOut >= 20) {
    suggestions.push({
      type: "refactor",
      message: `This function calls ${fanOut} others - consider breaking it up into smaller functions`,
      severity: 4,
    });
  } else if (fanOut >= 15) {
    suggestions.push({
      type: "refactor",
      message: `This function calls ${fanOut} others - consider breaking it up`,
      severity: 3,
    });
  } else if (fanOut >= 10) {
    suggestions.push({
      type: "info",
      message: `This function calls ${fanOut} other functions - consider if it has too many responsibilities`,
      severity: 2,
    });
  }

  // Hotspot warning
  if (fanIn >= 5 && fanOut >= 5) {
    suggestions.push({
      type: "warning",
      message: `"${functionName}" is a hotspot (high fan-in AND fan-out) - changes here are high-risk`,
      severity: 5,
    });
  }

  // Sort by severity (highest first)
  suggestions.sort((a, b) => b.severity - a.severity);

  return suggestions;
}
