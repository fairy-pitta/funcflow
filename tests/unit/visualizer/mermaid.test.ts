import { describe, it, expect } from "vitest";
import { generateMermaidDiagram } from "../../../src/visualizer/mermaid.js";
import { createTestGraph } from "../../test-utils.js";

describe("Mermaid Generator", () => {
  it("generates valid Mermaid syntax", () => {
    const graph = createTestGraph();
    const mermaid = generateMermaidDiagram(graph);

    expect(mermaid).toContain("graph TD");
    expect(mermaid).toContain("-->");
  });

  it("includes all nodes", () => {
    const graph = createTestGraph({
      nodes: ["a", "b", "c"],
      edges: [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
      ],
    });
    const mermaid = generateMermaidDiagram(graph);

    expect(mermaid).toContain("a[");
    expect(mermaid).toContain("b[");
    expect(mermaid).toContain("c[");
  });

  it("includes all edges", () => {
    const graph = createTestGraph({
      nodes: ["a", "b", "c"],
      edges: [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
      ],
    });
    const mermaid = generateMermaidDiagram(graph);

    expect(mermaid).toContain("a --> b");
    expect(mermaid).toContain("b --> c");
  });

  it("highlights target node", () => {
    const graph = createTestGraph({ targetName: "myTarget" });
    const mermaid = generateMermaidDiagram(graph);

    expect(mermaid).toMatch(/style.*myTarget.*fill:#f9f/);
  });

  it("sanitizes node IDs with special characters", () => {
    const graph = createTestGraph({
      targetName: "my-function",
      nodes: ["my-function", "another.function"],
      edges: [{ from: "my-function", to: "another.function" }],
      callers: [],
      callees: ["another.function"],
    });
    const mermaid = generateMermaidDiagram(graph);

    // Should use underscore instead of hyphen/dot
    expect(mermaid).toContain("my_function");
    expect(mermaid).toContain("another_function");
    expect(mermaid).not.toContain('["my-function"]');
  });

  it("handles empty graph", () => {
    const graph = createTestGraph({
      targetName: "alone",
      nodes: ["alone"],
      edges: [],
      callers: [],
      callees: [],
    });
    const mermaid = generateMermaidDiagram(graph);

    expect(mermaid).toContain("graph TD");
    expect(mermaid).toContain("alone");
  });
});
