/**
 * MCP Tool Request Handlers
 */

import type { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import {
  analyzeCallGraph,
  findFunctionDefinitions,
} from "../analyzer/typescript-analyzer.js";
import {
  analyzeImpact,
  formatImpactReport,
} from "../analyzer/impact-analyzer.js";
import { generateMermaidDiagram } from "../visualizer/mermaid.js";
import { generateAsciiTree } from "../visualizer/ascii.js";
import { exportToJson, type SmartSuggestion } from "../visualizer/json.js";
import { logger } from "../utils/logger.js";
import { ErrorMessages } from "../constants/errors.js";
import type {
  AnalyzeFunctionCallsInput,
  FindFunctionInput,
  VisualizeFunctionInput,
  AnalyzeImpactInput,
} from "./types.js";
import path from "path";

/** Maximum allowed depth to prevent excessive resource usage */
const MAX_DEPTH = 10;

/** Minimum allowed depth */
const MIN_DEPTH = 1;

/**
 * Validate and normalize a path input
 * @throws Error if path is invalid or not absolute
 */
function validateAndNormalizePath(
  inputPath: string,
  paramName: string,
): string {
  if (!inputPath || typeof inputPath !== "string") {
    throw new Error(ErrorMessages.PATH_REQUIRED(paramName));
  }

  // Normalize the path to resolve . and .. segments
  const normalized = path.normalize(inputPath);

  // Check if it's an absolute path
  if (!path.isAbsolute(normalized)) {
    throw new Error(ErrorMessages.PATH_MUST_BE_ABSOLUTE(paramName));
  }

  // Prevent null bytes (path traversal attack vector)
  if (normalized.includes("\0")) {
    throw new Error(ErrorMessages.PATH_INVALID_CHARACTERS(paramName));
  }

  return normalized;
}

/**
 * Validate and clamp depth parameter
 */
function validateDepth(
  depth: number | undefined,
  defaultValue: number = 2,
): number {
  if (depth === undefined || depth === null) {
    return defaultValue;
  }
  if (typeof depth !== "number" || isNaN(depth)) {
    return defaultValue;
  }
  return Math.min(Math.max(MIN_DEPTH, Math.floor(depth)), MAX_DEPTH);
}

/**
 * Handle incoming tool calls
 */
export async function handleToolCall(request: CallToolRequest): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "analyze_function_calls":
        return await handleAnalyzeFunctionCalls(
          args as unknown as AnalyzeFunctionCallsInput,
        );

      case "find_function":
        return await handleFindFunction(args as unknown as FindFunctionInput);

      case "visualize_callgraph":
        return await handleVisualizeCallgraph(
          args as unknown as VisualizeFunctionInput,
        );

      case "analyze_impact":
        return await handleAnalyzeImpact(args as unknown as AnalyzeImpactInput);

      default:
        throw new Error(ErrorMessages.UNKNOWN_TOOL(name));
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Tool ${name} failed: ${errorMessage}`);

    return {
      content: [
        {
          type: "text",
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle analyze_function_calls tool
 */
async function handleAnalyzeFunctionCalls(
  args: AnalyzeFunctionCallsInput,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const {
    functionName,
    projectRoot,
    filePath,
    depth: requestedDepth,
    direction = "both",
  } = args;

  // Validate inputs
  if (!functionName || typeof functionName !== "string") {
    throw new Error(ErrorMessages.FUNCTION_NAME_REQUIRED);
  }

  // Validate and normalize paths
  const normalizedRoot = validateAndNormalizePath(projectRoot, "projectRoot");
  const normalizedFilePath = filePath
    ? validateAndNormalizePath(filePath, "filePath")
    : undefined;

  // Validate depth
  const depth = validateDepth(requestedDepth);

  // Analyze call graph
  const graph = await analyzeCallGraph({
    functionName,
    projectRoot: normalizedRoot,
    filePath: normalizedFilePath,
    depth,
    direction,
  });

  // Generate visualizations
  const mermaid = generateMermaidDiagram(graph);
  const shortPath = path.basename(graph.targetNode.location.file);

  // Generate complexity metrics and suggestions
  const fanIn = graph.callers.length;
  const fanOut = graph.callees.length;
  const suggestions = generateQuickSuggestions(functionName, fanIn, fanOut);

  // Format response as markdown
  let markdown =
    `## Call Graph: \`${functionName}\`\n\n` +
    `**Found in:** ${shortPath}:${graph.targetNode.location.line}\n\n` +
    `### Visualization\n\n` +
    `\`\`\`mermaid\n${mermaid}\n\`\`\`\n\n` +
    `### Summary\n\n` +
    `- **Callers (Fan-In):** ${graph.callers.length} function(s) call \`${functionName}\`\n` +
    (graph.callers.length > 0
      ? `  - ${graph.callers.slice(0, 5).join(", ")}${graph.callers.length > 5 ? ` (+${graph.callers.length - 5} more)` : ""}\n`
      : "") +
    `- **Callees (Fan-Out):** \`${functionName}\` calls ${graph.callees.length} function(s)\n` +
    (graph.callees.length > 0
      ? `  - ${graph.callees.slice(0, 5).join(", ")}${graph.callees.length > 5 ? ` (+${graph.callees.length - 5} more)` : ""}\n`
      : "") +
    `- **Total nodes:** ${graph.nodes.size}\n`;

  // Add suggestions section if there are any
  if (suggestions.length > 0) {
    markdown += `\n### Insights\n\n`;
    for (const suggestion of suggestions) {
      const icon =
        suggestion.type === "warning"
          ? "[!]"
          : suggestion.type === "refactor"
            ? "[R]"
            : "[i]";
      markdown += `${icon} ${suggestion.message}\n`;
    }
  }

  return {
    content: [
      {
        type: "text",
        text: markdown,
      },
    ],
  };
}

/**
 * Generate quick suggestions for analyze_function_calls output
 */
function generateQuickSuggestions(
  functionName: string,
  fanIn: number,
  fanOut: number,
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

/**
 * Handle find_function tool
 */
async function handleFindFunction(args: FindFunctionInput): Promise<{
  content: Array<{ type: "text"; text: string }>;
}> {
  const { functionName, projectRoot } = args;

  // Validate inputs
  if (!functionName || typeof functionName !== "string") {
    throw new Error(ErrorMessages.FUNCTION_NAME_REQUIRED);
  }

  // Validate and normalize path
  const normalizedRoot = validateAndNormalizePath(projectRoot, "projectRoot");

  // Find function definitions
  const locations = await findFunctionDefinitions(normalizedRoot, functionName);

  if (locations.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: `No definitions found for function \`${functionName}\` in ${projectRoot}`,
        },
      ],
    };
  }

  // Format response
  const locationList = locations
    .map((loc, index) => {
      const shortPath = path.relative(normalizedRoot, loc.file);
      return `${index + 1}. \`${shortPath}:${loc.line}\` (${loc.kind})`;
    })
    .join("\n");

  const markdown =
    `## Found ${locations.length} definition(s) of \`${functionName}\`\n\n` +
    locationList;

  return {
    content: [
      {
        type: "text",
        text: markdown,
      },
    ],
  };
}

/**
 * Handle visualize_callgraph tool
 */
async function handleVisualizeCallgraph(args: VisualizeFunctionInput): Promise<{
  content: Array<{ type: "text"; text: string }>;
}> {
  const {
    functionName,
    projectRoot,
    format,
    depth: requestedDepth,
    direction = "both",
  } = args;

  // Validate inputs
  if (!functionName || typeof functionName !== "string") {
    throw new Error(ErrorMessages.FUNCTION_NAME_REQUIRED);
  }
  if (!format || !["mermaid", "ascii", "json"].includes(format)) {
    throw new Error(ErrorMessages.FORMAT_REQUIRED);
  }

  // Validate and normalize path
  const normalizedRoot = validateAndNormalizePath(projectRoot, "projectRoot");

  // Validate depth
  const depth = validateDepth(requestedDepth);

  // Analyze call graph
  const graph = await analyzeCallGraph({
    functionName,
    projectRoot: normalizedRoot,
    depth,
    direction,
  });

  // Generate visualization based on format
  let output: string;
  let codeBlock: string;

  switch (format) {
    case "mermaid":
      output = generateMermaidDiagram(graph);
      codeBlock = `\`\`\`mermaid\n${output}\n\`\`\``;
      break;

    case "ascii":
      output = generateAsciiTree(graph);
      codeBlock = `\`\`\`\n${output}\n\`\`\``;
      break;

    case "json":
      output = exportToJson(graph);
      codeBlock = `\`\`\`json\n${output}\n\`\`\``;
      break;

    default:
      throw new Error(ErrorMessages.UNKNOWN_FORMAT(format));
  }

  const markdown =
    `## Call Graph: \`${functionName}\` (${format})\n\n` + codeBlock;

  return {
    content: [
      {
        type: "text",
        text: markdown,
      },
    ],
  };
}

/**
 * Handle analyze_impact tool
 * Provides comprehensive impact analysis for a function
 */
async function handleAnalyzeImpact(args: AnalyzeImpactInput): Promise<{
  content: Array<{ type: "text"; text: string }>;
}> {
  const { functionName, projectRoot, filePath, depth: requestedDepth } = args;

  // Validate inputs
  if (!functionName || typeof functionName !== "string") {
    throw new Error(ErrorMessages.FUNCTION_NAME_REQUIRED);
  }

  // Validate and normalize paths
  const normalizedRoot = validateAndNormalizePath(projectRoot, "projectRoot");
  const normalizedFilePath = filePath
    ? validateAndNormalizePath(filePath, "filePath")
    : undefined;

  // Validate depth (default 3 for impact analysis)
  const depth = validateDepth(requestedDepth, 3);

  // Analyze impact
  const result = await analyzeImpact({
    functionName,
    projectRoot: normalizedRoot,
    filePath: normalizedFilePath,
    depth,
    includeComplexity: true,
  });

  // Format the report
  const report = formatImpactReport(result);

  return {
    content: [
      {
        type: "text",
        text: report,
      },
    ],
  };
}
