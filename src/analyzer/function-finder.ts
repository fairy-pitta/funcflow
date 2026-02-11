/**
 * Function Finder - Finds function declarations by name
 */

import ts from "typescript";

export interface FunctionLocation {
  name: string;
  filePath: string;
  line: number;
  column: number;
  kind: "function" | "method" | "arrow" | "expression";
  node: ts.Node;
}

/**
 * Find all definitions of a function by name
 */
export function findFunction(
  program: ts.Program,
  functionName: string,
  filePath?: string,
): FunctionLocation[] {
  const results: FunctionLocation[] = [];

  const sourceFiles = filePath
    ? [program.getSourceFile(filePath)].filter(
        (sf): sf is ts.SourceFile => sf !== undefined,
      )
    : program
        .getSourceFiles()
        .filter(
          (sf) =>
            !sf.isDeclarationFile && !sf.fileName.includes("node_modules"),
        );

  for (const sourceFile of sourceFiles) {
    visit(sourceFile, sourceFile);
  }

  return results;

  function visit(node: ts.Node, sourceFile: ts.SourceFile): void {
    // Function declaration: function foo() {}
    if (ts.isFunctionDeclaration(node) && node.name) {
      if (node.name.text === functionName) {
        results.push(
          createLocation(node, "function", sourceFile, node.name.text),
        );
      }
    }

    // Method declaration: class { foo() {} }
    else if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
      if (node.name.text === functionName) {
        results.push(
          createLocation(node, "method", sourceFile, node.name.text),
        );
      }
    }

    // Variable with function: const foo = () => {} or const foo = function() {}
    else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      if (node.name.text === functionName && node.initializer) {
        if (ts.isArrowFunction(node.initializer)) {
          results.push(
            createLocation(node, "arrow", sourceFile, node.name.text),
          );
        } else if (ts.isFunctionExpression(node.initializer)) {
          results.push(
            createLocation(node, "expression", sourceFile, node.name.text),
          );
        }
      }
    }

    // Property assignment with function: { foo: () => {} }
    else if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name)) {
      if (node.name.text === functionName && node.initializer) {
        if (
          ts.isArrowFunction(node.initializer) ||
          ts.isFunctionExpression(node.initializer)
        ) {
          results.push(
            createLocation(node, "arrow", sourceFile, node.name.text),
          );
        }
      }
    }

    ts.forEachChild(node, (child) => visit(child, sourceFile));
  }

  function createLocation(
    node: ts.Node,
    kind: FunctionLocation["kind"],
    sourceFile: ts.SourceFile,
    name: string,
  ): FunctionLocation {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(
      node.getStart(sourceFile),
    );
    return {
      name,
      filePath: sourceFile.fileName,
      line: line + 1,
      column: character + 1,
      kind,
      node,
    };
  }
}

/**
 * Get the function body node (the content inside the function)
 */
export function getFunctionBody(
  location: FunctionLocation,
): ts.Node | undefined {
  const node = location.node;

  if (ts.isFunctionDeclaration(node)) {
    return node.body;
  }
  if (ts.isMethodDeclaration(node)) {
    return node.body;
  }
  if (ts.isVariableDeclaration(node) && node.initializer) {
    if (ts.isArrowFunction(node.initializer)) {
      return node.initializer.body;
    }
    if (ts.isFunctionExpression(node.initializer)) {
      return node.initializer.body;
    }
  }
  if (ts.isPropertyAssignment(node) && node.initializer) {
    if (ts.isArrowFunction(node.initializer)) {
      return node.initializer.body;
    }
    if (ts.isFunctionExpression(node.initializer)) {
      return node.initializer.body;
    }
  }

  return undefined;
}
