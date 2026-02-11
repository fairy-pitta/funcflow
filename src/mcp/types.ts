/**
 * MCP-related type definitions
 */

export interface AnalyzeFunctionCallsInput {
  /** Name of the function to analyze */
  functionName: string;
  /** Absolute path to project root directory */
  projectRoot: string;
  /** Optional: specific file path to search in */
  filePath?: string;
  /** How many levels deep to traverse (default: 2) */
  depth?: number;
  /** Which direction to analyze (default: both) */
  direction?: "callers" | "callees" | "both";
}

export interface FindFunctionInput {
  /** Name of the function to find */
  functionName: string;
  /** Absolute path to project root directory */
  projectRoot: string;
  /** Optional regex pattern for matching */
  pattern?: string;
}

export interface VisualizeFunctionInput {
  /** Name of the function to visualize */
  functionName: string;
  /** Absolute path to project root directory */
  projectRoot: string;
  /** Output format */
  format: "mermaid" | "ascii" | "json";
  /** How many levels deep to traverse */
  depth?: number;
  /** Which direction to analyze */
  direction?: "callers" | "callees" | "both";
}

export interface AnalyzeImpactInput {
  /** Name of the function to analyze impact for */
  functionName: string;
  /** Absolute path to project root directory */
  projectRoot: string;
  /** Optional: specific file path to search in */
  filePath?: string;
  /** How many levels deep to traverse for transitive impact (default: 3) */
  depth?: number;
}
