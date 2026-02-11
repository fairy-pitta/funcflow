/**
 * JSON Exporter
 */

import type { CallGraph } from "../graph/types.js";

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
}

/**
 * Export call graph to JSON format
 */
export function exportToJson(graph: CallGraph): string {
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
