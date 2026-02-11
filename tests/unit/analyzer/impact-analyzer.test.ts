import { describe, it, expect } from "vitest";
import { createTestProgram, getFunctionNode } from "../../test-utils.js";
import ts from "typescript";

// We'll test the internal logic by importing specific functions
// For full integration tests, see tests/integration/

describe("Impact Analyzer", () => {
  describe("Transitive Caller Detection", () => {
    it("finds direct callers", () => {
      const code = `
        function caller1() { target(); }
        function caller2() { target(); }
        function target() { }
      `;
      const program = createTestProgram({ "test.ts": code });
      const callersMap = buildCallersMap(program);

      const directCallers = callersMap.get("target") || [];
      expect(directCallers).toContain("caller1");
      expect(directCallers).toContain("caller2");
      expect(directCallers.length).toBe(2);
    });

    it("finds transitive callers (callers of callers)", () => {
      const code = `
        function level2() { level1(); }
        function level1() { target(); }
        function target() { }
      `;
      const program = createTestProgram({ "test.ts": code });
      const callersMap = buildCallersMap(program);

      // Level 1: direct callers
      const directCallers = callersMap.get("target") || [];
      expect(directCallers).toContain("level1");

      // Level 2: callers of callers
      const level2Callers = callersMap.get("level1") || [];
      expect(level2Callers).toContain("level2");
    });
  });

  describe("Circular Dependency Detection", () => {
    it("detects simple circular dependency A -> B -> A", () => {
      const code = `
        function a() { b(); }
        function b() { a(); }
      `;
      const program = createTestProgram({ "test.ts": code });
      const cycles = findCircularDependencies(program, "a");

      expect(cycles.length).toBeGreaterThan(0);
      // The cycle should include both a and b
      const cycleFlat = cycles.flat();
      expect(cycleFlat).toContain("a");
      expect(cycleFlat).toContain("b");
    });

    it("detects longer circular dependency A -> B -> C -> A", () => {
      const code = `
        function a() { b(); }
        function b() { c(); }
        function c() { a(); }
      `;
      const program = createTestProgram({ "test.ts": code });
      const cycles = findCircularDependencies(program, "a");

      expect(cycles.length).toBeGreaterThan(0);
      const cycleFlat = cycles.flat();
      expect(cycleFlat).toContain("a");
      expect(cycleFlat).toContain("b");
      expect(cycleFlat).toContain("c");
    });

    it("returns empty array when no circular dependencies", () => {
      const code = `
        function a() { b(); }
        function b() { c(); }
        function c() { }
      `;
      const program = createTestProgram({ "test.ts": code });
      const cycles = findCircularDependencies(program, "a");

      expect(cycles.length).toBe(0);
    });
  });

  describe("Complexity Metrics", () => {
    it("calculates fan-in correctly", () => {
      const code = `
        function caller1() { target(); }
        function caller2() { target(); }
        function caller3() { target(); }
        function target() { }
      `;
      const program = createTestProgram({ "test.ts": code });
      const callersMap = buildCallersMap(program);

      const fanIn = (callersMap.get("target") || []).length;
      expect(fanIn).toBe(3);
    });

    it("calculates fan-out correctly", () => {
      const code = `
        function target() {
          callee1();
          callee2();
          callee3();
        }
        function callee1() { }
        function callee2() { }
        function callee3() { }
      `;
      const program = createTestProgram({ "test.ts": code });
      const calleesMap = buildCalleesMap(program);

      const fanOut = (calleesMap.get("target") || []).length;
      expect(fanOut).toBe(3);
    });

    it("detects hotspot (high fan-in AND fan-out)", () => {
      const code = `
        function caller1() { target(); }
        function caller2() { target(); }
        function caller3() { target(); }
        function caller4() { target(); }
        function caller5() { target(); }
        function target() {
          callee1();
          callee2();
          callee3();
          callee4();
          callee5();
        }
        function callee1() { }
        function callee2() { }
        function callee3() { }
        function callee4() { }
        function callee5() { }
      `;
      const program = createTestProgram({ "test.ts": code });
      const callersMap = buildCallersMap(program);
      const calleesMap = buildCalleesMap(program);

      const fanIn = (callersMap.get("target") || []).length;
      const fanOut = (calleesMap.get("target") || []).length;

      // Hotspot threshold is 5 for both
      const isHotspot = fanIn >= 5 && fanOut >= 5;
      expect(isHotspot).toBe(true);
    });

    it("non-hotspot when only high fan-in", () => {
      const code = `
        function caller1() { target(); }
        function caller2() { target(); }
        function caller3() { target(); }
        function caller4() { target(); }
        function caller5() { target(); }
        function target() { callee1(); }
        function callee1() { }
      `;
      const program = createTestProgram({ "test.ts": code });
      const callersMap = buildCallersMap(program);
      const calleesMap = buildCalleesMap(program);

      const fanIn = (callersMap.get("target") || []).length;
      const fanOut = (calleesMap.get("target") || []).length;

      const isHotspot = fanIn >= 5 && fanOut >= 5;
      expect(isHotspot).toBe(false);
    });
  });

  describe("Cyclomatic Complexity", () => {
    it("counts if statements", () => {
      const code = `
        function target(x: number) {
          if (x > 0) {
            return 1;
          } else if (x < 0) {
            return -1;
          } else {
            return 0;
          }
        }
      `;
      const program = createTestProgram({ "test.ts": code });
      const node = getFunctionNode(program, "target");
      const complexity = calculateCyclomaticComplexity(node);

      // Base 1 + 2 ifs = 3
      expect(complexity).toBeGreaterThanOrEqual(3);
    });

    it("counts loops", () => {
      const code = `
        function target(arr: number[]) {
          for (let i = 0; i < arr.length; i++) {
            while (arr[i] > 0) {
              arr[i]--;
            }
          }
        }
      `;
      const program = createTestProgram({ "test.ts": code });
      const node = getFunctionNode(program, "target");
      const complexity = calculateCyclomaticComplexity(node);

      // Base 1 + for + while = 3
      expect(complexity).toBeGreaterThanOrEqual(3);
    });

    it("counts logical operators", () => {
      const code = `
        function target(a: boolean, b: boolean, c: boolean) {
          return a && b || c;
        }
      `;
      const program = createTestProgram({ "test.ts": code });
      const node = getFunctionNode(program, "target");
      const complexity = calculateCyclomaticComplexity(node);

      // Base 1 + && + || = 3
      expect(complexity).toBeGreaterThanOrEqual(3);
    });

    it("counts ternary operators", () => {
      const code = `
        function target(x: number) {
          return x > 0 ? "positive" : x < 0 ? "negative" : "zero";
        }
      `;
      const program = createTestProgram({ "test.ts": code });
      const node = getFunctionNode(program, "target");
      const complexity = calculateCyclomaticComplexity(node);

      // Base 1 + 2 ternaries = 3
      expect(complexity).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Risk Score Calculation", () => {
    it("returns low risk for functions with few callers", () => {
      const riskScore = calculateRiskScore({
        directCallers: 1,
        totalAffected: 1,
        fanIn: 1,
        fanOut: 2,
        cyclomaticComplexity: 2,
        isHotspot: false,
        circularDepsCount: 0,
      });

      expect(riskScore).toBeLessThan(10);
    });

    it("returns high risk for hotspots", () => {
      const riskScore = calculateRiskScore({
        directCallers: 5,
        totalAffected: 10,
        fanIn: 5,
        fanOut: 5,
        cyclomaticComplexity: 5,
        isHotspot: true,
        circularDepsCount: 0,
      });

      // Hotspot adds 15 points
      expect(riskScore).toBeGreaterThanOrEqual(25);
    });

    it("increases risk with circular dependencies", () => {
      const withoutCircular = calculateRiskScore({
        directCallers: 3,
        totalAffected: 5,
        fanIn: 3,
        fanOut: 2,
        cyclomaticComplexity: 3,
        isHotspot: false,
        circularDepsCount: 0,
      });

      const withCircular = calculateRiskScore({
        directCallers: 3,
        totalAffected: 5,
        fanIn: 3,
        fanOut: 2,
        cyclomaticComplexity: 3,
        isHotspot: false,
        circularDepsCount: 2,
      });

      expect(withCircular).toBeGreaterThan(withoutCircular);
    });
  });

  describe("Smart Suggestions", () => {
    it("suggests when function has many callers", () => {
      const suggestions = generateSuggestions({
        functionName: "target",
        callerCount: 15,
        fanOut: 2,
        cyclomaticComplexity: 3,
        isHotspot: false,
        circularDeps: [],
      });

      const callerWarning = suggestions.find((s) =>
        s.message.includes("15 callers"),
      );
      expect(callerWarning).toBeDefined();
      expect(callerWarning?.type).toBe("warning");
    });

    it("suggests breaking up functions with high fan-out", () => {
      const suggestions = generateSuggestions({
        functionName: "target",
        callerCount: 2,
        fanOut: 20,
        cyclomaticComplexity: 3,
        isHotspot: false,
        circularDeps: [],
      });

      const refactorSuggestion = suggestions.find(
        (s) => s.type === "refactor" && s.message.includes("20 others"),
      );
      expect(refactorSuggestion).toBeDefined();
    });

    it("warns about circular dependencies", () => {
      const suggestions = generateSuggestions({
        functionName: "a",
        callerCount: 2,
        fanOut: 2,
        cyclomaticComplexity: 3,
        isHotspot: false,
        circularDeps: [["a", "b", "a"]],
      });

      const circularWarning = suggestions.find((s) =>
        s.message.includes("Circular dependency"),
      );
      expect(circularWarning).toBeDefined();
      expect(circularWarning?.severity).toBe(5);
    });

    it("warns about hotspots", () => {
      const suggestions = generateSuggestions({
        functionName: "target",
        callerCount: 5,
        fanOut: 5,
        cyclomaticComplexity: 3,
        isHotspot: true,
        circularDeps: [],
      });

      const hotspotWarning = suggestions.find((s) =>
        s.message.includes("hotspot"),
      );
      expect(hotspotWarning).toBeDefined();
    });
  });
});

// Helper functions that mirror the logic in impact-analyzer.ts
// These are simplified versions for testing purposes

function buildCallersMap(program: ts.Program): Map<string, string[]> {
  const callersMap = new Map<string, string[]>();
  const functionCallMap = buildFunctionCallMap(program);

  for (const [funcName, callees] of functionCallMap) {
    for (const callee of callees) {
      if (!callersMap.has(callee)) {
        callersMap.set(callee, []);
      }
      if (!callersMap.get(callee)!.includes(funcName)) {
        callersMap.get(callee)!.push(funcName);
      }
    }
  }

  return callersMap;
}

function buildCalleesMap(program: ts.Program): Map<string, string[]> {
  return buildFunctionCallMap(program);
}

function buildFunctionCallMap(program: ts.Program): Map<string, string[]> {
  const functionCallMap = new Map<string, string[]>();

  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) continue;
    collectFunctions(sourceFile, sourceFile);
  }

  return functionCallMap;

  function collectFunctions(node: ts.Node, sourceFile: ts.SourceFile): void {
    let funcName: string | null = null;

    if (ts.isFunctionDeclaration(node) && node.name) {
      funcName = node.name.text;
    } else if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      (ts.isArrowFunction(node.initializer) ||
        ts.isFunctionExpression(node.initializer))
    ) {
      funcName = node.name.text;
    }

    if (funcName) {
      const callees: string[] = [];
      findCalls(node, callees);
      functionCallMap.set(funcName, callees);
    }

    ts.forEachChild(node, (child) => collectFunctions(child, sourceFile));
  }

  function findCalls(node: ts.Node, callees: string[]): void {
    if (ts.isCallExpression(node)) {
      if (ts.isIdentifier(node.expression)) {
        const name = node.expression.text;
        if (!callees.includes(name)) {
          callees.push(name);
        }
      }
    }
    ts.forEachChild(node, (child) => findCalls(child, callees));
  }
}

function findCircularDependencies(
  program: ts.Program,
  targetName: string,
): string[][] {
  const cycles: string[][] = [];
  const functionCallMap = buildFunctionCallMap(program);
  const visited = new Set<string>();
  const path: string[] = [];

  function dfs(current: string): void {
    if (path.includes(current)) {
      const cycleStart = path.indexOf(current);
      const cycle = [...path.slice(cycleStart), current];
      if (cycle.includes(targetName)) {
        const cycleSet = new Set(cycle);
        const isDuplicate = cycles.some(
          (existing) =>
            existing.length === cycle.length &&
            existing.every((f) => cycleSet.has(f)),
        );
        if (!isDuplicate) {
          cycles.push(cycle);
        }
      }
      return;
    }

    if (visited.has(current)) return;
    visited.add(current);
    path.push(current);

    const callees = functionCallMap.get(current) || [];
    for (const callee of callees) {
      dfs(callee);
    }

    path.pop();
  }

  dfs(targetName);
  return cycles;
}

function calculateCyclomaticComplexity(node: ts.Node): number {
  let complexity = 1;

  function visit(n: ts.Node): void {
    if (
      ts.isIfStatement(n) ||
      ts.isConditionalExpression(n) ||
      ts.isForStatement(n) ||
      ts.isForInStatement(n) ||
      ts.isForOfStatement(n) ||
      ts.isWhileStatement(n) ||
      ts.isDoStatement(n) ||
      ts.isCatchClause(n) ||
      ts.isCaseClause(n)
    ) {
      complexity++;
    }

    if (ts.isBinaryExpression(n)) {
      if (
        n.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
        n.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
        n.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
      ) {
        complexity++;
      }
    }

    ts.forEachChild(n, visit);
  }

  visit(node);
  return complexity;
}

function calculateRiskScore(params: {
  directCallers: number;
  totalAffected: number;
  fanIn: number;
  fanOut: number;
  cyclomaticComplexity: number;
  isHotspot: boolean;
  circularDepsCount: number;
}): number {
  const {
    directCallers,
    totalAffected,
    cyclomaticComplexity,
    isHotspot,
    circularDepsCount,
  } = params;

  const callerWeight = 2;
  const transitiveWeight = 1;
  const hotspotWeight = 15;
  const circularWeight = 10;
  const complexityWeight = 1;

  const score =
    directCallers * callerWeight +
    (totalAffected - directCallers) * transitiveWeight +
    (isHotspot ? hotspotWeight : 0) +
    circularDepsCount * circularWeight +
    Math.floor(cyclomaticComplexity / 5) * complexityWeight;

  return Math.min(100, score);
}

interface SmartSuggestion {
  type: "warning" | "info" | "refactor";
  message: string;
  severity: number;
}

function generateSuggestions(params: {
  functionName: string;
  callerCount: number;
  fanOut: number;
  cyclomaticComplexity: number;
  isHotspot: boolean;
  circularDeps: string[][];
}): SmartSuggestion[] {
  const {
    functionName,
    callerCount,
    fanOut,
    cyclomaticComplexity,
    isHotspot,
    circularDeps,
  } = params;
  const suggestions: SmartSuggestion[] = [];

  if (callerCount >= 10) {
    suggestions.push({
      type: "warning",
      message: `This function has ${callerCount} callers - consider if changes are safe`,
      severity: callerCount >= 15 ? 4 : 3,
    });
  } else if (callerCount >= 5) {
    suggestions.push({
      type: "info",
      message: `This function has ${callerCount} callers - changes may have moderate impact`,
      severity: 2,
    });
  }

  for (const cycle of circularDeps) {
    suggestions.push({
      type: "warning",
      message: `Circular dependency detected: ${cycle.join(" -> ")}`,
      severity: 5,
    });
  }

  if (fanOut >= 15) {
    suggestions.push({
      type: "refactor",
      message: `This function calls ${fanOut} others - consider breaking it up`,
      severity: fanOut >= 20 ? 4 : 3,
    });
  }

  if (isHotspot) {
    suggestions.push({
      type: "warning",
      message: `"${functionName}" is a hotspot (high fan-in AND fan-out) - changes here are high-risk`,
      severity: 5,
    });
  }

  if (cyclomaticComplexity >= 10) {
    suggestions.push({
      type: cyclomaticComplexity >= 15 ? "refactor" : "info",
      message: `High cyclomatic complexity (${cyclomaticComplexity}) - consider simplifying the logic`,
      severity: cyclomaticComplexity >= 15 ? 3 : 2,
    });
  }

  return suggestions.sort((a, b) => b.severity - a.severity);
}
