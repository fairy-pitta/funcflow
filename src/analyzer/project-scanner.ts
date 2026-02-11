/**
 * Project Scanner - Scans a project directory and finds TypeScript/JavaScript files
 */

import ts from "typescript";
import path from "path";
import fs from "fs";
import { logger } from "../utils/logger.js";

export interface ProjectInfo {
  rootDir: string;
  tsConfigPath: string | undefined;
  sourceFiles: string[];
  compilerOptions: ts.CompilerOptions;
}

/**
 * Scan a project directory and return project information
 */
export function scanProject(projectRoot: string): ProjectInfo {
  logger.debug(`Scanning project at: ${projectRoot}`);

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
    moduleResolution: ts.ModuleResolutionKind.Node10,
  };

  let sourceFiles: string[] = [];

  if (tsConfigPath) {
    logger.debug(`Found tsconfig.json at: ${tsConfigPath}`);
    // Parse tsconfig
    const configFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
    if (configFile.error) {
      logger.warn(
        `Error reading tsconfig.json: ${configFile.error.messageText}`,
      );
    } else {
      const parsedConfig = ts.parseJsonConfigFileContent(
        configFile.config,
        ts.sys,
        path.dirname(tsConfigPath),
      );
      compilerOptions = parsedConfig.options;
      sourceFiles = parsedConfig.fileNames;
    }
  }

  // If no source files from tsconfig, scan directory
  if (sourceFiles.length === 0) {
    logger.debug("No source files from tsconfig, scanning directory...");
    sourceFiles = findSourceFiles(projectRoot);
  }

  logger.info(`Found ${sourceFiles.length} source files`);

  return {
    rootDir: projectRoot,
    tsConfigPath,
    sourceFiles,
    compilerOptions,
  };
}

/**
 * Recursively find all source files in a directory
 */
function findSourceFiles(dir: string): string[] {
  const files: string[] = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip common non-source directories
      if (
        entry.name === "node_modules" ||
        entry.name === "dist" ||
        entry.name === "build" ||
        entry.name === ".git" ||
        entry.name === "coverage" ||
        entry.name === ".next" ||
        entry.name === ".nuxt"
      ) {
        continue;
      }

      if (entry.isDirectory()) {
        files.push(...findSourceFiles(fullPath));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        // Include TypeScript and JavaScript files, exclude declaration files
        if (
          [
            ".ts",
            ".tsx",
            ".js",
            ".jsx",
            ".mts",
            ".cts",
            ".mjs",
            ".cjs",
          ].includes(ext) &&
          !entry.name.endsWith(".d.ts")
        ) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    logger.warn(`Error scanning directory ${dir}: ${error}`);
  }

  return files;
}
