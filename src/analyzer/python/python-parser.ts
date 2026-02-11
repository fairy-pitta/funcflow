/**
 * Python Parser - Parse Python files using regex patterns
 * Finds function definitions, method definitions, function calls, and imports
 */

import fs from "fs";
import { logger } from "../../utils/logger.js";

export interface PythonFunctionLocation {
  name: string;
  filePath: string;
  line: number;
  column: number;
  kind: "function" | "method" | "async_function" | "async_method";
  className?: string;
  decorators: string[];
  parameters: string[];
  body: string;
  bodyStartLine: number;
  bodyEndLine: number;
}

export interface PythonCallInfo {
  calleeName: string;
  location: {
    file: string;
    line: number;
    column: number;
  };
  kind: "direct" | "method" | "chained";
  fullExpression: string;
}

export interface PythonImport {
  module: string;
  names: string[];
  alias?: string;
  line: number;
}

export interface PythonParseResult {
  functions: PythonFunctionLocation[];
  imports: PythonImport[];
  classes: PythonClassInfo[];
}

export interface PythonClassInfo {
  name: string;
  filePath: string;
  line: number;
  methods: PythonFunctionLocation[];
  baseClasses: string[];
}

/**
 * Parse a Python file and extract function definitions, imports, and classes
 */
export function parsePythonFile(filePath: string): PythonParseResult {
  const content = fs.readFileSync(filePath, "utf-8");
  return parsePythonContent(content, filePath);
}

/**
 * Parse Python content string
 */
export function parsePythonContent(
  content: string,
  filePath: string,
): PythonParseResult {
  const lines = content.split("\n");
  const functions: PythonFunctionLocation[] = [];
  const imports: PythonImport[] = [];
  const classes: PythonClassInfo[] = [];

  // Parse imports
  imports.push(...parseImports(lines, filePath));

  // Parse classes and their methods
  classes.push(...parseClasses(lines, filePath));

  // Parse top-level functions
  functions.push(...parseTopLevelFunctions(lines, filePath));

  // Add methods from classes to functions list
  for (const cls of classes) {
    functions.push(...cls.methods);
  }

  return { functions, imports, classes };
}

/**
 * Parse import statements
 */
function parseImports(lines: string[], _filePath: string): PythonImport[] {
  const imports: PythonImport[] = [];

  // Regex for 'import module' or 'import module as alias'
  const simpleImportRegex = /^import\s+(\w+(?:\.\w+)*)(?:\s+as\s+(\w+))?/;

  // Regex for 'from module import name1, name2' or 'from module import *'
  const fromImportRegex =
    /^from\s+(\w+(?:\.\w+)*)\s+import\s+(.+?)(?:\s*#.*)?$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;

    // Skip comments and empty lines
    if (line.startsWith("#") || line === "") continue;

    // Check simple import
    const simpleMatch = line.match(simpleImportRegex);
    if (simpleMatch) {
      imports.push({
        module: simpleMatch[1],
        names: [simpleMatch[1].split(".").pop() || simpleMatch[1]],
        alias: simpleMatch[2],
        line: lineNum,
      });
      continue;
    }

    // Check from import
    const fromMatch = line.match(fromImportRegex);
    if (fromMatch) {
      const module = fromMatch[1];
      const namesStr = fromMatch[2];

      // Parse imported names
      const names: string[] = [];
      if (namesStr === "*") {
        names.push("*");
      } else {
        // Handle 'name as alias' patterns
        const nameParts = namesStr.split(",").map((n) => n.trim());
        for (const part of nameParts) {
          const asMatch = part.match(/(\w+)(?:\s+as\s+(\w+))?/);
          if (asMatch) {
            names.push(asMatch[1]);
          }
        }
      }

      imports.push({
        module,
        names,
        line: lineNum,
      });
    }
  }

  return imports;
}

/**
 * Parse class definitions and their methods
 */
function parseClasses(lines: string[], filePath: string): PythonClassInfo[] {
  const classes: PythonClassInfo[] = [];

  // Regex for class definition
  const classRegex = /^class\s+(\w+)(?:\s*\((.*?)\))?:/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Skip lines that start with whitespace (inside a block)
    if (line.match(/^\s/) && line.trim() !== "") continue;

    const classMatch = line.match(classRegex);
    if (classMatch) {
      const className = classMatch[1];
      const baseClassesStr = classMatch[2] || "";
      const baseClasses = baseClassesStr
        .split(",")
        .map((b) => b.trim())
        .filter((b) => b !== "");

      // Find class body end
      const classIndent = getIndent(line);
      const classEndLine = findBlockEnd(lines, i, classIndent);

      // Parse methods inside the class
      const methods = parseMethodsInClass(
        lines.slice(i + 1, classEndLine),
        filePath,
        className,
        i + 2,
      );

      classes.push({
        name: className,
        filePath,
        line: lineNum,
        methods,
        baseClasses,
      });
    }
  }

  return classes;
}

/**
 * Parse methods inside a class
 */
function parseMethodsInClass(
  lines: string[],
  filePath: string,
  className: string,
  startLineOffset: number,
): PythonFunctionLocation[] {
  const methods: PythonFunctionLocation[] = [];

  // Regex for method definition (indented def)
  const methodRegex = /^(\s+)(async\s+)?def\s+(\w+)\s*\((.*?)\)\s*(?:->.*?)?:/;
  const decoratorRegex = /^(\s*)@(\w+(?:\.\w+)*(?:\(.*?\))?)/;

  let decorators: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = startLineOffset + i;

    // Check for decorators
    const decoratorMatch = line.match(decoratorRegex);
    if (decoratorMatch) {
      decorators.push(decoratorMatch[2]);
      continue;
    }

    const methodMatch = line.match(methodRegex);
    if (methodMatch) {
      const indent = methodMatch[1];
      const isAsync = !!methodMatch[2];
      const methodName = methodMatch[3];
      const paramsStr = methodMatch[4];

      // Parse parameters
      const parameters = parseParameters(paramsStr);

      // Find method body
      const methodIndent = indent.length;
      const bodyStartLine = lineNum;
      const bodyEndLine =
        findBlockEnd(lines, i, methodIndent) + startLineOffset;

      // Extract body
      const bodyLines = lines.slice(i + 1, bodyEndLine - startLineOffset + 1);
      const body = bodyLines.join("\n");

      const kind = isAsync ? "async_method" : "method";

      methods.push({
        name: methodName,
        filePath,
        line: lineNum,
        column: indent.length + 1,
        kind,
        className,
        decorators: [...decorators],
        parameters,
        body,
        bodyStartLine: bodyStartLine + 1,
        bodyEndLine,
      });

      // Reset decorators
      decorators = [];
    } else if (!line.match(/^\s*$/) && !line.match(/^\s*#/)) {
      // If we encounter a non-decorator, non-empty, non-comment line, reset decorators
      if (!decoratorMatch) {
        decorators = [];
      }
    }
  }

  return methods;
}

/**
 * Parse top-level function definitions
 */
function parseTopLevelFunctions(
  lines: string[],
  filePath: string,
): PythonFunctionLocation[] {
  const functions: PythonFunctionLocation[] = [];

  // Regex for top-level function definition (no leading whitespace)
  const functionRegex = /^(async\s+)?def\s+(\w+)\s*\((.*?)\)\s*(?:->.*?)?:/;
  const decoratorRegex = /^@(\w+(?:\.\w+)*(?:\(.*?\))?)/;

  let decorators: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Check for decorators (top-level)
    const decoratorMatch = line.match(decoratorRegex);
    if (decoratorMatch) {
      decorators.push(decoratorMatch[1]);
      continue;
    }

    // Skip indented lines (inside a block)
    if (line.match(/^\s/) && line.trim() !== "") {
      continue;
    }

    const functionMatch = line.match(functionRegex);
    if (functionMatch) {
      const isAsync = !!functionMatch[1];
      const functionName = functionMatch[2];
      const paramsStr = functionMatch[3];

      // Parse parameters
      const parameters = parseParameters(paramsStr);

      // Find function body end
      const bodyStartLine = lineNum;
      const bodyEndLine = findBlockEnd(lines, i, 0);

      // Extract body
      const bodyLines = lines.slice(i + 1, bodyEndLine + 1);
      const body = bodyLines.join("\n");

      const kind = isAsync ? "async_function" : "function";

      functions.push({
        name: functionName,
        filePath,
        line: lineNum,
        column: 1,
        kind,
        decorators: [...decorators],
        parameters,
        body,
        bodyStartLine: bodyStartLine + 1,
        bodyEndLine,
      });

      // Reset decorators
      decorators = [];
    } else if (!line.match(/^\s*$/) && !line.match(/^\s*#/)) {
      // If we encounter a non-decorator, non-empty, non-comment line, reset decorators
      decorators = [];
    }
  }

  return functions;
}

/**
 * Parse function parameters string
 */
function parseParameters(paramsStr: string): string[] {
  if (!paramsStr.trim()) return [];

  const params: string[] = [];
  let current = "";
  let depth = 0;

  for (const char of paramsStr) {
    if (char === "(" || char === "[" || char === "{") {
      depth++;
      current += char;
    } else if (char === ")" || char === "]" || char === "}") {
      depth--;
      current += char;
    } else if (char === "," && depth === 0) {
      const paramName = current.split(":")[0].split("=")[0].trim();
      if (paramName) params.push(paramName);
      current = "";
    } else {
      current += char;
    }
  }

  // Don't forget the last parameter
  if (current.trim()) {
    const paramName = current.split(":")[0].split("=")[0].trim();
    if (paramName) params.push(paramName);
  }

  return params;
}

/**
 * Find function calls within a function body
 */
export function findCallsInPythonFunction(
  func: PythonFunctionLocation,
): PythonCallInfo[] {
  const calls: PythonCallInfo[] = [];
  const seenCalls = new Set<string>();

  const bodyLines = func.body.split("\n");

  for (let i = 0; i < bodyLines.length; i++) {
    const line = bodyLines[i];
    const lineNum = func.bodyStartLine + i;

    // Skip comments and empty lines
    if (line.trim().startsWith("#") || line.trim() === "") continue;

    // Find function calls in the line
    const lineCalls = findCallsInLine(line, func.filePath, lineNum);

    for (const call of lineCalls) {
      // Deduplicate by location
      const key = `${call.location.file}:${call.location.line}:${call.location.column}:${call.calleeName}`;
      if (!seenCalls.has(key)) {
        seenCalls.add(key);
        calls.push(call);
      }
    }
  }

  return calls;
}

/**
 * Find function calls in a single line
 */
function findCallsInLine(
  line: string,
  filePath: string,
  lineNum: number,
): PythonCallInfo[] {
  const calls: PythonCallInfo[] = [];

  // Regex for function/method calls
  // Matches: func(), obj.method(), obj.attr.method(), etc.
  const callRegex = /([a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*)\s*\(/g;

  let match;
  while ((match = callRegex.exec(line)) !== null) {
    const fullExpression = match[1];
    const column = match.index + 1;

    // Skip Python built-in keywords that look like function calls
    const keywords = [
      "if",
      "elif",
      "while",
      "for",
      "with",
      "except",
      "assert",
      "return",
      "yield",
      "raise",
      "import",
      "from",
      "class",
      "def",
      "async",
      "await",
      "lambda",
      "not",
      "and",
      "or",
      "in",
      "is",
    ];
    const baseName = fullExpression.split(".")[0];
    if (keywords.includes(baseName)) continue;

    // Determine call kind and callee name
    const parts = fullExpression.split(".");
    let calleeName: string;
    let kind: PythonCallInfo["kind"];

    if (parts.length === 1) {
      // Direct call: func()
      calleeName = parts[0];
      kind = "direct";
    } else if (parts.length === 2) {
      // Method call: obj.method()
      calleeName = parts[1];
      kind = "method";
    } else {
      // Chained call: obj.attr.method()
      calleeName = parts[parts.length - 1];
      kind = "chained";
    }

    calls.push({
      calleeName,
      location: {
        file: filePath,
        line: lineNum,
        column,
      },
      kind,
      fullExpression,
    });
  }

  return calls;
}

/**
 * Get the indentation level of a line
 */
function getIndent(line: string): number {
  const match = line.match(/^(\s*)/);
  return match ? match[1].length : 0;
}

/**
 * Find the end of a block (class or function body)
 */
function findBlockEnd(
  lines: string[],
  startIndex: number,
  blockIndent: number,
): number {
  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines and comments
    if (line.trim() === "" || line.trim().startsWith("#")) continue;

    const currentIndent = getIndent(line);

    // If we find a line with less or equal indentation, the block has ended
    if (currentIndent <= blockIndent && line.trim() !== "") {
      return i - 1;
    }
  }

  // Block extends to end of file
  return lines.length - 1;
}

/**
 * Find a function by name in parsed results
 */
export function findPythonFunction(
  parseResult: PythonParseResult,
  functionName: string,
  filePath?: string,
): PythonFunctionLocation | undefined {
  for (const func of parseResult.functions) {
    if (func.name === functionName) {
      if (!filePath || func.filePath === filePath) {
        return func;
      }
    }
  }
  return undefined;
}

/**
 * Find all functions with a given name across multiple parse results
 */
export function findAllPythonFunctions(
  parseResults: Map<string, PythonParseResult>,
  functionName: string,
): PythonFunctionLocation[] {
  const results: PythonFunctionLocation[] = [];

  for (const [_filePath, parseResult] of parseResults) {
    for (const func of parseResult.functions) {
      if (func.name === functionName) {
        results.push(func);
      }
    }
  }

  return results;
}

/**
 * Check if a function call is to a Python built-in function
 */
export function isPythonBuiltIn(
  name: string,
  fullExpression?: string,
): boolean {
  const builtIns = new Set([
    "print",
    "len",
    "range",
    "str",
    "int",
    "float",
    "bool",
    "list",
    "dict",
    "set",
    "tuple",
    "type",
    "isinstance",
    "issubclass",
    "hasattr",
    "getattr",
    "setattr",
    "delattr",
    "callable",
    "iter",
    "next",
    "enumerate",
    "zip",
    "map",
    "filter",
    "sorted",
    "reversed",
    "any",
    "all",
    "sum",
    "min",
    "max",
    "abs",
    "round",
    "pow",
    "divmod",
    "hex",
    "oct",
    "bin",
    "ord",
    "chr",
    "repr",
    "ascii",
    "format",
    "hash",
    "id",
    "input",
    "open",
    "super",
    "object",
    "property",
    "staticmethod",
    "classmethod",
    "vars",
    "dir",
    "locals",
    "globals",
    "exec",
    "eval",
    "compile",
    "__import__",
    "memoryview",
    "bytearray",
    "bytes",
    "slice",
    "complex",
    "frozenset",
  ]);

  if (builtIns.has(name)) {
    return true;
  }

  // Check for method calls on built-in types
  if (fullExpression) {
    // Common methods on built-in types that we want to skip
    const builtInMethods = [
      "append",
      "extend",
      "insert",
      "remove",
      "pop",
      "clear",
      "index",
      "count",
      "sort",
      "reverse",
      "copy",
      "keys",
      "values",
      "items",
      "get",
      "update",
      "setdefault",
      "join",
      "split",
      "strip",
      "replace",
      "find",
      "startswith",
      "endswith",
      "upper",
      "lower",
      "format",
      "encode",
      "decode",
      "read",
      "write",
      "close",
      "flush",
      "seek",
      "tell",
      "readline",
      "readlines",
      "writelines",
    ];

    // If it's a method call on self/cls, we want to track it
    if (
      fullExpression.startsWith("self.") ||
      fullExpression.startsWith("cls.")
    ) {
      return false;
    }

    // Check if it's a common built-in method
    const parts = fullExpression.split(".");
    if (parts.length > 1 && builtInMethods.includes(parts[parts.length - 1])) {
      // This is a heuristic - we might want to include some of these
      return false; // Actually include these as they might be custom implementations
    }
  }

  return false;
}
