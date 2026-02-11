/**
 * ASCII Tree Generator
 */

import path from "path";
import type { CallGraph, FunctionNode } from "../graph/types.js";

/**
 * Generate an ASCII tree representation of the call graph
 */
export function generateAsciiTree(graph: CallGraph): string {
  const lines: string[] = [];
  const target = graph.targetNode;

  // Header with target function
  const targetLocation = formatLocation(target);
  lines.push(`${target.name} (${targetLocation}) ●`);

  const hasCallers = graph.callers.length > 0;
  const hasCallees = graph.callees.length > 0;

  // Callers section
  if (hasCallers) {
    const callerPrefix = hasCallees ? "├" : "└";
    lines.push(`${callerPrefix}── Called by:`);

    graph.callers.forEach((caller, index) => {
      const node = graph.nodes.get(caller);
      if (node) {
        const isLast = index === graph.callers.length - 1;
        const linePrefix = hasCallees ? "│   " : "    ";
        const itemPrefix = isLast ? "└" : "├";
        lines.push(
          `${linePrefix}${itemPrefix}── ${caller} (${formatLocation(node)})`,
        );
      }
    });
  }

  // Callees section
  if (hasCallees) {
    lines.push("└── Calls:");

    graph.callees.forEach((callee, index) => {
      const node = graph.nodes.get(callee);
      if (node) {
        const isLast = index === graph.callees.length - 1;
        const itemPrefix = isLast ? "└" : "├";
        lines.push(`    ${itemPrefix}── ${callee} (${formatLocation(node)})`);
      }
    });
  }

  return lines.join("\n");
}

/**
 * Format location as short string
 */
function formatLocation(node: FunctionNode): string {
  const shortPath = path.basename(node.location.file);
  return `${shortPath}:${node.location.line}`;
}
