/**
 * Error Message Constants
 * Centralized error messages for consistency and i18n readiness
 */

export const ErrorMessages = {
  // Function name validation
  FUNCTION_NAME_REQUIRED: "functionName is required and must be a string",

  // Path validation
  PATH_REQUIRED: (paramName: string) => `${paramName} is required`,
  PATH_MUST_BE_ABSOLUTE: (paramName: string) =>
    `${paramName} must be an absolute path`,
  PATH_INVALID_CHARACTERS: (paramName: string) =>
    `${paramName} contains invalid characters`,

  // Format validation
  FORMAT_REQUIRED:
    "format is required and must be one of: mermaid, ascii, json",
  UNKNOWN_FORMAT: (format: string) => `Unknown format: ${format}`,

  // Tool validation
  UNKNOWN_TOOL: (name: string) => `Unknown tool: ${name}`,

  // Analyzer errors
  NO_SOURCE_FILES: (projectRoot: string) =>
    `No source files found in ${projectRoot}`,
  FUNCTION_NOT_FOUND: (
    functionName: string,
    searchScope: string,
    fileCount: number,
  ) =>
    `Function "${functionName}" not found in ${searchScope}. Searched ${fileCount} files.`,
} as const;

export type ErrorMessageKey = keyof typeof ErrorMessages;
