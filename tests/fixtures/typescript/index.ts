/**
 * TypeScript-specific test fixture
 */

// Generic function
function genericFunction<T>(item: T): T {
  return processGeneric(item);
}

function processGeneric<T>(item: T): T {
  return item;
}

// Class with methods
class UserService {
  private users: User[] = [];

  getUser(id: string): User | undefined {
    return this.findUserById(id);
  }

  private findUserById(id: string): User | undefined {
    return this.users.find((u) => u.id === id);
  }

  createUser(name: string): User {
    const user = { id: generateId(), name };
    this.users.push(user);
    return user;
  }
}

// Interface
interface User {
  id: string;
  name: string;
}

// Utility functions
function generateId(): string {
  return Math.random().toString(36).slice(2);
}

// Async function
async function asyncOperation(): Promise<string> {
  const result = await fetchRemoteData();
  return processResult(result);
}

async function fetchRemoteData(): Promise<string> {
  return "data";
}

function processResult(data: string): string {
  return data.toUpperCase();
}

// Higher-order function
function withLogging<T extends (...args: unknown[]) => unknown>(fn: T): T {
  return ((...args: unknown[]) => {
    const result = fn(...args);
    return result;
  }) as T;
}

const loggedFunction = withLogging(genericFunction);

export {
  genericFunction,
  processGeneric,
  UserService,
  generateId,
  asyncOperation,
  fetchRemoteData,
  processResult,
  withLogging,
  loggedFunction,
};
