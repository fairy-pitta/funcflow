/**
 * Call Analyzer - Finds call expressions within a function
 */

import ts from "typescript";

export interface CallInfo {
  /** Name of the called function */
  calleeName: string;
  /** Where the call happens */
  location: {
    file: string;
    line: number;
    column: number;
  };
  /** Kind of call */
  kind: "direct" | "method" | "chained";
  /** Full expression text */
  fullExpression: string;
}

/**
 * Find all call expressions within a function node
 */
export function findCallsInFunction(
  functionNode: ts.Node,
  sourceFile: ts.SourceFile,
  typeChecker: ts.TypeChecker,
): CallInfo[] {
  const calls: CallInfo[] = [];
  const seenCalls = new Set<string>();

  visit(functionNode);

  return calls;

  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node)) {
      const callInfo = analyzeCallExpression(node, sourceFile, typeChecker);
      if (callInfo) {
        // Deduplicate by location
        const key = `${callInfo.location.file}:${callInfo.location.line}:${callInfo.location.column}`;
        if (!seenCalls.has(key)) {
          seenCalls.add(key);
          calls.push(callInfo);
        }
      }
    }

    ts.forEachChild(node, visit);
  }
}

/**
 * Analyze a single call expression
 */
function analyzeCallExpression(
  call: ts.CallExpression,
  sourceFile: ts.SourceFile,
  typeChecker: ts.TypeChecker,
): CallInfo | null {
  const expression = call.expression;
  const fullText = expression.getText(sourceFile);
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(
    call.getStart(sourceFile),
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

  // Method call: obj.foo() or this.foo()
  if (ts.isPropertyAccessExpression(expression)) {
    const methodName = expression.name.text;

    // Try to get the resolved name from the type checker
    try {
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
    } catch {
      return {
        calleeName: methodName,
        location: {
          file: sourceFile.fileName,
          line: line + 1,
          column: character + 1,
        },
        kind: "method",
        fullExpression: fullText,
      };
    }
  }

  // Element access call: obj["foo"]() or arr[0]()
  if (ts.isElementAccessExpression(expression)) {
    const arg = expression.argumentExpression;
    if (ts.isStringLiteral(arg)) {
      return {
        calleeName: arg.text,
        location: {
          file: sourceFile.fileName,
          line: line + 1,
          column: character + 1,
        },
        kind: "method",
        fullExpression: fullText,
      };
    }
  }

  // Chained call: obj.method1().method2()
  if (ts.isCallExpression(expression)) {
    // Get the final method name if it's a property access
    if (ts.isPropertyAccessExpression(call.expression)) {
      const methodName = call.expression.name.text;
      return {
        calleeName: methodName,
        location: {
          file: sourceFile.fileName,
          line: line + 1,
          column: character + 1,
        },
        kind: "chained",
        fullExpression: fullText,
      };
    }
  }

  return null;
}

/**
 * Find callback function references passed to higher-order functions
 * @param functionNode - The function AST node to analyze
 * @param _sourceFile - Source file (reserved for future type resolution)
 * @returns Array of function names passed as callbacks
 */
export function findCallbacksInFunction(
  functionNode: ts.Node,
  _sourceFile: ts.SourceFile,
): string[] {
  const callbacks: string[] = [];

  visit(functionNode);

  return callbacks;

  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node)) {
      // Check arguments for function references
      for (const arg of node.arguments) {
        if (ts.isIdentifier(arg)) {
          // Direct function reference: array.map(transformItem)
          callbacks.push(arg.text);
        }
      }
    }

    ts.forEachChild(node, visit);
  }
}
