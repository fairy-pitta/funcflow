import { describe, it, expect } from "vitest";
import { buildCallGraph } from "../../../src/graph/builder.js";
import { findFunction } from "../../../src/analyzer/function-finder.js";
import { createTestProgram } from "../../test-utils.js";

describe("Graph Builder", () => {
  it("builds simple call graph", () => {
    const code = `
      function a() { b(); }
      function b() { c(); }
      function c() { }
    `;
    const program = createTestProgram({ "test.ts": code });
    const typeChecker = program.getTypeChecker();
    const locations = findFunction(program, "a");
    const targetFunction = locations[0];

    const graph = buildCallGraph({
      program,
      typeChecker,
      targetFunction,
      depth: 2,
      direction: "callees",
    });

    expect(graph.nodes.size).toBeGreaterThanOrEqual(2);
    expect(graph.edges.length).toBeGreaterThanOrEqual(1);
    expect(graph.callees).toContain("b");
  });

  it("respects depth limit", () => {
    const code = `
      function a() { b(); }
      function b() { c(); }
      function c() { d(); }
      function d() { }
    `;
    const program = createTestProgram({ "test.ts": code });
    const typeChecker = program.getTypeChecker();
    const locations = findFunction(program, "a");
    const targetFunction = locations[0];

    const graph = buildCallGraph({
      program,
      typeChecker,
      targetFunction,
      depth: 1,
      direction: "callees",
    });

    // Depth 1 should include a and b, but not go deeper
    expect(graph.nodes.has("a")).toBe(true);
    expect(graph.nodes.has("b")).toBe(true);
  });

  it("handles circular dependencies", () => {
    const code = `
      function a() { b(); }
      function b() { a(); }
    `;
    const program = createTestProgram({ "test.ts": code });
    const typeChecker = program.getTypeChecker();
    const locations = findFunction(program, "a");
    const targetFunction = locations[0];

    // Should not infinite loop
    const graph = buildCallGraph({
      program,
      typeChecker,
      targetFunction,
      depth: 5,
      direction: "callees",
    });

    expect(graph.nodes.size).toBe(2);
  });

  it("finds callers correctly", () => {
    const code = `
      function caller1() { target(); }
      function caller2() { target(); }
      function target() { callee(); }
      function callee() { }
    `;
    const program = createTestProgram({ "test.ts": code });
    const typeChecker = program.getTypeChecker();
    const locations = findFunction(program, "target");
    const targetFunction = locations[0];

    const graph = buildCallGraph({
      program,
      typeChecker,
      targetFunction,
      depth: 2,
      direction: "both",
    });

    expect(graph.callers).toContain("caller1");
    expect(graph.callers).toContain("caller2");
    expect(graph.callees).toContain("callee");
  });

  it("sets target node correctly", () => {
    const code = `
      function myFunction() { }
    `;
    const program = createTestProgram({ "test.ts": code });
    const typeChecker = program.getTypeChecker();
    const locations = findFunction(program, "myFunction");
    const targetFunction = locations[0];

    const graph = buildCallGraph({
      program,
      typeChecker,
      targetFunction,
      depth: 1,
      direction: "both",
    });

    expect(graph.targetNode.name).toBe("myFunction");
    expect(graph.targetNode.kind).toBe("function");
  });
});
