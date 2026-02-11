import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { handleToolCall } from "../../../src/mcp/handlers.js";
import * as typescriptAnalyzer from "../../../src/analyzer/typescript-analyzer.js";
import * as impactAnalyzer from "../../../src/analyzer/impact-analyzer.js";
import * as mermaidVisualizer from "../../../src/visualizer/mermaid.js";
import * as asciiVisualizer from "../../../src/visualizer/ascii.js";
import * as jsonVisualizer from "../../../src/visualizer/json.js";
import { createTestGraph } from "../../test-utils.js";

// Mock all external dependencies
vi.mock("../../../src/analyzer/typescript-analyzer.js");
vi.mock("../../../src/analyzer/impact-analyzer.js");
vi.mock("../../../src/visualizer/mermaid.js");
vi.mock("../../../src/visualizer/ascii.js");
vi.mock("../../../src/visualizer/json.js");
vi.mock("../../../src/utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("MCP Handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  /**
   * Helper to create a CallToolRequest
   */
  function createRequest(
    name: string,
    args: Record<string, unknown>,
  ): CallToolRequest {
    return {
      method: "tools/call",
      params: {
        name,
        arguments: args,
      },
    };
  }

  describe("handleToolCall", () => {
    it("routes to analyze_function_calls handler", async () => {
      const mockGraph = createTestGraph({
        targetName: "testFunc",
        callers: ["caller1"],
        callees: ["callee1"],
      });
      vi.mocked(typescriptAnalyzer.analyzeCallGraph).mockResolvedValue(
        mockGraph,
      );
      vi.mocked(mermaidVisualizer.generateMermaidDiagram).mockReturnValue(
        "graph TD\n    testFunc --> callee1",
      );

      const request = createRequest("analyze_function_calls", {
        functionName: "testFunc",
        projectRoot: "/absolute/path",
      });

      const result = await handleToolCall(request);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toContain("testFunc");
    });

    it("routes to find_function handler", async () => {
      vi.mocked(typescriptAnalyzer.findFunctionDefinitions).mockResolvedValue([
        { file: "/path/test.ts", line: 10, column: 1, kind: "function" },
      ]);

      const request = createRequest("find_function", {
        functionName: "myFunc",
        projectRoot: "/absolute/path",
      });

      const result = await handleToolCall(request);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("myFunc");
    });

    it("routes to visualize_callgraph handler", async () => {
      const mockGraph = createTestGraph({ targetName: "vizFunc" });
      vi.mocked(typescriptAnalyzer.analyzeCallGraph).mockResolvedValue(
        mockGraph,
      );
      vi.mocked(mermaidVisualizer.generateMermaidDiagram).mockReturnValue(
        "graph TD",
      );

      const request = createRequest("visualize_callgraph", {
        functionName: "vizFunc",
        projectRoot: "/absolute/path",
        format: "mermaid",
      });

      const result = await handleToolCall(request);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("vizFunc");
    });

    it("returns error for unknown tool", async () => {
      const request = createRequest("unknown_tool", {});

      const result = await handleToolCall(request);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Error");
      expect(result.content[0].text).toContain("Unknown tool");
    });

    it("catches and formats errors from handlers", async () => {
      vi.mocked(typescriptAnalyzer.analyzeCallGraph).mockRejectedValue(
        new Error("Analysis failed"),
      );

      const request = createRequest("analyze_function_calls", {
        functionName: "test",
        projectRoot: "/absolute/path",
      });

      const result = await handleToolCall(request);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Error: Analysis failed");
    });

    it("handles non-Error exceptions", async () => {
      vi.mocked(typescriptAnalyzer.analyzeCallGraph).mockRejectedValue(
        "string error",
      );

      const request = createRequest("analyze_function_calls", {
        functionName: "test",
        projectRoot: "/absolute/path",
      });

      const result = await handleToolCall(request);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Error: string error");
    });
  });

  describe("handleAnalyzeFunctionCalls", () => {
    beforeEach(() => {
      const mockGraph = createTestGraph({
        targetName: "analyzedFunc",
        callers: ["callerA", "callerB"],
        callees: ["calleeX", "calleeY"],
      });
      vi.mocked(typescriptAnalyzer.analyzeCallGraph).mockResolvedValue(
        mockGraph,
      );
      vi.mocked(mermaidVisualizer.generateMermaidDiagram).mockReturnValue(
        "graph TD\n    test --> dep",
      );
    });

    it("analyzes function with valid inputs", async () => {
      const request = createRequest("analyze_function_calls", {
        functionName: "myFunction",
        projectRoot: "/absolute/project/path",
        depth: 3,
        direction: "both",
      });

      const result = await handleToolCall(request);

      expect(result.isError).toBeUndefined();
      expect(typescriptAnalyzer.analyzeCallGraph).toHaveBeenCalledWith({
        functionName: "myFunction",
        projectRoot: "/absolute/project/path",
        filePath: undefined,
        depth: 3,
        direction: "both",
      });
    });

    it("uses default depth when not provided", async () => {
      const request = createRequest("analyze_function_calls", {
        functionName: "myFunction",
        projectRoot: "/absolute/path",
      });

      await handleToolCall(request);

      expect(typescriptAnalyzer.analyzeCallGraph).toHaveBeenCalledWith(
        expect.objectContaining({ depth: 2 }),
      );
    });

    it("uses default direction when not provided", async () => {
      const request = createRequest("analyze_function_calls", {
        functionName: "myFunction",
        projectRoot: "/absolute/path",
      });

      await handleToolCall(request);

      expect(typescriptAnalyzer.analyzeCallGraph).toHaveBeenCalledWith(
        expect.objectContaining({ direction: "both" }),
      );
    });

    it("clamps depth to maximum of 10", async () => {
      const request = createRequest("analyze_function_calls", {
        functionName: "myFunction",
        projectRoot: "/absolute/path",
        depth: 100,
      });

      await handleToolCall(request);

      expect(typescriptAnalyzer.analyzeCallGraph).toHaveBeenCalledWith(
        expect.objectContaining({ depth: 10 }),
      );
    });

    it("clamps depth to minimum of 1", async () => {
      const request = createRequest("analyze_function_calls", {
        functionName: "myFunction",
        projectRoot: "/absolute/path",
        depth: 0,
      });

      await handleToolCall(request);

      expect(typescriptAnalyzer.analyzeCallGraph).toHaveBeenCalledWith(
        expect.objectContaining({ depth: 1 }),
      );
    });

    it("clamps negative depth to minimum of 1", async () => {
      const request = createRequest("analyze_function_calls", {
        functionName: "myFunction",
        projectRoot: "/absolute/path",
        depth: -5,
      });

      await handleToolCall(request);

      expect(typescriptAnalyzer.analyzeCallGraph).toHaveBeenCalledWith(
        expect.objectContaining({ depth: 1 }),
      );
    });

    it("handles non-numeric depth gracefully", async () => {
      const request = createRequest("analyze_function_calls", {
        functionName: "myFunction",
        projectRoot: "/absolute/path",
        depth: "invalid" as unknown as number,
      });

      await handleToolCall(request);

      expect(typescriptAnalyzer.analyzeCallGraph).toHaveBeenCalledWith(
        expect.objectContaining({ depth: 2 }),
      );
    });

    it("handles NaN depth gracefully", async () => {
      const request = createRequest("analyze_function_calls", {
        functionName: "myFunction",
        projectRoot: "/absolute/path",
        depth: NaN,
      });

      await handleToolCall(request);

      expect(typescriptAnalyzer.analyzeCallGraph).toHaveBeenCalledWith(
        expect.objectContaining({ depth: 2 }),
      );
    });

    it("floors fractional depth values", async () => {
      const request = createRequest("analyze_function_calls", {
        functionName: "myFunction",
        projectRoot: "/absolute/path",
        depth: 3.9,
      });

      await handleToolCall(request);

      expect(typescriptAnalyzer.analyzeCallGraph).toHaveBeenCalledWith(
        expect.objectContaining({ depth: 3 }),
      );
    });

    it("returns error when functionName is missing", async () => {
      const request = createRequest("analyze_function_calls", {
        projectRoot: "/absolute/path",
      });

      const result = await handleToolCall(request);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("functionName is required");
    });

    it("returns error when functionName is empty string", async () => {
      const request = createRequest("analyze_function_calls", {
        functionName: "",
        projectRoot: "/absolute/path",
      });

      const result = await handleToolCall(request);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("functionName is required");
    });

    it("returns error when functionName is not a string", async () => {
      const request = createRequest("analyze_function_calls", {
        functionName: 123,
        projectRoot: "/absolute/path",
      });

      const result = await handleToolCall(request);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("functionName is required");
    });

    it("returns error when projectRoot is missing", async () => {
      const request = createRequest("analyze_function_calls", {
        functionName: "myFunction",
      });

      const result = await handleToolCall(request);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("projectRoot is required");
    });

    it("returns error when projectRoot is not absolute", async () => {
      const request = createRequest("analyze_function_calls", {
        functionName: "myFunction",
        projectRoot: "relative/path",
      });

      const result = await handleToolCall(request);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("must be an absolute path");
    });

    it("returns error when projectRoot contains null bytes", async () => {
      const request = createRequest("analyze_function_calls", {
        functionName: "myFunction",
        projectRoot: "/path/with\0null",
      });

      const result = await handleToolCall(request);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("invalid characters");
    });

    it("validates filePath when provided", async () => {
      const request = createRequest("analyze_function_calls", {
        functionName: "myFunction",
        projectRoot: "/absolute/path",
        filePath: "relative/file.ts",
      });

      const result = await handleToolCall(request);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("filePath");
      expect(result.content[0].text).toContain("must be an absolute path");
    });

    it("accepts valid absolute filePath", async () => {
      const request = createRequest("analyze_function_calls", {
        functionName: "myFunction",
        projectRoot: "/absolute/path",
        filePath: "/absolute/path/file.ts",
      });

      const result = await handleToolCall(request);

      expect(result.isError).toBeUndefined();
      expect(typescriptAnalyzer.analyzeCallGraph).toHaveBeenCalledWith(
        expect.objectContaining({ filePath: "/absolute/path/file.ts" }),
      );
    });

    it("normalizes paths with . and .. segments", async () => {
      const request = createRequest("analyze_function_calls", {
        functionName: "myFunction",
        projectRoot: "/absolute/./path/../path",
      });

      await handleToolCall(request);

      expect(typescriptAnalyzer.analyzeCallGraph).toHaveBeenCalledWith(
        expect.objectContaining({ projectRoot: "/absolute/path" }),
      );
    });

    it("includes mermaid diagram in response", async () => {
      const request = createRequest("analyze_function_calls", {
        functionName: "myFunction",
        projectRoot: "/absolute/path",
      });

      const result = await handleToolCall(request);

      expect(result.content[0].text).toContain("```mermaid");
      expect(mermaidVisualizer.generateMermaidDiagram).toHaveBeenCalled();
    });

    it("includes caller summary in response", async () => {
      const request = createRequest("analyze_function_calls", {
        functionName: "myFunction",
        projectRoot: "/absolute/path",
      });

      const result = await handleToolCall(request);

      expect(result.content[0].text).toContain("Callers (Fan-In):");
      expect(result.content[0].text).toContain("callerA");
    });

    it("includes callee summary in response", async () => {
      const request = createRequest("analyze_function_calls", {
        functionName: "myFunction",
        projectRoot: "/absolute/path",
      });

      const result = await handleToolCall(request);

      expect(result.content[0].text).toContain("Callees (Fan-Out):");
      expect(result.content[0].text).toContain("calleeX");
    });

    it("truncates long caller list with count", async () => {
      const manyCallers = Array.from({ length: 10 }, (_, i) => `caller${i}`);
      const mockGraph = createTestGraph({
        targetName: "myFunc",
        callers: manyCallers,
        callees: [],
      });
      vi.mocked(typescriptAnalyzer.analyzeCallGraph).mockResolvedValue(
        mockGraph,
      );

      const request = createRequest("analyze_function_calls", {
        functionName: "myFunction",
        projectRoot: "/absolute/path",
      });

      const result = await handleToolCall(request);

      expect(result.content[0].text).toContain("(+5 more)");
    });

    it("truncates long callee list with count", async () => {
      const manyCallees = Array.from({ length: 8 }, (_, i) => `callee${i}`);
      const mockGraph = createTestGraph({
        targetName: "myFunc",
        callers: [],
        callees: manyCallees,
      });
      vi.mocked(typescriptAnalyzer.analyzeCallGraph).mockResolvedValue(
        mockGraph,
      );

      const request = createRequest("analyze_function_calls", {
        functionName: "myFunction",
        projectRoot: "/absolute/path",
      });

      const result = await handleToolCall(request);

      expect(result.content[0].text).toContain("(+3 more)");
    });

    describe("insights and suggestions", () => {
      it("shows warning for high fan-in (15+ callers)", async () => {
        const manyCallers = Array.from({ length: 16 }, (_, i) => `caller${i}`);
        const mockGraph = createTestGraph({
          targetName: "myFunc",
          callers: manyCallers,
          callees: [],
        });
        vi.mocked(typescriptAnalyzer.analyzeCallGraph).mockResolvedValue(
          mockGraph,
        );

        const request = createRequest("analyze_function_calls", {
          functionName: "myFunction",
          projectRoot: "/absolute/path",
        });

        const result = await handleToolCall(request);

        expect(result.content[0].text).toContain("Insights");
        expect(result.content[0].text).toContain("[!]");
        expect(result.content[0].text).toContain("16 callers");
        expect(result.content[0].text).toContain("plan thorough testing");
      });

      it("shows warning for moderate fan-in (10-14 callers)", async () => {
        const callers = Array.from({ length: 12 }, (_, i) => `caller${i}`);
        const mockGraph = createTestGraph({
          targetName: "myFunc",
          callers,
          callees: [],
        });
        vi.mocked(typescriptAnalyzer.analyzeCallGraph).mockResolvedValue(
          mockGraph,
        );

        const request = createRequest("analyze_function_calls", {
          functionName: "myFunction",
          projectRoot: "/absolute/path",
        });

        const result = await handleToolCall(request);

        expect(result.content[0].text).toContain("12 callers");
        expect(result.content[0].text).toContain(
          "consider if changes are safe",
        );
      });

      it("shows info for moderate fan-in (5-9 callers)", async () => {
        const callers = Array.from({ length: 7 }, (_, i) => `caller${i}`);
        const mockGraph = createTestGraph({
          targetName: "myFunc",
          callers,
          callees: [],
        });
        vi.mocked(typescriptAnalyzer.analyzeCallGraph).mockResolvedValue(
          mockGraph,
        );

        const request = createRequest("analyze_function_calls", {
          functionName: "myFunction",
          projectRoot: "/absolute/path",
        });

        const result = await handleToolCall(request);

        expect(result.content[0].text).toContain("[i]");
        expect(result.content[0].text).toContain("moderate impact");
      });

      it("shows refactor suggestion for very high fan-out (20+)", async () => {
        const manyCallees = Array.from({ length: 22 }, (_, i) => `callee${i}`);
        const mockGraph = createTestGraph({
          targetName: "myFunc",
          callers: [],
          callees: manyCallees,
        });
        vi.mocked(typescriptAnalyzer.analyzeCallGraph).mockResolvedValue(
          mockGraph,
        );

        const request = createRequest("analyze_function_calls", {
          functionName: "myFunction",
          projectRoot: "/absolute/path",
        });

        const result = await handleToolCall(request);

        expect(result.content[0].text).toContain("[R]");
        expect(result.content[0].text).toContain("22 others");
        expect(result.content[0].text).toContain("smaller functions");
      });

      it("shows refactor suggestion for high fan-out (15-19)", async () => {
        const callees = Array.from({ length: 17 }, (_, i) => `callee${i}`);
        const mockGraph = createTestGraph({
          targetName: "myFunc",
          callers: [],
          callees,
        });
        vi.mocked(typescriptAnalyzer.analyzeCallGraph).mockResolvedValue(
          mockGraph,
        );

        const request = createRequest("analyze_function_calls", {
          functionName: "myFunction",
          projectRoot: "/absolute/path",
        });

        const result = await handleToolCall(request);

        expect(result.content[0].text).toContain("[R]");
        expect(result.content[0].text).toContain("17 others");
        expect(result.content[0].text).toContain("breaking it up");
      });

      it("shows info for moderate fan-out (10-14)", async () => {
        const callees = Array.from({ length: 12 }, (_, i) => `callee${i}`);
        const mockGraph = createTestGraph({
          targetName: "myFunc",
          callers: [],
          callees,
        });
        vi.mocked(typescriptAnalyzer.analyzeCallGraph).mockResolvedValue(
          mockGraph,
        );

        const request = createRequest("analyze_function_calls", {
          functionName: "myFunction",
          projectRoot: "/absolute/path",
        });

        const result = await handleToolCall(request);

        expect(result.content[0].text).toContain("12 other functions");
        expect(result.content[0].text).toContain("too many responsibilities");
      });

      it("shows hotspot warning for high fan-in AND fan-out", async () => {
        const callers = Array.from({ length: 6 }, (_, i) => `caller${i}`);
        const callees = Array.from({ length: 6 }, (_, i) => `callee${i}`);
        const mockGraph = createTestGraph({
          targetName: "hotspotFunc",
          callers,
          callees,
        });
        vi.mocked(typescriptAnalyzer.analyzeCallGraph).mockResolvedValue(
          mockGraph,
        );

        const request = createRequest("analyze_function_calls", {
          functionName: "hotspotFunc",
          projectRoot: "/absolute/path",
        });

        const result = await handleToolCall(request);

        expect(result.content[0].text).toContain("hotspot");
        expect(result.content[0].text).toContain("high-risk");
      });

      it("does not show insights for low fan-in and fan-out", async () => {
        const mockGraph = createTestGraph({
          targetName: "simpleFunc",
          callers: ["caller1", "caller2"],
          callees: ["callee1"],
        });
        vi.mocked(typescriptAnalyzer.analyzeCallGraph).mockResolvedValue(
          mockGraph,
        );

        const request = createRequest("analyze_function_calls", {
          functionName: "simpleFunc",
          projectRoot: "/absolute/path",
        });

        const result = await handleToolCall(request);

        expect(result.content[0].text).not.toContain("Insights");
      });

      it("sorts suggestions by severity (highest first)", async () => {
        // Create scenario with multiple suggestions
        const callers = Array.from({ length: 6 }, (_, i) => `caller${i}`);
        const callees = Array.from({ length: 6 }, (_, i) => `callee${i}`);
        const mockGraph = createTestGraph({
          targetName: "complexFunc",
          callers,
          callees,
        });
        vi.mocked(typescriptAnalyzer.analyzeCallGraph).mockResolvedValue(
          mockGraph,
        );

        const request = createRequest("analyze_function_calls", {
          functionName: "complexFunc",
          projectRoot: "/absolute/path",
        });

        const result = await handleToolCall(request);
        const text = result.content[0].text;

        // Hotspot warning (severity 5) should come before fan-in info (severity 2)
        const hotspotIndex = text.indexOf("hotspot");
        const fanInIndex = text.indexOf("moderate impact");

        expect(hotspotIndex).toBeLessThan(fanInIndex);
      });
    });
  });

  describe("handleFindFunction", () => {
    it("finds function with valid inputs", async () => {
      vi.mocked(typescriptAnalyzer.findFunctionDefinitions).mockResolvedValue([
        {
          file: "/project/src/utils.ts",
          line: 42,
          column: 1,
          kind: "function",
        },
      ]);

      const request = createRequest("find_function", {
        functionName: "helperFunc",
        projectRoot: "/project",
      });

      const result = await handleToolCall(request);

      expect(result.isError).toBeUndefined();
      expect(typescriptAnalyzer.findFunctionDefinitions).toHaveBeenCalledWith(
        "/project",
        "helperFunc",
      );
    });

    it("returns formatted location list", async () => {
      vi.mocked(typescriptAnalyzer.findFunctionDefinitions).mockResolvedValue([
        { file: "/project/src/a.ts", line: 10, column: 1, kind: "function" },
        { file: "/project/src/b.ts", line: 20, column: 1, kind: "arrow" },
      ]);

      const request = createRequest("find_function", {
        functionName: "myFunc",
        projectRoot: "/project",
      });

      const result = await handleToolCall(request);

      expect(result.content[0].text).toContain("2 definition(s)");
      expect(result.content[0].text).toContain("a.ts:10");
      expect(result.content[0].text).toContain("b.ts:20");
    });

    it("indicates function kind in results", async () => {
      vi.mocked(typescriptAnalyzer.findFunctionDefinitions).mockResolvedValue([
        { file: "/project/src/a.ts", line: 10, column: 1, kind: "method" },
      ]);

      const request = createRequest("find_function", {
        functionName: "myMethod",
        projectRoot: "/project",
      });

      const result = await handleToolCall(request);

      expect(result.content[0].text).toContain("(method)");
    });

    it("returns not found message when no definitions exist", async () => {
      vi.mocked(typescriptAnalyzer.findFunctionDefinitions).mockResolvedValue(
        [],
      );

      const request = createRequest("find_function", {
        functionName: "nonExistent",
        projectRoot: "/project",
      });

      const result = await handleToolCall(request);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("No definitions found");
      expect(result.content[0].text).toContain("nonExistent");
    });

    it("returns error when functionName is missing", async () => {
      const request = createRequest("find_function", {
        projectRoot: "/project",
      });

      const result = await handleToolCall(request);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("functionName is required");
    });

    it("returns error when functionName is empty", async () => {
      const request = createRequest("find_function", {
        functionName: "",
        projectRoot: "/project",
      });

      const result = await handleToolCall(request);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("functionName is required");
    });

    it("returns error when functionName is not a string", async () => {
      const request = createRequest("find_function", {
        functionName: { name: "object" },
        projectRoot: "/project",
      });

      const result = await handleToolCall(request);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("functionName is required");
    });

    it("returns error when projectRoot is missing", async () => {
      const request = createRequest("find_function", {
        functionName: "myFunc",
      });

      const result = await handleToolCall(request);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("projectRoot is required");
    });

    it("returns error when projectRoot is relative", async () => {
      const request = createRequest("find_function", {
        functionName: "myFunc",
        projectRoot: "./relative",
      });

      const result = await handleToolCall(request);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("must be an absolute path");
    });

    it("returns error when projectRoot is empty", async () => {
      const request = createRequest("find_function", {
        functionName: "myFunc",
        projectRoot: "",
      });

      const result = await handleToolCall(request);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("projectRoot is required");
    });
  });

  describe("handleVisualizeCallgraph", () => {
    beforeEach(() => {
      const mockGraph = createTestGraph({ targetName: "vizTarget" });
      vi.mocked(typescriptAnalyzer.analyzeCallGraph).mockResolvedValue(
        mockGraph,
      );
    });

    describe("mermaid format", () => {
      it("generates mermaid diagram", async () => {
        vi.mocked(mermaidVisualizer.generateMermaidDiagram).mockReturnValue(
          "graph TD\n    A --> B",
        );

        const request = createRequest("visualize_callgraph", {
          functionName: "myFunc",
          projectRoot: "/project",
          format: "mermaid",
        });

        const result = await handleToolCall(request);

        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain("```mermaid");
        expect(result.content[0].text).toContain("graph TD");
        expect(mermaidVisualizer.generateMermaidDiagram).toHaveBeenCalled();
      });

      it("includes function name in header", async () => {
        vi.mocked(mermaidVisualizer.generateMermaidDiagram).mockReturnValue(
          "graph TD",
        );

        const request = createRequest("visualize_callgraph", {
          functionName: "mySpecialFunc",
          projectRoot: "/project",
          format: "mermaid",
        });

        const result = await handleToolCall(request);

        expect(result.content[0].text).toContain("mySpecialFunc");
        expect(result.content[0].text).toContain("(mermaid)");
      });
    });

    describe("ascii format", () => {
      it("generates ascii tree", async () => {
        vi.mocked(asciiVisualizer.generateAsciiTree).mockReturnValue(
          "target\n├── caller1\n└── callee1",
        );

        const request = createRequest("visualize_callgraph", {
          functionName: "myFunc",
          projectRoot: "/project",
          format: "ascii",
        });

        const result = await handleToolCall(request);

        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain("```\n");
        expect(result.content[0].text).toContain("target");
        expect(asciiVisualizer.generateAsciiTree).toHaveBeenCalled();
      });

      it("indicates ascii format in header", async () => {
        vi.mocked(asciiVisualizer.generateAsciiTree).mockReturnValue("tree");

        const request = createRequest("visualize_callgraph", {
          functionName: "myFunc",
          projectRoot: "/project",
          format: "ascii",
        });

        const result = await handleToolCall(request);

        expect(result.content[0].text).toContain("(ascii)");
      });
    });

    describe("json format", () => {
      it("generates json output", async () => {
        const jsonOutput = JSON.stringify({
          target: { name: "myFunc" },
          callers: [],
          callees: [],
        });
        vi.mocked(jsonVisualizer.exportToJson).mockReturnValue(jsonOutput);

        const request = createRequest("visualize_callgraph", {
          functionName: "myFunc",
          projectRoot: "/project",
          format: "json",
        });

        const result = await handleToolCall(request);

        expect(result.isError).toBeUndefined();
        expect(result.content[0].text).toContain("```json");
        expect(result.content[0].text).toContain('"target"');
        expect(jsonVisualizer.exportToJson).toHaveBeenCalled();
      });

      it("indicates json format in header", async () => {
        vi.mocked(jsonVisualizer.exportToJson).mockReturnValue("{}");

        const request = createRequest("visualize_callgraph", {
          functionName: "myFunc",
          projectRoot: "/project",
          format: "json",
        });

        const result = await handleToolCall(request);

        expect(result.content[0].text).toContain("(json)");
      });
    });

    describe("invalid format", () => {
      it("returns error for unknown format", async () => {
        const request = createRequest("visualize_callgraph", {
          functionName: "myFunc",
          projectRoot: "/project",
          format: "xml",
        });

        const result = await handleToolCall(request);

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("format is required");
      });

      it("returns error when format is missing", async () => {
        const request = createRequest("visualize_callgraph", {
          functionName: "myFunc",
          projectRoot: "/project",
        });

        const result = await handleToolCall(request);

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("format is required");
      });

      it("returns error when format is empty", async () => {
        const request = createRequest("visualize_callgraph", {
          functionName: "myFunc",
          projectRoot: "/project",
          format: "",
        });

        const result = await handleToolCall(request);

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("format is required");
      });
    });

    describe("depth handling", () => {
      it("uses provided depth", async () => {
        vi.mocked(mermaidVisualizer.generateMermaidDiagram).mockReturnValue(
          "graph",
        );

        const request = createRequest("visualize_callgraph", {
          functionName: "myFunc",
          projectRoot: "/project",
          format: "mermaid",
          depth: 5,
        });

        await handleToolCall(request);

        expect(typescriptAnalyzer.analyzeCallGraph).toHaveBeenCalledWith(
          expect.objectContaining({ depth: 5 }),
        );
      });

      it("uses default depth when not provided", async () => {
        vi.mocked(mermaidVisualizer.generateMermaidDiagram).mockReturnValue(
          "graph",
        );

        const request = createRequest("visualize_callgraph", {
          functionName: "myFunc",
          projectRoot: "/project",
          format: "mermaid",
        });

        await handleToolCall(request);

        expect(typescriptAnalyzer.analyzeCallGraph).toHaveBeenCalledWith(
          expect.objectContaining({ depth: 2 }),
        );
      });

      it("clamps excessive depth", async () => {
        vi.mocked(mermaidVisualizer.generateMermaidDiagram).mockReturnValue(
          "graph",
        );

        const request = createRequest("visualize_callgraph", {
          functionName: "myFunc",
          projectRoot: "/project",
          format: "mermaid",
          depth: 50,
        });

        await handleToolCall(request);

        expect(typescriptAnalyzer.analyzeCallGraph).toHaveBeenCalledWith(
          expect.objectContaining({ depth: 10 }),
        );
      });
    });

    describe("direction handling", () => {
      it("uses provided direction", async () => {
        vi.mocked(mermaidVisualizer.generateMermaidDiagram).mockReturnValue(
          "graph",
        );

        const request = createRequest("visualize_callgraph", {
          functionName: "myFunc",
          projectRoot: "/project",
          format: "mermaid",
          direction: "callers",
        });

        await handleToolCall(request);

        expect(typescriptAnalyzer.analyzeCallGraph).toHaveBeenCalledWith(
          expect.objectContaining({ direction: "callers" }),
        );
      });

      it("uses default direction (both) when not provided", async () => {
        vi.mocked(mermaidVisualizer.generateMermaidDiagram).mockReturnValue(
          "graph",
        );

        const request = createRequest("visualize_callgraph", {
          functionName: "myFunc",
          projectRoot: "/project",
          format: "mermaid",
        });

        await handleToolCall(request);

        expect(typescriptAnalyzer.analyzeCallGraph).toHaveBeenCalledWith(
          expect.objectContaining({ direction: "both" }),
        );
      });

      it("accepts callees direction", async () => {
        vi.mocked(mermaidVisualizer.generateMermaidDiagram).mockReturnValue(
          "graph",
        );

        const request = createRequest("visualize_callgraph", {
          functionName: "myFunc",
          projectRoot: "/project",
          format: "mermaid",
          direction: "callees",
        });

        await handleToolCall(request);

        expect(typescriptAnalyzer.analyzeCallGraph).toHaveBeenCalledWith(
          expect.objectContaining({ direction: "callees" }),
        );
      });
    });

    describe("input validation", () => {
      it("returns error when functionName is missing", async () => {
        const request = createRequest("visualize_callgraph", {
          projectRoot: "/project",
          format: "mermaid",
        });

        const result = await handleToolCall(request);

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("functionName is required");
      });

      it("returns error when projectRoot is missing", async () => {
        const request = createRequest("visualize_callgraph", {
          functionName: "myFunc",
          format: "mermaid",
        });

        const result = await handleToolCall(request);

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("projectRoot is required");
      });

      it("returns error when projectRoot is relative", async () => {
        const request = createRequest("visualize_callgraph", {
          functionName: "myFunc",
          projectRoot: "relative/path",
          format: "mermaid",
        });

        const result = await handleToolCall(request);

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("must be an absolute path");
      });
    });
  });

  describe("handleAnalyzeImpact", () => {
    beforeEach(() => {
      vi.mocked(impactAnalyzer.analyzeImpact).mockResolvedValue({
        functionName: "testFunc",
        location: { file: "/project/test.ts", line: 10, column: 1 },
        riskScore: 3,
        riskLevel: "medium",
        directCallers: ["caller1", "caller2"],
        directCallees: ["callee1"],
        transitiveCallers: [
          { name: "caller1", depth: 1 },
          { name: "grandCaller1", depth: 2 },
        ],
        circularDependencies: [],
        complexity: {
          fanIn: 2,
          fanOut: 1,
          isHotspot: false,
        },
        suggestions: [],
      });
      vi.mocked(impactAnalyzer.formatImpactReport).mockReturnValue(
        "# Impact Analysis Report\n\nTest report content",
      );
    });

    it("routes to analyze_impact handler", async () => {
      const request = createRequest("analyze_impact", {
        functionName: "testFunc",
        projectRoot: "/project",
      });

      const result = await handleToolCall(request);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("Impact Analysis Report");
    });

    it("calls analyzeImpact with correct parameters", async () => {
      const request = createRequest("analyze_impact", {
        functionName: "myFunction",
        projectRoot: "/absolute/path",
        depth: 5,
      });

      await handleToolCall(request);

      expect(impactAnalyzer.analyzeImpact).toHaveBeenCalledWith({
        functionName: "myFunction",
        projectRoot: "/absolute/path",
        filePath: undefined,
        depth: 5,
        includeComplexity: true,
      });
    });

    it("uses default depth of 3 when not provided", async () => {
      const request = createRequest("analyze_impact", {
        functionName: "myFunction",
        projectRoot: "/absolute/path",
      });

      await handleToolCall(request);

      expect(impactAnalyzer.analyzeImpact).toHaveBeenCalledWith(
        expect.objectContaining({ depth: 3 }),
      );
    });

    it("validates filePath when provided", async () => {
      const request = createRequest("analyze_impact", {
        functionName: "myFunction",
        projectRoot: "/absolute/path",
        filePath: "/absolute/path/file.ts",
      });

      await handleToolCall(request);

      expect(impactAnalyzer.analyzeImpact).toHaveBeenCalledWith(
        expect.objectContaining({ filePath: "/absolute/path/file.ts" }),
      );
    });

    it("returns error when functionName is missing", async () => {
      const request = createRequest("analyze_impact", {
        projectRoot: "/project",
      });

      const result = await handleToolCall(request);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("functionName");
    });

    it("returns error when functionName is empty", async () => {
      const request = createRequest("analyze_impact", {
        functionName: "",
        projectRoot: "/project",
      });

      const result = await handleToolCall(request);

      expect(result.isError).toBe(true);
    });

    it("returns error when projectRoot is missing", async () => {
      const request = createRequest("analyze_impact", {
        functionName: "myFunc",
      });

      const result = await handleToolCall(request);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("projectRoot is required");
    });

    it("returns error when projectRoot is relative", async () => {
      const request = createRequest("analyze_impact", {
        functionName: "myFunc",
        projectRoot: "relative/path",
      });

      const result = await handleToolCall(request);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("must be an absolute path");
    });

    it("returns error when filePath is relative", async () => {
      const request = createRequest("analyze_impact", {
        functionName: "myFunc",
        projectRoot: "/absolute/path",
        filePath: "relative/file.ts",
      });

      const result = await handleToolCall(request);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("filePath");
      expect(result.content[0].text).toContain("must be an absolute path");
    });

    it("clamps excessive depth", async () => {
      const request = createRequest("analyze_impact", {
        functionName: "myFunc",
        projectRoot: "/project",
        depth: 100,
      });

      await handleToolCall(request);

      expect(impactAnalyzer.analyzeImpact).toHaveBeenCalledWith(
        expect.objectContaining({ depth: 10 }),
      );
    });

    it("calls formatImpactReport with analysis result", async () => {
      const request = createRequest("analyze_impact", {
        functionName: "myFunc",
        projectRoot: "/project",
      });

      await handleToolCall(request);

      expect(impactAnalyzer.formatImpactReport).toHaveBeenCalled();
    });

    it("handles errors from analyzeImpact", async () => {
      vi.mocked(impactAnalyzer.analyzeImpact).mockRejectedValue(
        new Error("Analysis failed"),
      );

      const request = createRequest("analyze_impact", {
        functionName: "myFunc",
        projectRoot: "/project",
      });

      const result = await handleToolCall(request);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Error: Analysis failed");
    });
  });
});
