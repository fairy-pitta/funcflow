import { describe, it, expect, beforeAll } from "vitest";
import path from "path";
import {
  parsePythonContent,
  findCallsInPythonFunction,
  isPythonBuiltIn,
} from "../../../src/analyzer/python/python-parser.js";
import {
  scanPythonProject,
  hasPythonFiles,
} from "../../../src/analyzer/python/python-scanner.js";
import {
  analyzePythonCallGraph,
  findPythonFunctionDefinitions,
} from "../../../src/analyzer/python/python-analyzer.js";

const FIXTURES_PATH = path.join(process.cwd(), "tests/fixtures/python");

describe("Python Scanner", () => {
  it("finds Python files in a directory", () => {
    const projectInfo = scanPythonProject(FIXTURES_PATH);

    expect(projectInfo.sourceFiles.length).toBeGreaterThan(0);
    expect(projectInfo.sourceFiles.every((f) => f.endsWith(".py"))).toBe(true);
  });

  it("detects Python files in directory", () => {
    const hasPy = hasPythonFiles(FIXTURES_PATH);
    expect(hasPy).toBe(true);
  });

  it("returns false for directory without Python files", () => {
    const tsFixtures = path.join(process.cwd(), "tests/fixtures/simple");
    const hasPy = hasPythonFiles(tsFixtures);
    expect(hasPy).toBe(false);
  });
});

describe("Python Parser", () => {
  describe("Function Parsing", () => {
    it("parses simple function definitions", () => {
      const code = `
def hello():
    pass

def greet(name):
    return f"Hello, {name}"
`;
      const result = parsePythonContent(code, "test.py");

      expect(result.functions).toHaveLength(2);
      expect(result.functions[0].name).toBe("hello");
      expect(result.functions[1].name).toBe("greet");
      expect(result.functions[1].parameters).toContain("name");
    });

    it("parses async function definitions", () => {
      const code = `
async def fetch_data():
    return await get_data()

async def process(data):
    result = await transform(data)
    return result
`;
      const result = parsePythonContent(code, "test.py");

      expect(result.functions).toHaveLength(2);
      expect(result.functions[0].kind).toBe("async_function");
      expect(result.functions[0].name).toBe("fetch_data");
    });

    it("parses function with decorators", () => {
      const code = `
@decorator
def decorated_func():
    pass

@property
@staticmethod
def multi_decorated():
    pass
`;
      const result = parsePythonContent(code, "test.py");

      expect(result.functions).toHaveLength(2);
      expect(result.functions[0].decorators).toContain("decorator");
      expect(result.functions[1].decorators).toContain("property");
      expect(result.functions[1].decorators).toContain("staticmethod");
    });

    it("parses function parameters correctly", () => {
      const code = `
def complex_params(a, b, c=None, *args, **kwargs):
    pass

def typed_params(x: int, y: str = "default") -> bool:
    return True
`;
      const result = parsePythonContent(code, "test.py");

      expect(result.functions[0].parameters).toEqual([
        "a",
        "b",
        "c",
        "*args",
        "**kwargs",
      ]);
      expect(result.functions[1].parameters).toEqual(["x", "y"]);
    });
  });

  describe("Class Parsing", () => {
    it("parses class definitions", () => {
      const code = `
class MyClass:
    def __init__(self):
        pass

    def method(self):
        pass
`;
      const result = parsePythonContent(code, "test.py");

      expect(result.classes).toHaveLength(1);
      expect(result.classes[0].name).toBe("MyClass");
      expect(result.classes[0].methods).toHaveLength(2);
    });

    it("parses class with inheritance", () => {
      const code = `
class Child(Parent):
    def child_method(self):
        pass

class MultiInherit(Base1, Base2):
    pass
`;
      const result = parsePythonContent(code, "test.py");

      expect(result.classes).toHaveLength(2);
      expect(result.classes[0].baseClasses).toContain("Parent");
      expect(result.classes[1].baseClasses).toContain("Base1");
      expect(result.classes[1].baseClasses).toContain("Base2");
    });

    it("identifies methods correctly", () => {
      const code = `
class Service:
    def public_method(self):
        self._private_helper()

    def _private_helper(self):
        pass

    async def async_method(self):
        pass
`;
      const result = parsePythonContent(code, "test.py");

      const methods = result.classes[0].methods;
      expect(methods).toHaveLength(3);
      expect(methods[0].kind).toBe("method");
      expect(methods[2].kind).toBe("async_method");
    });
  });

  describe("Import Parsing", () => {
    it("parses simple imports", () => {
      const code = `
import os
import json
import my_module
`;
      const result = parsePythonContent(code, "test.py");

      expect(result.imports).toHaveLength(3);
      expect(result.imports[0].module).toBe("os");
    });

    it("parses from imports", () => {
      const code = `
from typing import Dict, List
from pathlib import Path
from .local import helper
`;
      const result = parsePythonContent(code, "test.py");

      expect(result.imports.length).toBeGreaterThanOrEqual(2);
      const typingImport = result.imports.find((i) => i.module === "typing");
      expect(typingImport?.names).toContain("Dict");
      expect(typingImport?.names).toContain("List");
    });

    it("parses import with alias", () => {
      const code = `
import numpy as np
import pandas as pd
`;
      const result = parsePythonContent(code, "test.py");

      expect(result.imports[0].alias).toBe("np");
      expect(result.imports[1].alias).toBe("pd");
    });
  });

  describe("Function Call Detection", () => {
    it("finds direct function calls", () => {
      const code = `
def main():
    foo()
    bar()
    baz(x, y)
`;
      const result = parsePythonContent(code, "test.py");
      const mainFunc = result.functions.find((f) => f.name === "main");
      expect(mainFunc).toBeDefined();

      const calls = findCallsInPythonFunction(mainFunc!);

      expect(calls.length).toBeGreaterThanOrEqual(3);
      const callNames = calls.map((c) => c.calleeName);
      expect(callNames).toContain("foo");
      expect(callNames).toContain("bar");
      expect(callNames).toContain("baz");
    });

    it("finds method calls", () => {
      const code = `
def process():
    obj.method()
    service.do_something()
`;
      const result = parsePythonContent(code, "test.py");
      const processFunc = result.functions.find((f) => f.name === "process");
      const calls = findCallsInPythonFunction(processFunc!);

      expect(calls.some((c) => c.kind === "method")).toBe(true);
      expect(calls.some((c) => c.calleeName === "method")).toBe(true);
      expect(calls.some((c) => c.calleeName === "do_something")).toBe(true);
    });

    it("finds self method calls", () => {
      const code = `
class Service:
    def public(self):
        self._helper()
        self.another_method()

    def _helper(self):
        pass

    def another_method(self):
        pass
`;
      const result = parsePythonContent(code, "test.py");
      const publicMethod = result.functions.find((f) => f.name === "public");
      const calls = findCallsInPythonFunction(publicMethod!);

      const callNames = calls.map((c) => c.calleeName);
      expect(callNames).toContain("_helper");
      expect(callNames).toContain("another_method");
    });

    it("finds nested function calls", () => {
      const code = `
def nested():
    result = outer(inner(value))
    return result
`;
      const result = parsePythonContent(code, "test.py");
      const nestedFunc = result.functions.find((f) => f.name === "nested");
      const calls = findCallsInPythonFunction(nestedFunc!);

      const callNames = calls.map((c) => c.calleeName);
      expect(callNames).toContain("outer");
      expect(callNames).toContain("inner");
    });
  });

  describe("Built-in Detection", () => {
    it("identifies Python built-in functions", () => {
      expect(isPythonBuiltIn("print")).toBe(true);
      expect(isPythonBuiltIn("len")).toBe(true);
      expect(isPythonBuiltIn("range")).toBe(true);
      expect(isPythonBuiltIn("isinstance")).toBe(true);
    });

    it("does not mark user functions as built-ins", () => {
      expect(isPythonBuiltIn("my_function")).toBe(false);
      expect(isPythonBuiltIn("custom_helper")).toBe(false);
    });

    it("does not mark self/cls method calls as built-ins", () => {
      expect(isPythonBuiltIn("method", "self.method")).toBe(false);
      expect(isPythonBuiltIn("method", "cls.method")).toBe(false);
    });
  });
});

describe("Python Analyzer Integration", () => {
  it("finds function definitions in Python project", async () => {
    const locations = await findPythonFunctionDefinitions(
      FIXTURES_PATH,
      "process_data",
    );

    expect(locations.length).toBeGreaterThan(0);
    expect(locations[0].file).toContain("simple.py");
    expect(locations[0].kind).toBe("function");
  });

  it("finds method definitions in classes", async () => {
    const locations = await findPythonFunctionDefinitions(
      FIXTURES_PATH,
      "get_user",
    );

    expect(locations.length).toBeGreaterThan(0);
    expect(locations[0].file).toContain("classes.py");
  });

  it("analyzes call graph for a Python function", async () => {
    const graph = await analyzePythonCallGraph({
      functionName: "process_data",
      projectRoot: FIXTURES_PATH,
      depth: 2,
      direction: "both",
    });

    expect(graph.targetNode.name).toBe("process_data");
    expect(graph.callees.length).toBeGreaterThan(0);

    // process_data calls fetch_data and transform_data
    expect(graph.callees).toContain("fetch_data");
    expect(graph.callees).toContain("transform_data");
  });

  it("finds callers of a function", async () => {
    const graph = await analyzePythonCallGraph({
      functionName: "fetch_data",
      projectRoot: FIXTURES_PATH,
      depth: 2,
      direction: "callers",
    });

    expect(graph.targetNode.name).toBe("fetch_data");
    expect(graph.callers.length).toBeGreaterThan(0);
    expect(graph.callers).toContain("process_data");
  });

  it("analyzes method calls within a class", async () => {
    const graph = await analyzePythonCallGraph({
      functionName: "get_user",
      projectRoot: FIXTURES_PATH,
      depth: 2,
      direction: "callees",
    });

    expect(graph.targetNode.name).toBe("get_user");
    expect(graph.callees).toContain("_find_user_by_id");
  });

  it("handles function not found gracefully", async () => {
    await expect(
      analyzePythonCallGraph({
        functionName: "nonexistent_function",
        projectRoot: FIXTURES_PATH,
        depth: 2,
        direction: "both",
      }),
    ).rejects.toThrow(/not found/i);
  });

  it("respects depth limit", async () => {
    const depth1Graph = await analyzePythonCallGraph({
      functionName: "main",
      projectRoot: FIXTURES_PATH,
      depth: 1,
      direction: "callees",
    });

    const depth2Graph = await analyzePythonCallGraph({
      functionName: "main",
      projectRoot: FIXTURES_PATH,
      depth: 2,
      direction: "callees",
    });

    // Depth 2 should find more nodes
    expect(depth2Graph.nodes.size).toBeGreaterThanOrEqual(
      depth1Graph.nodes.size,
    );
  });
});
