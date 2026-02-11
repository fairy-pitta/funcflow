/**
 * Mermaid Diagram Generator
 */

import path from "path";
import type { CallGraph, FunctionNode } from "../graph/types.js";

/**
 * Generate a Mermaid diagram from a call graph
 */
export function generateMermaidDiagram(graph: CallGraph): string {
  const lines: string[] = ["graph TD"];
  const addedNodes = new Set<string>();

  // Generate node definitions
  for (const [name, node] of graph.nodes) {
    const nodeId = sanitizeNodeId(name);
    const label = formatNodeLabel(node);
    const isTarget = name === graph.targetNode.name;

    lines.push(`    ${nodeId}["${label}"]`);
    addedNodes.add(name);

    if (isTarget) {
      lines.push(`    style ${nodeId} fill:#f9f,stroke:#333,stroke-width:4px`);
    }
  }

  // Generate edges
  const addedEdges = new Set<string>();
  for (const edge of graph.edges) {
    const edgeKey = `${edge.from}->${edge.to}`;
    if (addedEdges.has(edgeKey)) continue;
    addedEdges.add(edgeKey);

    const fromId = sanitizeNodeId(edge.from);
    const toId = sanitizeNodeId(edge.to);

    // Ensure both nodes exist
    if (addedNodes.has(edge.from) && addedNodes.has(edge.to)) {
      lines.push(`    ${fromId} --> ${toId}`);
    }
  }

  return lines.join("\n");
}

/**
 * Sanitize node ID for Mermaid (only alphanumeric and underscore)
 */
function sanitizeNodeId(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, "_");
}

/**
 * Format node label with function name and location
 */
function formatNodeLabel(node: FunctionNode): string {
  const shortPath = path.basename(node.location.file);
  const label = `${node.name}<br/>${shortPath}:${node.location.line}`;
  // Escape special characters for Mermaid
  return label
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
