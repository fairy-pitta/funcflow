import { describe, it, expect } from "vitest";
import { findCallsInFunction } from "../../../src/analyzer/call-analyzer.js";
import { createTestProgram, getFunctionNode } from "../../test-utils.js";

describe("Call Analyzer", () => {
  it("finds direct function calls", () => {
    const code = `
      function a() { b(); c(); }
      function b() {}
      function c() {}
    `;
    const program = createTestProgram({ "test.ts": code });
    const typeChecker = program.getTypeChecker();
    const functionNode = getFunctionNode(program, "a");
    const sourceFile = functionNode.getSourceFile();

    const calls = findCallsInFunction(functionNode, sourceFile, typeChecker);

    expect(calls).toHaveLength(2);
    expect(calls.map((c) => c.calleeName)).toContain("b");
    expect(calls.map((c) => c.calleeName)).toContain("c");
  });

  it("finds method calls", () => {
    const code = `
      function a() {
        obj.method();
      }
      const obj = { method() {} };
    `;
    const program = createTestProgram({ "test.ts": code });
    const typeChecker = program.getTypeChecker();
    const functionNode = getFunctionNode(program, "a");
    const sourceFile = functionNode.getSourceFile();

    const calls = findCallsInFunction(functionNode, sourceFile, typeChecker);

    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0].kind).toBe("method");
  });

  it("finds nested calls", () => {
    const code = `
      function a() {
        b(c(d()));
      }
      function b(x: unknown) { return x; }
      function c(x: unknown) { return x; }
      function d() { return 1; }
    `;
    const program = createTestProgram({ "test.ts": code });
    const typeChecker = program.getTypeChecker();
    const functionNode = getFunctionNode(program, "a");
    const sourceFile = functionNode.getSourceFile();

    const calls = findCallsInFunction(functionNode, sourceFile, typeChecker);

    // Should find b, c, and d
    expect(calls.length).toBeGreaterThanOrEqual(3);
    const callNames = calls.map((c) => c.calleeName);
    expect(callNames).toContain("b");
    expect(callNames).toContain("c");
    expect(callNames).toContain("d");
  });

  it("returns correct location information", () => {
    const code = `function a() { b(); }
function b() {}`;
    const program = createTestProgram({ "test.ts": code });
    const typeChecker = program.getTypeChecker();
    const functionNode = getFunctionNode(program, "a");
    const sourceFile = functionNode.getSourceFile();

    const calls = findCallsInFunction(functionNode, sourceFile, typeChecker);

    expect(calls).toHaveLength(1);
    expect(calls[0].location.file).toBe("test.ts");
    expect(calls[0].location.line).toBe(1);
  });

  it("handles arrow functions", () => {
    const code = `
      const a = () => {
        b();
      };
      function b() {}
    `;
    const program = createTestProgram({ "test.ts": code });
    const typeChecker = program.getTypeChecker();
    const functionNode = getFunctionNode(program, "a");
    const sourceFile = functionNode.getSourceFile();

    const calls = findCallsInFunction(functionNode, sourceFile, typeChecker);

    expect(calls).toHaveLength(1);
    expect(calls[0].calleeName).toBe("b");
  });
});
