#!/usr/bin/env node
/**
 * funcflow - MCP server for analyzing function call graphs
 *
 * Entry point for the MCP server
 */

import { runServer } from "./mcp/server.js";
import { logger } from "./utils/logger.js";

async function main(): Promise<void> {
  try {
    await runServer();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Fatal error: ${message}`);
    process.exit(1);
  }
}

main();
