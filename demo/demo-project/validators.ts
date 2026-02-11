/**
 * FuncFlow Demo - Validation Functions
 *
 * Input validation and sanitization utilities
 */

// ============================================================================
// Input Validation
// ============================================================================

/**
 * Validate generic input
 * This is one of the most commonly called functions
 */
export function validateInput(input: unknown): boolean {
  if (input === null || input === undefined) {
    return false;
  }

  if (typeof input === "string") {
    return validateStringInput(input);
  }

  if (typeof input === "number") {
    return validateNumberInput(input);
  }

  if (typeof input === "object") {
    return validateObjectInput(input);
  }

  return true;
}

/**
 * Validate string input
 */
function validateStringInput(input: string): boolean {
  if (input.length === 0) {
    return false;
  }

  if (input.length > 1000) {
    return false;
  }

  return !containsDangerousChars(input);
}

/**
 * Validate number input
 */
function validateNumberInput(input: number): boolean {
  if (isNaN(input)) {
    return false;
  }

  if (!isFinite(input)) {
    return false;
  }

  return true;
}

/**
 * Validate object input
 */
function validateObjectInput(input: object): boolean {
  if (Array.isArray(input)) {
    return input.every((item) => validateInput(item));
  }

  // Check for circular references by attempting to stringify
  try {
    JSON.stringify(input);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check for dangerous characters in input
 */
function containsDangerousChars(input: string): boolean {
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i,
    /\0/, // null bytes
  ];

  return dangerousPatterns.some((pattern) => pattern.test(input));
}

// ============================================================================
// String Sanitization
// ============================================================================

/**
 * Sanitize a string by removing potentially harmful content
 */
export function sanitizeString(input: string): string {
  let sanitized = input;

  // Remove null bytes
  sanitized = removeNullBytes(sanitized);

  // Escape HTML entities
  sanitized = escapeHtml(sanitized);

  // Trim whitespace
  sanitized = sanitized.trim();

  // Normalize whitespace
  sanitized = normalizeWhitespace(sanitized);

  return sanitized;
}

/**
 * Remove null bytes from string
 */
function removeNullBytes(input: string): string {
  return input.replace(/\0/g, "");
}

/**
 * Escape HTML entities
 */
function escapeHtml(input: string): string {
  const escapeMap: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
  };

  return input.replace(/[&<>"']/g, (char) => escapeMap[char] || char);
}

/**
 * Normalize whitespace (collapse multiple spaces)
 */
function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ");
}

// ============================================================================
// Specific Validators
// ============================================================================

/**
 * Validate an email address
 */
export function validateEmail(email: string): boolean {
  if (!validateInput(email)) {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate a username
 */
export function validateUsername(username: string): boolean {
  if (!validateInput(username)) {
    return false;
  }

  // Must be 3-30 characters, alphanumeric and underscores only
  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  return usernameRegex.test(username);
}

/**
 * Validate a password
 */
export function validatePassword(password: string): boolean {
  if (!validateInput(password)) {
    return false;
  }

  // Must be at least 8 characters
  if (password.length < 8) {
    return false;
  }

  // Must contain at least one letter and one number
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  return hasLetter && hasNumber;
}

/**
 * Validate a URL
 */
export function validateUrl(url: string): boolean {
  if (!validateInput(url)) {
    return false;
  }

  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Validate a phone number
 */
export function validatePhone(phone: string): boolean {
  if (!validateInput(phone)) {
    return false;
  }

  // Simple phone validation (digits, spaces, dashes, parens, plus)
  const phoneRegex = /^[\d\s\-\(\)\+]+$/;
  if (!phoneRegex.test(phone)) {
    return false;
  }

  // Must have at least 10 digits
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10;
}

// ============================================================================
// Schema Validation
// ============================================================================

export interface ValidationSchema {
  type: "string" | "number" | "boolean" | "object" | "array";
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  properties?: Record<string, ValidationSchema>;
  items?: ValidationSchema;
}

/**
 * Validate data against a schema
 */
export function validateSchema(
  data: unknown,
  schema: ValidationSchema,
): boolean {
  // Check required
  if (schema.required && (data === null || data === undefined)) {
    return false;
  }

  if (data === null || data === undefined) {
    return true;
  }

  // Check type
  if (!checkType(data, schema.type)) {
    return false;
  }

  // Type-specific validations
  switch (schema.type) {
    case "string":
      return validateSchemaString(data as string, schema);
    case "number":
      return validateSchemaNumber(data as number, schema);
    case "object":
      return validateSchemaObject(data as Record<string, unknown>, schema);
    case "array":
      return validateSchemaArray(data as unknown[], schema);
    default:
      return true;
  }
}

/**
 * Check if data matches expected type
 */
function checkType(data: unknown, expectedType: string): boolean {
  if (expectedType === "array") {
    return Array.isArray(data);
  }
  return typeof data === expectedType;
}

/**
 * Validate string against schema
 */
function validateSchemaString(data: string, schema: ValidationSchema): boolean {
  if (schema.minLength !== undefined && data.length < schema.minLength) {
    return false;
  }

  if (schema.maxLength !== undefined && data.length > schema.maxLength) {
    return false;
  }

  if (schema.pattern && !schema.pattern.test(data)) {
    return false;
  }

  return true;
}

/**
 * Validate number against schema
 */
function validateSchemaNumber(data: number, schema: ValidationSchema): boolean {
  if (schema.min !== undefined && data < schema.min) {
    return false;
  }

  if (schema.max !== undefined && data > schema.max) {
    return false;
  }

  return true;
}

/**
 * Validate object against schema
 */
function validateSchemaObject(
  data: Record<string, unknown>,
  schema: ValidationSchema,
): boolean {
  if (!schema.properties) {
    return true;
  }

  for (const [key, propSchema] of Object.entries(schema.properties)) {
    if (!validateSchema(data[key], propSchema)) {
      return false;
    }
  }

  return true;
}

/**
 * Validate array against schema
 */
function validateSchemaArray(
  data: unknown[],
  schema: ValidationSchema,
): boolean {
  if (!schema.items) {
    return true;
  }

  return data.every((item) => validateSchema(item, schema.items!));
}

// ============================================================================
// Validation Result Types
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Validate with detailed error messages
 */
export function validateWithErrors(
  data: unknown,
  schema: ValidationSchema,
  path: string = "",
): ValidationResult {
  const errors: ValidationError[] = [];

  // Check required
  if (schema.required && (data === null || data === undefined)) {
    errors.push({
      field: path || "root",
      message: "Field is required",
      code: "REQUIRED",
    });
    return { valid: false, errors };
  }

  if (data === null || data === undefined) {
    return { valid: true, errors: [] };
  }

  // Type check
  if (!checkType(data, schema.type)) {
    errors.push({
      field: path || "root",
      message: `Expected ${schema.type}, got ${typeof data}`,
      code: "INVALID_TYPE",
    });
    return { valid: false, errors };
  }

  // Recursively validate objects
  if (schema.type === "object" && schema.properties) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      const propPath = path ? `${path}.${key}` : key;
      const propResult = validateWithErrors(
        (data as Record<string, unknown>)[key],
        propSchema,
        propPath,
      );
      errors.push(...propResult.errors);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
