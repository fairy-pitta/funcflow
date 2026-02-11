/**
 * FuncFlow Demo - User Service Module
 *
 * Demonstrates service-level functions and class methods
 */

import { validateInput, sanitizeString } from "./validators.js";
import { logResult, formatOutput } from "./utils.js";

// ============================================================================
// Types
// ============================================================================

export interface UserData {
  id: string;
  username: string;
  email: string;
  role: "admin" | "user" | "guest";
  createdAt: Date;
}

export interface ProcessedUser {
  displayName: string;
  permissions: string[];
  isActive: boolean;
}

// ============================================================================
// User Data Functions
// ============================================================================

/**
 * Fetch user data from the database
 * This is a commonly called function throughout the application
 */
export function fetchUserData(username: string): UserData {
  // Validate before fetching
  if (!validateInput(username)) {
    throw new Error(`Invalid username: ${username}`);
  }

  // Simulate database fetch
  return createMockUserData(username);
}

/**
 * Create mock user data for demonstration
 */
function createMockUserData(username: string): UserData {
  const sanitized = sanitizeString(username);
  return {
    id: generateUserId(sanitized),
    username: sanitized,
    email: `${sanitized}@example.com`,
    role: determineRole(sanitized),
    createdAt: new Date(),
  };
}

/**
 * Generate a unique user ID
 */
function generateUserId(username: string): string {
  return `user_${username}_${Date.now()}`;
}

/**
 * Determine user role based on username
 */
function determineRole(username: string): UserData["role"] {
  if (username === "admin" || username === "system") {
    return "admin";
  }
  if (username.startsWith("guest_")) {
    return "guest";
  }
  return "user";
}

// ============================================================================
// User Processing Functions
// ============================================================================

/**
 * Process user data into a displayable format
 * Called by processUserFlow in main.ts
 */
export function processUser(userData: UserData): ProcessedUser {
  const displayName = formatDisplayName(userData);
  const permissions = calculatePermissions(userData);
  const isActive = checkUserActivity(userData);

  return {
    displayName,
    permissions,
    isActive,
  };
}

/**
 * Format the user's display name
 */
function formatDisplayName(userData: UserData): string {
  const { username, role } = userData;
  return role === "admin" ? `[Admin] ${username}` : username;
}

/**
 * Calculate user permissions based on role
 */
function calculatePermissions(userData: UserData): string[] {
  const basePermissions = ["read"];

  switch (userData.role) {
    case "admin":
      return [...basePermissions, "write", "delete", "admin"];
    case "user":
      return [...basePermissions, "write"];
    case "guest":
      return basePermissions;
    default:
      return basePermissions;
  }
}

/**
 * Check if user is active
 */
function checkUserActivity(userData: UserData): boolean {
  // Check if user was created in the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return userData.createdAt > thirtyDaysAgo;
}

// ============================================================================
// User Service Class
// ============================================================================

/**
 * User service class for managing users
 */
export class UserService {
  private debug: boolean;
  private cache: Map<string, UserData>;

  constructor(debug: boolean = false) {
    this.debug = debug;
    this.cache = new Map();
  }

  /**
   * Initialize the service
   */
  initialize(): void {
    this.loadDefaultUsers();
    if (this.debug) {
      this.enableDebugging();
    }
  }

  /**
   * Load default system users
   */
  private loadDefaultUsers(): void {
    const defaultUsers = ["system", "admin"];
    for (const username of defaultUsers) {
      this.getUser(username);
    }
  }

  /**
   * Enable debugging features
   */
  private enableDebugging(): void {
    logResult("UserService debugging enabled", true);
  }

  /**
   * Get a user by username
   */
  getUser(username: string): UserData | null {
    // Check cache first
    if (this.cache.has(username)) {
      return this.cache.get(username)!;
    }

    // Fetch and cache
    try {
      const userData = fetchUserData(username);
      this.cache.set(username, userData);
      return userData;
    } catch (error) {
      this.handleUserError(error as Error, username);
      return null;
    }
  }

  /**
   * Process a user and return the result
   */
  processUserRequest(username: string): ProcessedUser | null {
    const userData = this.getUser(username);
    if (!userData) {
      return null;
    }
    return processUser(userData);
  }

  /**
   * Handle user-related errors
   */
  private handleUserError(error: Error, username: string): void {
    const message = `Failed to fetch user ${username}: ${error.message}`;
    logResult(message, false);
  }

  /**
   * Clear the user cache
   */
  clearCache(): void {
    this.cache.clear();
    logResult("User cache cleared", true);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; users: string[] } {
    return {
      size: this.cache.size,
      users: Array.from(this.cache.keys()),
    };
  }
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Fetch multiple users at once
 */
export function fetchMultipleUsers(usernames: string[]): UserData[] {
  const results: UserData[] = [];

  for (const username of usernames) {
    try {
      const userData = fetchUserData(username);
      results.push(userData);
    } catch {
      // Skip invalid users
      continue;
    }
  }

  return results;
}

/**
 * Process multiple users and aggregate results
 */
export function processMultipleUsers(users: UserData[]): ProcessedUser[] {
  return users.map((user) => processUser(user));
}

/**
 * Create a user processing pipeline
 */
export function createUserPipeline(
  transform?: (user: ProcessedUser) => ProcessedUser,
): (username: string) => ProcessedUser | null {
  return (username: string) => {
    try {
      const userData = fetchUserData(username);
      let processed = processUser(userData);
      if (transform) {
        processed = transform(processed);
      }
      return processed;
    } catch {
      return null;
    }
  };
}
