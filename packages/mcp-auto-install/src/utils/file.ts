import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/**
 * Write JSON to a file atomically: write to a temp file, then rename.
 * Creates parent directories if they don't exist.
 */
export async function atomicWriteJson(filePath: string, data: unknown): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });

  const tmpPath = path.join(dir, `.${path.basename(filePath)}.${process.pid}.tmp`);
  const content = JSON.stringify(data, null, 2) + '\n';

  await fs.writeFile(tmpPath, content, 'utf-8');
  await fs.rename(tmpPath, filePath);
}

/**
 * Create a .bak backup of a file before modifying it.
 * Silently skips if the source file doesn't exist.
 */
export async function backupFile(filePath: string): Promise<void> {
  try {
    await fs.copyFile(filePath, `${filePath}.bak`);
  } catch (error: unknown) {
    if ((error as { code?: string }).code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * Read and parse a JSON file. Returns null if the file doesn't exist.
 * Swallows all errors — use only when corrupt files should be treated as absent
 * (e.g. cache files that can be safely regenerated).
 */
export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

/**
 * Read and parse a JSON file. Returns null only if the file doesn't exist (ENOENT).
 * Throws on permission errors, JSON parse errors, etc. — use for user-owned files
 * where silent corruption would lose data.
 */
export async function readJsonFileStrict<T>(filePath: string): Promise<T | null> {
  let data: string;
  try {
    data = await fs.readFile(filePath, 'utf-8');
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
  return JSON.parse(data) as T;
}

/**
 * Expand ~ and environment variables (%VAR%) in a path.
 */
export function expandPath(p: string): string {
  let expanded = p;

  if (expanded.startsWith('~')) {
    expanded = path.join(os.homedir(), expanded.slice(1));
  }

  // Expand %VAR% for Windows-style env vars
  expanded = expanded.replace(/%([^%]+)%/g, (_, key: string) => process.env[key] || '');

  return expanded;
}

/**
 * Check if a file exists.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
