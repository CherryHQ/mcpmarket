import os from 'node:os';

import {
  atomicWriteJson,
  backupFile,
  expandPath,
  fileExists,
  readJsonFileStrict,
} from './utils/file.js';

/**
 * Known LLM client configuration.
 */
interface ClientConfig {
  name: string;
  configKey: string;
  paths: Partial<Record<ReturnType<typeof os.platform>, string>>;
}

const KNOWN_CLIENTS: ClientConfig[] = [
  {
    name: 'claude-desktop',
    configKey: 'mcpServers',
    paths: {
      darwin: '~/Library/Application Support/Claude/claude_desktop_config.json',
      win32: '%APPDATA%/Claude/claude_desktop_config.json',
      linux: '~/.config/Claude/claude_desktop_config.json',
    },
  },
  {
    name: 'cursor',
    configKey: 'mcpServers',
    paths: {
      darwin: '~/.cursor/mcp.json',
      win32: '%USERPROFILE%/.cursor/mcp.json',
      linux: '~/.cursor/mcp.json',
    },
  },
  {
    name: 'windsurf',
    configKey: 'mcpServers',
    paths: {
      darwin: '~/.codeium/windsurf/mcp_config.json',
      win32: '%USERPROFILE%/.codeium/windsurf/mcp_config.json',
      linux: '~/.codeium/windsurf/mcp_config.json',
    },
  },
];

/**
 * Detect which LLM clients are installed by checking config file existence.
 */
export async function detectClients(): Promise<
  Array<{ name: string; configPath: string; configKey: string }>
> {
  const platform = os.platform();
  const detected: Array<{ name: string; configPath: string; configKey: string }> = [];

  for (const client of KNOWN_CLIENTS) {
    const templatePath = client.paths[platform];
    if (!templatePath) continue;

    const configPath = expandPath(templatePath);
    if (await fileExists(configPath)) {
      detected.push({ name: client.name, configPath, configKey: client.configKey });
    }
  }

  return detected;
}

/**
 * Resolve which config paths to write to.
 * MCP_SETTINGS_PATH env var takes priority; otherwise auto-detect installed clients.
 */
export async function resolveConfigPaths(): Promise<
  Array<{ name: string; configPath: string; configKey: string }>
> {
  const envPath = process.env.MCP_SETTINGS_PATH;
  if (envPath) {
    return [{ name: 'custom', configPath: expandPath(envPath), configKey: 'mcpServers' }];
  }
  return detectClients();
}

/**
 * Check if a value is a plain object (not null, not array).
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Write a server configuration into LLM client config file(s).
 * Refuses to write if an existing config file is malformed (preserves user data).
 */
export async function writeServerConfig(
  serverName: string,
  config: { command: string; args: string[]; env?: Record<string, string> },
): Promise<string[]> {
  const targets = await resolveConfigPaths();
  const written: string[] = [];

  for (const { name, configPath, configKey } of targets) {
    try {
      let existing: Record<string, unknown>;
      try {
        existing = (await readJsonFileStrict<Record<string, unknown>>(configPath)) || {};
      } catch (error) {
        console.error(
          `Refusing to write to ${name} config at ${configPath}: file is malformed (${(error as Error).message}). ` +
            `Fix the file manually before retrying.`,
        );
        continue;
      }

      if (!isPlainObject(existing)) {
        console.error(
          `Refusing to write to ${name} config at ${configPath}: top-level value is not an object.`,
        );
        continue;
      }

      const existingMcpServers = existing[configKey];
      if (existingMcpServers !== undefined && !isPlainObject(existingMcpServers)) {
        console.error(
          `Refusing to write to ${name} config at ${configPath}: ${configKey} is not an object.`,
        );
        continue;
      }

      await backupFile(configPath);

      const mcpServers: Record<string, unknown> = isPlainObject(existingMcpServers)
        ? existingMcpServers
        : {};
      mcpServers[serverName] = config;
      existing = { ...existing, [configKey]: mcpServers };

      await atomicWriteJson(configPath, existing);
      written.push(name);
    } catch (error) {
      console.error(`Failed to write to ${name} config at ${configPath}:`, error);
    }
  }

  return written;
}

/**
 * Remove a server configuration from LLM client config file(s).
 */
export async function removeServerConfig(serverName: string): Promise<string[]> {
  const targets = await resolveConfigPaths();
  const removed: string[] = [];

  for (const { name, configPath, configKey } of targets) {
    try {
      let existing: Record<string, unknown> | null;
      try {
        existing = await readJsonFileStrict<Record<string, unknown>>(configPath);
      } catch (error) {
        console.error(
          `Skipping ${name} config at ${configPath}: file is malformed (${(error as Error).message}).`,
        );
        continue;
      }
      if (!existing || !isPlainObject(existing)) continue;

      const mcpServers = existing[configKey];
      if (!isPlainObject(mcpServers) || !(serverName in mcpServers)) continue;

      await backupFile(configPath);

      delete mcpServers[serverName];
      existing[configKey] = mcpServers;

      await atomicWriteJson(configPath, existing);
      removed.push(name);
    } catch (error) {
      console.error(`Failed to update ${name} config at ${configPath}:`, error);
    }
  }

  return removed;
}
