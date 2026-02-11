/**
 * MCP Server Setup
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { ALL_TOOLS } from "./tools.js";
import { handleToolCall } from "./handlers.js";
import { logger } from "../utils/logger.js";

/**
 * Create and configure the MCP server
 */
export async function createServer(): Promise<Server> {
  const server = new Server(
    {
      name: "funcflow",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Register tool list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug("Received tools/list request");
    return {
      tools: ALL_TOOLS,
    };
  });

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    logger.debug(`Received tools/call request for: ${request.params.name}`);
    return handleToolCall(request);
  });

  return server;
}

/**
 * Run the MCP server
 */
export async function runServer(): Promise<void> {
  const server = await createServer();

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info("funcflow MCP server running on stdio");
}
