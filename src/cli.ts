#!/usr/bin/env node
/**
 * FuncFlow CLI
 *
 * Command-line interface for analyzing function call graphs
 * without MCP integration. Perfect for demos and quick analysis.
 */

import { analyzeCallGraph } from "./analyzer/typescript-analyzer.js";
import { generateMermaidDiagram } from "./visualizer/mermaid.js";
import { generateAsciiTree } from "./visualizer/ascii.js";
import { exportToJson } from "./visualizer/json.js";
import path from "path";

// ============================================================================
// Types
// ============================================================================

interface CLIOptions {
  functionName: string;
  projectRoot: string;
  format: "ascii" | "mermaid" | "json";
  depth: number;
  direction: "callers" | "callees" | "both";
  help?: boolean;
}

// ============================================================================
// Help Text
// ============================================================================

const HELP_TEXT = `
funcflow - Function Call Graph Analyzer

USAGE:
  npx funcflow <functionName> [options]
  npm run demo -- <functionName> [options]

ARGUMENTS:
  functionName    Name of the function to analyze (required)

OPTIONS:
  -p, --project   Project root directory (default: current directory)
  -f, --format    Output format: ascii, mermaid, json (default: ascii)
  -d, --depth     Analysis depth, 1-10 (default: 2)
  --direction     Analysis direction: callers, callees, both (default: both)
  -h, --help      Show this help message

EXAMPLES:
  # Analyze a function in the current directory
  npx funcflow processUserFlow

  # Analyze with specific options
  npx funcflow main --project ./src --format mermaid --depth 3

  # Show only callers
  npx funcflow fetchUserData --direction callers

  # Export as JSON
  npx funcflow validateInput --format json --depth 5

OUTPUT FORMATS:
  ascii    - Text-based tree visualization (default)
  mermaid  - Mermaid diagram syntax (paste into markdown)
  json     - Structured JSON data

For more information, visit: https://github.com/fairy-pitta/funcflow
`;

// ============================================================================
// Argument Parsing
// ============================================================================

function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {
    functionName: "",
    projectRoot: process.cwd(),
    format: "ascii",
    depth: 2,
    direction: "both",
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === "-h" || arg === "--help") {
      options.help = true;
      return options;
    }

    if (arg === "-p" || arg === "--project") {
      i++;
      if (i >= args.length) {
        throw new Error("Missing value for --project");
      }
      options.projectRoot = path.resolve(args[i]);
    } else if (arg === "-f" || arg === "--format") {
      i++;
      if (i >= args.length) {
        throw new Error("Missing value for --format");
      }
      const format = args[i];
      if (!["ascii", "mermaid", "json"].includes(format)) {
        throw new Error(`Invalid format: ${format}. Use: ascii, mermaid, json`);
      }
      options.format = format as CLIOptions["format"];
    } else if (arg === "-d" || arg === "--depth") {
      i++;
      if (i >= args.length) {
        throw new Error("Missing value for --depth");
      }
      const depth = parseInt(args[i], 10);
      if (isNaN(depth) || depth < 1 || depth > 10) {
        throw new Error("Depth must be a number between 1 and 10");
      }
      options.depth = depth;
    } else if (arg === "--direction") {
      i++;
      if (i >= args.length) {
        throw new Error("Missing value for --direction");
      }
      const direction = args[i];
      if (!["callers", "callees", "both"].includes(direction)) {
        throw new Error(
          `Invalid direction: ${direction}. Use: callers, callees, both`,
        );
      }
      options.direction = direction as CLIOptions["direction"];
    } else if (!arg.startsWith("-") && !options.functionName) {
      options.functionName = arg;
    } else if (!arg.startsWith("-")) {
      throw new Error(`Unexpected argument: ${arg}`);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }

    i++;
  }

  return options;
}

// ============================================================================
// Output Formatting
// ============================================================================

function printHeader(options: CLIOptions): void {
  console.log();
  console.log("=".repeat(60));
  console.log("  FuncFlow - Function Call Graph Analyzer");
  console.log("=".repeat(60));
  console.log();
  console.log(`  Function:  ${options.functionName}`);
  console.log(`  Project:   ${options.projectRoot}`);
  console.log(`  Format:    ${options.format}`);
  console.log(`  Depth:     ${options.depth}`);
  console.log(`  Direction: ${options.direction}`);
  console.log();
  console.log("-".repeat(60));
  console.log();
}

function printError(message: string): void {
  console.error();
  console.error(`Error: ${message}`);
  console.error();
  console.error("Run 'funcflow --help' for usage information.");
  console.error();
}

function printSuccess(nodeCount: number, edgeCount: number): void {
  console.log();
  console.log("-".repeat(60));
  console.log();
  console.log(`  Analysis complete: ${nodeCount} nodes, ${edgeCount} edges`);
  console.log();
}

// ============================================================================
// Main CLI Logic
// ============================================================================

async function main(): Promise<void> {
  try {
    // Parse arguments (skip node and script path)
    const args = process.argv.slice(2);
    const options = parseArgs(args);

    // Show help if requested or no function name
    if (options.help || !options.functionName) {
      console.log(HELP_TEXT);
      process.exit(options.help ? 0 : 1);
    }

    // Print header
    printHeader(options);

    // Analyze the function
    const graph = await analyzeCallGraph({
      functionName: options.functionName,
      projectRoot: options.projectRoot,
      depth: options.depth,
      direction: options.direction,
    });

    // Generate output based on format
    let output: string;

    switch (options.format) {
      case "ascii":
        output = generateAsciiTree(graph);
        break;

      case "mermaid":
        output = generateMermaidDiagram(graph);
        break;

      case "json":
        output = exportToJson(graph);
        break;

      default:
        throw new Error(`Unknown format: ${options.format}`);
    }

    // Print the output
    console.log(output);

    // Print summary
    printSuccess(graph.nodes.size, graph.edges.length);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    printError(message);
    process.exit(1);
  }
}

// Run the CLI
main();
