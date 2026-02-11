import { describe, it, expect, beforeAll } from "vitest";
import ts from "typescript";
import { findFunction } from "../../../src/analyzer/function-finder.js";
import { createTestProgram } from "../../test-utils.js";

describe("Function Finder", () => {
  let program: ts.Program;

  beforeAll(() => {
    const code = `
      function getUserById(id: string) {
        return findUser(id);
      }

      class UserService {
        getUser(id: string) {
          return getUserById(id);
        }
      }

      const fetchUser = (id: string) => {
        return getUserById(id);
      };

      const processUser = function(id: string) {
        return fetchUser(id);
      };
    `;
    program = createTestProgram({ "test.ts": code });
  });

  it("finds function declaration", () => {
    const results = findFunction(program, "getUserById");
    expect(results).toHaveLength(1);
    expect(results[0].kind).toBe("function");
    expect(results[0].name).toBe("getUserById");
  });

  it("finds method declaration", () => {
    const results = findFunction(program, "getUser");
    expect(results).toHaveLength(1);
    expect(results[0].kind).toBe("method");
  });

  it("finds arrow function", () => {
    const results = findFunction(program, "fetchUser");
    expect(results).toHaveLength(1);
    expect(results[0].kind).toBe("arrow");
  });

  it("finds function expression", () => {
    const results = findFunction(program, "processUser");
    expect(results).toHaveLength(1);
    expect(results[0].kind).toBe("expression");
  });

  it("returns empty array for non-existent function", () => {
    const results = findFunction(program, "nonExistent");
    expect(results).toHaveLength(0);
  });

  it("finds multiple definitions across files", () => {
    const multiFileProgram = createTestProgram({
      "a.ts": "function foo() { return 1; }",
      "b.ts": "function foo() { return 2; }",
    });

    const results = findFunction(multiFileProgram, "foo");
    expect(results).toHaveLength(2);
  });

  it("returns correct line numbers", () => {
    const results = findFunction(program, "getUserById");
    expect(results[0].line).toBeGreaterThan(0);
    expect(results[0].column).toBeGreaterThan(0);
  });
});
