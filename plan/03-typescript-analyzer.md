# TypeScript Static Analysis Implementation Plan

## Overview

The TypeScript analyzer is the core component that parses source code, builds ASTs, resolves symbols, and identifies function call relationships.

## Goals

1. Find function/method declarations by name
2. Identify all call expressions within a function
3. Resolve call targets (handle imports, method chains, etc.)
4. Support TypeScript, JavaScript, TSX, JSX
5. Handle edge cases (arrow functions, class methods, etc.)

## TypeScript Compiler API Basics

### Key Concepts

```typescript
import ts from "typescript";

// Create program from tsconfig
const program = ts.createProgram(fileNames, compilerOptions);

// Get type checker (for symbol resolution)
const typeChecker = program.getTypeChecker();

// Get source file
const sourceFile = program.getSourceFile("file.ts");

// Visit AST nodes
ts.forEachChild(sourceFile, visit);
```

### Node Types We Care About

- `FunctionDeclaration` - function foo() {}
- `MethodDeclaration` - class methods
- `ArrowFunction` - const foo = () => {}
- `FunctionExpression` - const foo = function() {}
- `CallExpression` - foo(), obj.method()
- `PropertyAccessExpression` - obj.property
- `Identifier` - variable names

## Implementation

### 1. Project Scanner

```typescript
// src/analyzer/project-scanner.ts
import ts from "typescript";
import path from "path";
import fs from "fs";

export interface ProjectInfo {
  rootDir: string;
  tsConfigPath?: string;
  sourceFiles: string[];
  compilerOptions: ts.CompilerOptions;
}

export function scanProject(projectRoot: string): ProjectInfo {
  // Find tsconfig.json
  const tsConfigPath = ts.findConfigFile(
    projectRoot,
    ts.sys.fileExists,
    "tsconfig.json",
  );

  let compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    jsx: ts.JsxEmit.React,
    allowJs: true,
    esModuleInterop: true,
  };

  let sourceFiles: string[] = [];

  if (tsConfigPath) {
    // Parse tsconfig
    const configFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
    const parsedConfig = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      path.dirname(tsConfigPath),
    );
    compilerOptions = parsedConfig.options;
    sourceFiles = parsedConfig.fileNames;
  } else {
    // Fallback: scan for .ts/.tsx/.js/.jsx files
    sourceFiles = findSourceFiles(projectRoot);
  }

  return {
    rootDir: projectRoot,
    tsConfigPath,
    sourceFiles,
    compilerOptions,
  };
}

function findSourceFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    // Skip node_modules, dist, build, etc.
    if (
      entry.name === "node_modules" ||
      entry.name === "dist" ||
      entry.name === "build" ||
      entry.name === ".git"
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...findSourceFiles(fullPath));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if ([".ts", ".tsx", ".js", ".jsx"].includes(ext)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}
```

### 2. Function Finder

```typescript
// src/analyzer/function-finder.ts
import ts from "typescript";

export interface FunctionLocation {
  name: string;
  filePath: string;
  line: number;
  column: number;
  kind: "function" | "method" | "arrow" | "expression";
  node: ts.Node;
}

export function findFunction(
  program: ts.Program,
  functionName: string,
  filePath?: string,
): FunctionLocation[] {
  const results: FunctionLocation[] = [];
  const sourceFiles = filePath
    ? [program.getSourceFile(filePath)].filter(Boolean)
    : program.getSourceFiles().filter((sf) => !sf.isDeclarationFile);

  for (const sourceFile of sourceFiles) {
    visit(sourceFile);
  }

  return results;

  function visit(node: ts.Node) {
    // Function declaration: function foo() {}
    if (ts.isFunctionDeclaration(node) && node.name) {
      if (node.name.text === functionName) {
        results.push(createLocation(node, "function", sourceFile));
      }
    }

    // Method declaration: class { foo() {} }
    else if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
      if (node.name.text === functionName) {
        results.push(createLocation(node, "method", sourceFile));
      }
    }

    // Variable with function: const foo = () => {}
    else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      if (node.name.text === functionName && node.initializer) {
        if (
          ts.isArrowFunction(node.initializer) ||
          ts.isFunctionExpression(node.initializer)
        ) {
          const kind = ts.isArrowFunction(node.initializer)
            ? "arrow"
            : "expression";
          results.push(createLocation(node, kind, sourceFile));
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  function createLocation(
    node: ts.Node,
    kind: FunctionLocation["kind"],
    sourceFile: ts.SourceFile,
  ): FunctionLocation {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(
      node.getStart(),
    );
    return {
      name: functionName,
      filePath: sourceFile.fileName,
      line: line + 1,
      column: character + 1,
      kind,
      node,
    };
  }
}
```

### 3. Call Expression Analyzer

```typescript
// src/analyzer/call-analyzer.ts
import ts from "typescript";

export interface CallInfo {
  calleeName: string;
  location: {
    file: string;
    line: number;
    column: number;
  };
  kind: "direct" | "method" | "chained";
  fullExpression: string;
}

export function findCallsInFunction(
  functionNode: ts.Node,
  sourceFile: ts.SourceFile,
  typeChecker: ts.TypeChecker,
): CallInfo[] {
  const calls: CallInfo[] = [];

  visit(functionNode);

  return calls;

  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      const callInfo = analyzeCallExpression(node, sourceFile, typeChecker);
      if (callInfo) {
        calls.push(callInfo);
      }
    }

    ts.forEachChild(node, visit);
  }
}

function analyzeCallExpression(
  call: ts.CallExpression,
  sourceFile: ts.SourceFile,
  typeChecker: ts.TypeChecker,
): CallInfo | null {
  const expression = call.expression;
  const fullText = expression.getText(sourceFile);
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(
    call.getStart(),
  );

  // Direct call: foo()
  if (ts.isIdentifier(expression)) {
    return {
      calleeName: expression.text,
      location: {
        file: sourceFile.fileName,
        line: line + 1,
        column: character + 1,
      },
      kind: "direct",
      fullExpression: fullText,
    };
  }

  // Method call: obj.foo()
  else if (ts.isPropertyAccessExpression(expression)) {
    const methodName = expression.name.text;

    // Try to resolve the symbol
    const symbol = typeChecker.getSymbolAtLocation(expression.name);
    const resolvedName = symbol?.getName() || methodName;

    return {
      calleeName: resolvedName,
      location: {
        file: sourceFile.fileName,
        line: line + 1,
        column: character + 1,
      },
      kind: "method",
      fullExpression: fullText,
    };
  }

  // Chained call: obj.method1().method2()
  else if (ts.isCallExpression(expression)) {
    return {
      calleeName: fullText,
      location: {
        file: sourceFile.fileName,
        line: line + 1,
        column: character + 1,
      },
      kind: "chained",
      fullExpression: fullText,
    };
  }

  return null;
}
```

### 4. Main Analyzer Interface

```typescript
// src/analyzer/typescript-analyzer.ts
import ts from "typescript";
import { scanProject } from "./project-scanner.js";
import { findFunction } from "./function-finder.js";
import { findCallsInFunction } from "./call-analyzer.js";
import { CallGraph, buildCallGraph } from "../graph/builder.js";

export interface AnalyzeOptions {
  functionName: string;
  projectRoot: string;
  filePath?: string;
  depth: number;
  direction: "callers" | "callees" | "both";
}

export async function analyzeCallGraph(
  options: AnalyzeOptions,
): Promise<CallGraph> {
  const { functionName, projectRoot, filePath, depth, direction } = options;

  // 1. Scan project
  const projectInfo = scanProject(projectRoot);

  // 2. Create TypeScript program
  const program = ts.createProgram(
    projectInfo.sourceFiles,
    projectInfo.compilerOptions,
  );

  const typeChecker = program.getTypeChecker();

  // 3. Find target function
  const locations = findFunction(program, functionName, filePath);

  if (locations.length === 0) {
    throw new Error(`Function "${functionName}" not found`);
  }

  // If multiple locations, use the first one (or let user specify)
  const targetLocation = locations[0];

  // 4. Build call graph
  const graph = buildCallGraph({
    program,
    typeChecker,
    targetFunction: targetLocation,
    depth,
    direction,
  });

  return graph;
}
```

## Edge Cases to Handle

### 1. Dynamic Imports

```typescript
// Skip for MVP
const module = await import("./module.js");
module.foo();
```

### 2. Method Chaining

```typescript
// Track as "chained" call
obj.method1().method2().method3();
```

### 3. Callbacks

```typescript
// Track the callback name
array.map(transformItem); // → calls "transformItem"
```

### 4. Destructured Imports

```typescript
import { foo } from "./module";
foo(); // Should resolve to module.foo
```

### 5. Renamed Imports

```typescript
import { foo as bar } from "./module";
bar(); // Should resolve to module.foo
```

## Performance Optimizations

1. **Cache TypeScript Program**
   - Reuse program for multiple analyses in same session
   - Invalidate on file changes

2. **Parallel Processing**
   - Analyze multiple source files in parallel (future)

3. **Early Exit**
   - Stop traversing once depth limit is reached

4. **Skip Declaration Files**
   - `.d.ts` files don't contain implementations

## Testing Strategy

### Unit Tests

```typescript
describe("findFunction", () => {
  it("finds function declaration", () => {
    const code = `
      function getUserById(id: string) {
        return db.users.find(u => u.id === id);
      }
    `;
    const result = findFunction(program, "getUserById");
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe("function");
  });
});
```

### Integration Tests

- Test on real codebases
- Verify call graph accuracy
- Benchmark performance

## Next Steps

After completing the analyzer:

1. Implement graph builder (plan/04-graph-builder.md)
2. Implement visualizers (plan/05-visualizer.md)
3. Integrate with MCP server
