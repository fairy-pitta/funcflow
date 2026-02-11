/**
 * MCP Tool Definitions
 */

export const ANALYZE_FUNCTION_CALLS = {
  name: "analyze_function_calls",
  description:
    "Analyze function call graph showing callers and callees. " +
    "Use this to understand which functions call or are called by a target function. " +
    "Returns a Mermaid diagram and summary of the call relationships.",
  inputSchema: {
    type: "object" as const,
    properties: {
      functionName: {
        type: "string",
        description: "Name of the function to analyze (e.g., 'getUserById')",
      },
      projectRoot: {
        type: "string",
        description: "Absolute path to the project root directory",
      },
      filePath: {
        type: "string",
        description:
          "Optional: specific file path to search in. If not provided, searches entire project.",
      },
      depth: {
        type: "number",
        description:
          "How many levels deep to traverse the call graph (default: 2). " +
          "Higher values show more distant relationships but take longer.",
        default: 2,
      },
      direction: {
        type: "string",
        enum: ["callers", "callees", "both"],
        description:
          "Which direction to analyze: 'callers' (functions that call this), " +
          "'callees' (functions this calls), or 'both' (default)",
        default: "both",
      },
    },
    required: ["functionName", "projectRoot"],
  },
};

export const FIND_FUNCTION = {
  name: "find_function",
  description:
    "Find all definitions of a function by name in the project. " +
    "Useful for locating where a function is defined before analyzing its call graph.",
  inputSchema: {
    type: "object" as const,
    properties: {
      functionName: {
        type: "string",
        description: "Name of the function to find",
      },
      projectRoot: {
        type: "string",
        description: "Absolute path to the project root directory",
      },
    },
    required: ["functionName", "projectRoot"],
  },
};

export const VISUALIZE_CALLGRAPH = {
  name: "visualize_callgraph",
  description:
    "Generate a visualization of a function's call graph in the specified format. " +
    "Supports Mermaid diagrams (rich), ASCII trees (quick), and JSON (machine-readable).",
  inputSchema: {
    type: "object" as const,
    properties: {
      functionName: {
        type: "string",
        description: "Name of the function to visualize",
      },
      projectRoot: {
        type: "string",
        description: "Absolute path to the project root directory",
      },
      format: {
        type: "string",
        enum: ["mermaid", "ascii", "json"],
        description:
          "Output format: 'mermaid' for rich diagrams, 'ascii' for terminal-friendly trees, " +
          "'json' for machine-readable data",
        default: "mermaid",
      },
      depth: {
        type: "number",
        description: "How many levels deep to traverse (default: 2)",
        default: 2,
      },
      direction: {
        type: "string",
        enum: ["callers", "callees", "both"],
        description: "Which direction to analyze (default: both)",
        default: "both",
      },
    },
    required: ["functionName", "projectRoot", "format"],
  },
};

export const ANALYZE_IMPACT = {
  name: "analyze_impact",
  description:
    "Analyze the potential impact of changing a function. " +
    "Shows risk score, transitive callers (callers of callers), circular dependencies, " +
    "complexity metrics (fan-in/fan-out, hotspot detection), and actionable suggestions. " +
    "Use this before making changes to understand what might break.",
  inputSchema: {
    type: "object" as const,
    properties: {
      functionName: {
        type: "string",
        description:
          "Name of the function to analyze impact for (e.g., 'processOrder')",
      },
      projectRoot: {
        type: "string",
        description: "Absolute path to the project root directory",
      },
      filePath: {
        type: "string",
        description:
          "Optional: specific file path to search in. If not provided, searches entire project.",
      },
      depth: {
        type: "number",
        description:
          "How many levels of transitive callers to analyze (default: 3). " +
          "Higher values show more distant impact but take longer.",
        default: 3,
      },
    },
    required: ["functionName", "projectRoot"],
  },
};

export const ALL_TOOLS = [
  ANALYZE_FUNCTION_CALLS,
  FIND_FUNCTION,
  VISUALIZE_CALLGRAPH,
  ANALYZE_IMPACT,
];
