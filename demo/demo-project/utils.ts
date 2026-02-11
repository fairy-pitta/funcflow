/**
 * FuncFlow Demo - Utility Functions
 *
 * Common utility functions used throughout the application
 */

// ============================================================================
// Logging Utilities
// ============================================================================

/**
 * Log a result with success/failure indicator
 * This is one of the most commonly called functions
 */
export function logResult(message: string, success: boolean): void {
  const prefix = success ? "[SUCCESS]" : "[FAILURE]";
  const formatted = formatLogMessage(prefix, message);
  outputToConsole(formatted);
}

/**
 * Format a log message with timestamp
 */
function formatLogMessage(prefix: string, message: string): string {
  const timestamp = getTimestamp();
  return `${timestamp} ${prefix} ${message}`;
}

/**
 * Get current timestamp string
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Output to console (abstracted for testing)
 */
function outputToConsole(message: string): void {
  console.log(message);
}

/**
 * Create a namespaced logger
 */
export function createLogger(namespace: string): (message: string) => void {
  return (message: string) => {
    const formatted = formatNamespacedMessage(namespace, message);
    logResult(formatted, true);
  };
}

/**
 * Format a message with namespace
 */
function formatNamespacedMessage(namespace: string, message: string): string {
  return `[${namespace}] ${message}`;
}

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * Format any output to string
 */
export function formatOutput(data: unknown): string {
  if (typeof data === "string") {
    return data;
  }

  if (data === null || data === undefined) {
    return "";
  }

  return stringifyData(data);
}

/**
 * Stringify complex data
 */
function stringifyData(data: unknown): string {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

/**
 * Format a number with comma separators
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Format duration in milliseconds to human readable
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

// ============================================================================
// String Utilities
// ============================================================================

/**
 * Truncate a string to a maximum length
 */
export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength - 3) + "...";
}

/**
 * Capitalize the first letter of a string
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert string to kebab-case
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

/**
 * Convert string to camelCase
 */
export function toCamelCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ""))
    .replace(/^(.)/, (char) => char.toLowerCase());
}

// ============================================================================
// Collection Utilities
// ============================================================================

/**
 * Group array items by a key
 */
export function groupBy<T>(
  items: T[],
  keyFn: (item: T) => string,
): Record<string, T[]> {
  const result: Record<string, T[]> = {};

  for (const item of items) {
    const key = keyFn(item);
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(item);
  }

  return result;
}

/**
 * Remove duplicates from an array
 */
export function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

/**
 * Chunk an array into smaller arrays
 */
export function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }

  return result;
}

// ============================================================================
// Async Utilities
// ============================================================================

/**
 * Retry an async function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const delay = calculateBackoff(attempt, baseDelay);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Calculate exponential backoff delay
 */
function calculateBackoff(attempt: number, baseDelay: number): number {
  return baseDelay * Math.pow(2, attempt);
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute functions in parallel with a concurrency limit
 */
export async function parallelLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const promise = fn(item).then((result) => {
      results.push(result);
    });

    executing.push(promise);

    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

// ============================================================================
// Caching Utilities
// ============================================================================

/**
 * Simple memoization function
 */
export function memoize<T extends (...args: unknown[]) => unknown>(fn: T): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = createCacheKey(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args) as ReturnType<T>;
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Create a cache key from arguments
 */
function createCacheKey(args: unknown[]): string {
  return JSON.stringify(args);
}

// ============================================================================
// Deep Clone
// ============================================================================

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item)) as unknown as T;
  }

  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj as object)) {
    result[key] = deepClone((obj as Record<string, unknown>)[key]);
  }

  return result as T;
}
