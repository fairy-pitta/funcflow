/**
 * Graph data types for call graph representation
 */

export interface FunctionNode {
  /** Function name */
  name: string;
  /** Source location */
  location: {
    file: string;
    line: number;
    column: number;
  };
  /** Function kind */
  kind: "function" | "method" | "arrow" | "expression";
}

export interface CallEdge {
  /** Caller function name */
  from: string;
  /** Callee function name */
  to: string;
  /** Where the call happens */
  location: {
    file: string;
    line: number;
  };
}

export interface CallGraph {
  /** The function we're analyzing */
  targetNode: FunctionNode;
  /** All nodes in the graph */
  nodes: Map<string, FunctionNode>;
  /** All edges in the graph */
  edges: CallEdge[];
  /** Functions that call targetNode */
  callers: string[];
  /** Functions called by targetNode */
  callees: string[];
}
