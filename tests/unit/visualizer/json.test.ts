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

describe("Complexity Metrics", () => {
  it("includes complexity metrics in JSON output", () => {
    const graph = createTestGraph();
    const json = exportToJson(graph);

    const parsed = JSON.parse(json);
    expect(parsed).toHaveProperty("complexity");
    expect(parsed.complexity).toHaveProperty("fanIn");
    expect(parsed.complexity).toHaveProperty("fanOut");
    expect(parsed.complexity).toHaveProperty("isHotspot");
    expect(parsed.complexity).toHaveProperty("hotspotScore");
  });

  it("calculates fan-in correctly", () => {
    const graph = createTestGraph({
      targetName: "target",
      callers: ["caller1", "caller2", "caller3"],
      callees: ["callee1"],
    });
    const json = exportToJson(graph);

    const parsed = JSON.parse(json);
    expect(parsed.complexity.fanIn).toBe(3);
  });

  it("calculates fan-out correctly", () => {
    const graph = createTestGraph({
      targetName: "target",
      callers: ["caller1"],
      callees: ["callee1", "callee2", "callee3"],
    });
    const json = exportToJson(graph);

    const parsed = JSON.parse(json);
    expect(parsed.complexity.fanOut).toBe(3);
  });

  it("detects hotspot when fan-in >= 5 and fan-out >= 5", () => {
    const graph = createTestGraph({
      targetName: "target",
      callers: ["c1", "c2", "c3", "c4", "c5"],
      callees: ["e1", "e2", "e3", "e4", "e5"],
    });
    const json = exportToJson(graph);

    const parsed = JSON.parse(json);
    expect(parsed.complexity.isHotspot).toBe(true);
    expect(parsed.complexity.hotspotScore).toBeGreaterThan(0);
  });

  it("does not detect hotspot when only fan-in is high", () => {
    const graph = createTestGraph({
      targetName: "target",
      callers: ["c1", "c2", "c3", "c4", "c5"],
      callees: ["e1"],
    });
    const json = exportToJson(graph);

    const parsed = JSON.parse(json);
    expect(parsed.complexity.isHotspot).toBe(false);
  });
});

describe("Circular Dependency Detection", () => {
  it("includes circularDependencies in JSON output", () => {
    const graph = createTestGraph();
    const json = exportToJson(graph);

    const parsed = JSON.parse(json);
    expect(parsed).toHaveProperty("circularDependencies");
    expect(Array.isArray(parsed.circularDependencies)).toBe(true);
  });

  it("detects circular dependency A -> B -> A", () => {
    // Create a graph with circular edges
    const graph = createTestGraph({
      targetName: "a",
      nodes: ["a", "b"],
      edges: [
        { from: "a", to: "b" },
        { from: "b", to: "a" },
      ],
      callers: ["b"],
      callees: ["b"],
    });
    const json = exportToJson(graph);

    const parsed = JSON.parse(json);
    expect(parsed.circularDependencies.length).toBeGreaterThan(0);
  });

  it("returns empty array when no circular dependencies", () => {
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
    expect(parsed.circularDependencies.length).toBe(0);
  });
});

describe("Smart Suggestions", () => {
  it("includes suggestions in JSON output", () => {
    const graph = createTestGraph();
    const json = exportToJson(graph);

    const parsed = JSON.parse(json);
    expect(parsed).toHaveProperty("suggestions");
    expect(Array.isArray(parsed.suggestions)).toBe(true);
  });

  it("generates warning for high caller count", () => {
    const graph = createTestGraph({
      targetName: "target",
      callers: ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "c10"],
      callees: [],
    });
    const json = exportToJson(graph);

    const parsed = JSON.parse(json);
    const callerWarning = parsed.suggestions.find((s: { message: string }) =>
      s.message.includes("10 callers"),
    );
    expect(callerWarning).toBeDefined();
    expect(callerWarning.type).toBe("warning");
  });

  it("generates refactor suggestion for high fan-out", () => {
    const callees = Array.from({ length: 20 }, (_, i) => `e${i + 1}`);
    const graph = createTestGraph({
      targetName: "target",
      callers: [],
      callees,
    });
    const json = exportToJson(graph);

    const parsed = JSON.parse(json);
    const refactorSuggestion = parsed.suggestions.find(
      (s: { type: string; message: string }) =>
        s.type === "refactor" && s.message.includes("20 others"),
    );
    expect(refactorSuggestion).toBeDefined();
  });

  it("generates hotspot warning", () => {
    const graph = createTestGraph({
      targetName: "target",
      callers: ["c1", "c2", "c3", "c4", "c5"],
      callees: ["e1", "e2", "e3", "e4", "e5"],
    });
    const json = exportToJson(graph);

    const parsed = JSON.parse(json);
    const hotspotWarning = parsed.suggestions.find((s: { message: string }) =>
      s.message.includes("hotspot"),
    );
    expect(hotspotWarning).toBeDefined();
    expect(hotspotWarning.severity).toBe(5);
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
