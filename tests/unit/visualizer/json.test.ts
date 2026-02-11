import { describe, it, expect } from "vitest";
import {
  exportToJson,
  exportToCompactJson,
} from "../../../src/visualizer/json.js";
import { createTestGraph } from "../../test-utils.js";

describe("JSON Exporter", () => {
  it("exports valid JSON", () => {
    const graph = createTestGraph();
    const json = exportToJson(graph);

    const parsed = JSON.parse(json);
    expect(parsed).toHaveProperty("target");
    expect(parsed).toHaveProperty("callers");
    expect(parsed).toHaveProperty("callees");
    expect(parsed).toHaveProperty("nodes");
    expect(parsed).toHaveProperty("edges");
    expect(parsed).toHaveProperty("statistics");
  });

  it("includes target information", () => {
    const graph = createTestGraph({ targetName: "myTarget" });
    const json = exportToJson(graph);

    const parsed = JSON.parse(json);
    expect(parsed.target.name).toBe("myTarget");
    expect(parsed.target.location).toBeDefined();
    expect(parsed.target.kind).toBeDefined();
  });

  it("includes all nodes", () => {
    const graph = createTestGraph({
      targetName: "a",
      nodes: ["a", "b", "c"],
      callers: [],
      callees: ["b", "c"],
    });
    const json = exportToJson(graph);

    const parsed = JSON.parse(json);
    expect(parsed.nodes).toHaveLength(3);
    const nodeNames = parsed.nodes.map((n: { name: string }) => n.name);
    expect(nodeNames).toContain("a");
    expect(nodeNames).toContain("b");
    expect(nodeNames).toContain("c");
  });

  it("includes all edges", () => {
    const graph = createTestGraph({
      edges: [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
      ],
    });
    const json = exportToJson(graph);

    const parsed = JSON.parse(json);
    expect(parsed.edges).toHaveLength(2);
    expect(parsed.edges[0]).toHaveProperty("from");
    expect(parsed.edges[0]).toHaveProperty("to");
    expect(parsed.edges[0]).toHaveProperty("location");
  });

  it("calculates statistics", () => {
    const graph = createTestGraph({
      targetName: "a",
      nodes: ["a", "b", "c"],
      edges: [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
      ],
      callers: [],
      callees: ["b"],
    });
    const json = exportToJson(graph);

    const parsed = JSON.parse(json);
    expect(parsed.statistics.totalNodes).toBe(3);
    expect(parsed.statistics.totalEdges).toBe(2);
    expect(parsed.statistics.maxDepth).toBeGreaterThanOrEqual(0);
  });

  it("formats JSON with indentation", () => {
    const graph = createTestGraph();
    const json = exportToJson(graph);

    // Pretty printed JSON has newlines
    expect(json).toContain("\n");
    expect(json).toContain("  ");
  });
});

describe("Compact JSON Exporter", () => {
  it("exports single-line JSON", () => {
    const graph = createTestGraph();
    const json = exportToCompactJson(graph);

    // Compact JSON has no newlines
    expect(json).not.toContain("\n");
  });

  it("includes essential information only", () => {
    const graph = createTestGraph({ targetName: "myFunc" });
    const json = exportToCompactJson(graph);

    const parsed = JSON.parse(json);
    expect(parsed.target).toBe("myFunc");
    expect(parsed.callers).toBeDefined();
    expect(parsed.callees).toBeDefined();
    expect(parsed.nodeCount).toBeDefined();
    expect(parsed.edgeCount).toBeDefined();
  });
});
