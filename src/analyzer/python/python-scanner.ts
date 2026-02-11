/**
 * Python Project Scanner - Scans a project directory and finds Python files
 */

import path from "path";
import fs from "fs";
import { logger } from "../../utils/logger.js";

export interface PythonProjectInfo {
  rootDir: string;
  sourceFiles: string[];
  hasRequirements: boolean;
  hasPyproject: boolean;
}

/**
 * Scan a project directory and return Python project information
 */
export function scanPythonProject(projectRoot: string): PythonProjectInfo {
  logger.debug(`Scanning Python project at: ${projectRoot}`);

  // Check for common Python project files
  const hasRequirements = fs.existsSync(
    path.join(projectRoot, "requirements.txt"),
  );
  const hasPyproject = fs.existsSync(path.join(projectRoot, "pyproject.toml"));

  // Find all Python source files
  const sourceFiles = findPythonFiles(projectRoot);

  logger.info(`Found ${sourceFiles.length} Python source files`);

  return {
    rootDir: projectRoot,
    sourceFiles,
    hasRequirements,
    hasPyproject,
  };
}

/**
 * Recursively find all Python files in a directory
 */
function findPythonFiles(dir: string): string[] {
  const files: string[] = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip common non-source directories
      if (
        entry.name === "node_modules" ||
        entry.name === "__pycache__" ||
        entry.name === ".git" ||
        entry.name === ".venv" ||
        entry.name === "venv" ||
        entry.name === "env" ||
        entry.name === ".env" ||
        entry.name === "dist" ||
        entry.name === "build" ||
        entry.name === ".eggs" ||
        entry.name === "*.egg-info" ||
        entry.name.endsWith(".egg-info") ||
        entry.name === ".tox" ||
        entry.name === ".pytest_cache" ||
        entry.name === ".mypy_cache"
      ) {
        continue;
      }

      if (entry.isDirectory()) {
        files.push(...findPythonFiles(fullPath));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        // Include Python files
        if (ext === ".py") {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    logger.warn(`Error scanning directory ${dir}: ${error}`);
  }

  return files;
}

/**
 * Check if a directory contains Python files
 */
export function hasPythonFiles(projectRoot: string): boolean {
  try {
    const entries = fs.readdirSync(projectRoot, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".py")) {
        return true;
      }
      if (
        entry.isDirectory() &&
        !entry.name.startsWith(".") &&
        entry.name !== "node_modules"
      ) {
        const fullPath = path.join(projectRoot, entry.name);
        if (hasPythonFiles(fullPath)) {
          return true;
        }
      }
    }
  } catch {
    // Ignore errors
  }
  return false;
}
