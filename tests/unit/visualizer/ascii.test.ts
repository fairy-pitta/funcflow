import { describe, it, expect } from "vitest";
import { generateAsciiTree } from "../../../src/visualizer/ascii.js";
import { createTestGraph } from "../../test-utils.js";

describe("ASCII Tree Generator", () => {
  it("generates tree structure", () => {
    const graph = createTestGraph();
    const tree = generateAsciiTree(graph);

    expect(tree).toContain("├");
    expect(tree).toContain("└");
    expect(tree).toContain("●");
  });

  it("shows target function at top", () => {
    const graph = createTestGraph({ targetName: "myFunction" });
    const tree = generateAsciiTree(graph);

    const lines = tree.split("\n");
    expect(lines[0]).toContain("myFunction");
    expect(lines[0]).toContain("●");
  });

  it("shows callers section", () => {
    const graph = createTestGraph({
      callers: ["caller1", "caller2"],
    });
    const tree = generateAsciiTree(graph);

    expect(tree).toContain("Called by:");
    expect(tree).toContain("caller1");
    expect(tree).toContain("caller2");
  });

  it("shows callees section", () => {
    const graph = createTestGraph({
      callees: ["callee1", "callee2"],
    });
    const tree = generateAsciiTree(graph);

    expect(tree).toContain("Calls:");
    expect(tree).toContain("callee1");
    expect(tree).toContain("callee2");
  });

  it("handles empty callers", () => {
    const graph = createTestGraph({
      callers: [],
      callees: ["callee1"],
    });
    const tree = generateAsciiTree(graph);

    expect(tree).not.toContain("Called by:");
    expect(tree).toContain("Calls:");
  });

  it("handles empty callees", () => {
    const graph = createTestGraph({
      callers: ["caller1"],
      callees: [],
    });
    const tree = generateAsciiTree(graph);

    expect(tree).toContain("Called by:");
    expect(tree).not.toContain("Calls:");
  });
});
