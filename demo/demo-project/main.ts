/**
 * FuncFlow Demo - Main Application
 *
 * This demo showcases funcflow's capabilities for analyzing function call graphs.
 * It includes various patterns:
 * - Direct function calls
 * - Nested call chains
 * - Circular dependencies
 * - Arrow functions and methods
 */

import { fetchUserData, processUser, UserService } from "./user-service.js";
import { formatOutput, logResult, createLogger } from "./utils.js";
import { validateInput, sanitizeString } from "./validators.js";

// ============================================================================
// Main Application Entry Points
// ============================================================================

/**
 * Main application entry point
 * This function demonstrates a complex call chain
 */
export function main(): void {
  const logger = createLogger("main");
  logger("Application starting...");

  initializeApp();
  runMainLoop();

  logger("Application finished");
}

/**
 * Initialize the application
 * Sets up required services and configuration
 */
function initializeApp(): void {
  const config = loadConfig();
  setupServices(config);
  warmupCache();
}

/**
 * Main processing loop
 * Demonstrates caller/callee relationships
 */
function runMainLoop(): void {
  const users = ["alice", "bob", "charlie"];

  for (const user of users) {
    processUserFlow(user);
  }

  generateReport();
}

// ============================================================================
// User Processing Flow
// ============================================================================

/**
 * Complete user processing flow
 * This is a central function with many callers and callees
 */
export function processUserFlow(username: string): boolean {
  // Validate input
  if (!validateInput(username)) {
    logResult("Invalid username", false);
    return false;
  }

  // Sanitize the input
  const cleanUsername = sanitizeString(username);

  // Fetch and process user data
  const userData = fetchUserData(cleanUsername);
  const result = processUser(userData);

  // Format and log the output
  const output = formatOutput(result);
  logResult(output, true);

  return true;
}

/**
 * Batch process multiple users
 */
export function batchProcessUsers(usernames: string[]): number {
  let successCount = 0;

  for (const username of usernames) {
    if (processUserFlow(username)) {
      successCount++;
    }
  }

  return successCount;
}

/**
 * Process a single user with retry logic
 */
function processUserWithRetry(
  username: string,
  maxRetries: number = 3,
): boolean {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return processUserFlow(username);
    } catch (error) {
      if (attempt === maxRetries) {
        handleError(error as Error, username);
        return false;
      }
      delay(1000 * attempt);
    }
  }
  return false;
}

// ============================================================================
// Configuration and Services
// ============================================================================

interface AppConfig {
  debug: boolean;
  maxUsers: number;
  cacheEnabled: boolean;
}

/**
 * Load application configuration
 */
function loadConfig(): AppConfig {
  return {
    debug: true,
    maxUsers: 100,
    cacheEnabled: true,
  };
}

/**
 * Setup application services
 */
function setupServices(config: AppConfig): void {
  const userService = new UserService(config.debug);
  userService.initialize();

  if (config.cacheEnabled) {
    initializeCache(config.maxUsers);
  }
}

/**
 * Initialize the cache system
 */
function initializeCache(maxSize: number): void {
  // Cache initialization logic
  warmupCache();
}

/**
 * Warmup cache with common data
 * Note: This creates a circular call with initializeCache
 */
function warmupCache(): void {
  const commonUsers = ["system", "admin"];
  for (const user of commonUsers) {
    fetchUserData(user);
  }
}

// ============================================================================
// Reporting
// ============================================================================

/**
 * Generate a summary report
 */
function generateReport(): void {
  const stats = collectStatistics();
  const formatted = formatReport(stats);
  outputReport(formatted);
}

/**
 * Collect processing statistics
 */
function collectStatistics(): Record<string, number> {
  return {
    processed: 10,
    failed: 2,
    cached: 5,
  };
}

/**
 * Format the report data
 */
function formatReport(stats: Record<string, number>): string {
  return Object.entries(stats)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
}

/**
 * Output the final report
 */
function outputReport(content: string): void {
  logResult(content, true);
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Handle processing errors
 */
function handleError(error: Error, context: string): void {
  const message = formatErrorMessage(error, context);
  logResult(message, false);
  notifyAdmin(message);
}

/**
 * Format error messages
 */
function formatErrorMessage(error: Error, context: string): string {
  return `Error processing ${context}: ${error.message}`;
}

/**
 * Notify admin of critical errors
 */
function notifyAdmin(message: string): void {
  // In a real app, this would send an email or notification
  const logger = createLogger("admin-notify");
  logger(message);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Delay execution
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// Circular Dependency Demo
// ============================================================================

/**
 * Function A calls B
 */
export function circularA(): void {
  circularB();
}

/**
 * Function B calls C
 */
function circularB(): void {
  circularC();
}

/**
 * Function C calls A (completing the circle)
 */
function circularC(): void {
  // This creates a circular dependency: A -> B -> C -> A
  circularA();
}

// ============================================================================
// Arrow Function Examples
// ============================================================================

/**
 * Arrow function that processes data
 */
export const processData = (data: unknown): string => {
  const validated = validateInput(String(data));
  if (!validated) {
    return "Invalid data";
  }
  return formatOutput(data);
};

/**
 * Higher-order function example
 */
export const createProcessor = (transform: (x: string) => string) => {
  return (input: string): string => {
    const sanitized = sanitizeString(input);
    return transform(sanitized);
  };
};

// ============================================================================
// Class Method Examples
// ============================================================================

/**
 * Application class with methods
 */
export class Application {
  private config: AppConfig;

  constructor() {
    this.config = loadConfig();
  }

  /**
   * Start the application
   */
  start(): void {
    initializeApp();
    this.runWithConfig();
  }

  /**
   * Run with current configuration
   */
  private runWithConfig(): void {
    if (this.config.debug) {
      this.debugMode();
    }
    runMainLoop();
  }

  /**
   * Enable debug mode
   */
  private debugMode(): void {
    const logger = createLogger("debug");
    logger("Debug mode enabled");
  }
}
