import { describe, it, expect } from "vitest";
import { analyzeCallGraph } from "../../src/analyzer/typescript-analyzer.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("End-to-End Analysis", () => {
  const fixturesPath = path.join(__dirname, "../fixtures");

  it("analyzes simple fixture", async () => {
    const projectRoot = path.join(fixturesPath, "simple");

    const graph = await analyzeCallGraph({
      functionName: "processData",
      projectRoot,
      depth: 2,
      direction: "both",
    });

    expect(graph.nodes.size).toBeGreaterThan(0);
    expect(graph.targetNode.name).toBe("processData");
  });

  it("finds callers correctly", async () => {
    const projectRoot = path.join(fixturesPath, "simple");

    const graph = await analyzeCallGraph({
      functionName: "processData",
      projectRoot,
      depth: 2,
      direction: "callers",
    });

    expect(graph.callers).toContain("main");
  });

  it("finds callees correctly", async () => {
    const projectRoot = path.join(fixturesPath, "simple");

    const graph = await analyzeCallGraph({
      functionName: "processData",
      projectRoot,
      depth: 2,
      direction: "callees",
    });

    expect(graph.callees).toContain("fetchData");
    expect(graph.callees).toContain("transformData");
  });

  it("handles complex fixture with cycles", async () => {
    const projectRoot = path.join(fixturesPath, "complex");

    const graph = await analyzeCallGraph({
      functionName: "a",
      projectRoot,
      depth: 3,
      direction: "both",
    });

    // Should not infinite loop due to circular a -> b -> a
    expect(graph.nodes.size).toBeGreaterThan(0);
  });

  it("analyzes TypeScript features", async () => {
    const projectRoot = path.join(fixturesPath, "typescript");

    const graph = await analyzeCallGraph({
      functionName: "genericFunction",
      projectRoot,
      depth: 2,
      direction: "callees",
    });

    expect(graph.nodes.size).toBeGreaterThan(0);
    expect(graph.callees).toContain("processGeneric");
  });

  it("throws error for non-existent function", async () => {
    const projectRoot = path.join(fixturesPath, "simple");

    await expect(
      analyzeCallGraph({
        functionName: "nonExistentFunction",
        projectRoot,
        depth: 2,
        direction: "both",
      }),
    ).rejects.toThrow(/not found/);
  });

  it("respects depth parameter", async () => {
    const projectRoot = path.join(fixturesPath, "simple");

    const shallowGraph = await analyzeCallGraph({
      functionName: "main",
      projectRoot,
      depth: 1,
      direction: "callees",
    });

    const deepGraph = await analyzeCallGraph({
      functionName: "main",
      projectRoot,
      depth: 3,
      direction: "callees",
    });

    // Deeper analysis should find more nodes (or same if fully explored)
    expect(deepGraph.nodes.size).toBeGreaterThanOrEqual(
      shallowGraph.nodes.size,
    );
  });
});
