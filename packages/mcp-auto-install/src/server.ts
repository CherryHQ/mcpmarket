#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { exec as execCb } from 'node:child_process';
import { promisify } from 'node:util';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { npxFinder, type NPMPackage } from 'npx-scope-finder';
import { z } from 'zod';

import type { MCPServerInfo, OperationResult } from './types.js';
import {
  createErrorResponse,
  createSuccessResponse,
  createServerResponse,
} from './utils/response.js';

const exec = promisify(execCb);

// Set path
const SETTINGS_PATH = process.env.MCP_REGISTRY_PATH
  ? process.env.MCP_REGISTRY_PATH
  : path.join(homedir(), 'mcp', 'mcp-registry.json');

// Default package scopes
const DEFAULT_PACKAGE_SCOPES = ['@modelcontextprotocol'];

// Parse package scopes from environment variable
const PACKAGE_SCOPES = process.env.MCP_PACKAGE_SCOPES
  ? process.env.MCP_PACKAGE_SCOPES.split(',')
      .map(scope => scope.trim())
      .filter(Boolean)
  : DEFAULT_PACKAGE_SCOPES;

// Server settings
let serverSettings: { servers: MCPServerInfo[] } = { servers: [] };

/**
 * Simple Zod to JSON Schema conversion function
 */
function simpleZodToJsonSchema(schema: z.ZodType<unknown>): Record<string, unknown> {
  // For simplicity, we only handle basic types
  if (schema instanceof z.ZodString) {
    return { type: 'string' };
  }

  if (schema instanceof z.ZodNumber) {
    return { type: 'number' };
  }

  if (schema instanceof z.ZodBoolean) {
    return { type: 'boolean' };
  }

  if (schema instanceof z.ZodArray) {
    return {
      type: 'array',
      items: simpleZodToJsonSchema(schema._def.type),
    };
  }

  if (schema instanceof z.ZodObject) {
    const properties: Record<string, Record<string, unknown>> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(schema.shape)) {
      properties[key] = simpleZodToJsonSchema(value as z.ZodType<unknown>);

      if (!(value instanceof z.ZodOptional)) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      required,
    };
  }

  if (schema instanceof z.ZodOptional) {
    return simpleZodToJsonSchema(schema._def.innerType);
  }

  // Default return
  return { type: 'object' };
}

/**
 * Preload MCP package information to local registry file
 */
async function preloadMCPPackages(): Promise<void> {
  try {
    // Get all available packages from configured scopes concurrently
    const scopePromises = PACKAGE_SCOPES.map(scope =>
      npxFinder(scope, {
        timeout: 15000,
        retries: 3,
        retryDelay: 1000,
      }).catch(error => {
        console.error(`Error fetching packages for scope ${scope}:`, error);
        return [] as NPMPackage[]; // Return empty array on error to continue processing
      }),
    );

    const results = await Promise.allSettled(scopePromises);
    const allPackages = results.reduce((acc, result) => {
      if (result.status === 'fulfilled') {
        acc.push(...result.value);
      }
      return acc;
    }, [] as NPMPackage[]);

    // Filter and process package information
    for (const pkg of allPackages) {
      if (!pkg.name || pkg.name === '@modelcontextprotocol/sdk') {
        continue; // Skip SDK itself
      }

      try {
        // Extract server type (from package name)
        const nameParts = pkg.name.split('/');
        const serverName = nameParts[nameParts.length - 1];
        const serverType = serverName.replace('mcp-', '');

        // Build server information
        const serverInfo: MCPServerInfo = {
          name: pkg.name,
          repo: pkg.links?.repository || '',
          command: `npx ${pkg.name}`,
          description: pkg.description || `MCP ${serverType} server`,
          keywords: [...(pkg.keywords || []), serverType, 'mcp'],
        };

        // Get README content directly from npxFinder returned data and add to serverInfo
        if (pkg.original?.readme) {
          serverInfo.readme = pkg.original.readme;
        }

        // Check if server is already registered
        const existingServer = serverSettings.servers.find(s => s.name === pkg.name);
        if (!existingServer) {
          serverSettings.servers.push(serverInfo);
        } else {
          // Update existing server's readme (if available)
          if (serverInfo.readme && !existingServer.readme) {
            existingServer.readme = serverInfo.readme;
          }
        }
      } catch (pkgError) {
        console.error(`Error processing package ${pkg.name}:`, pkgError);
        // Silently handle package errors
      }
    }

    // Save updated settings
    await saveSettings();
  } catch (error) {
    console.error('Error preloading MCP packages:', error);
    // Silently handle errors
  }
}

// Create MCP server instance

/**
 * Initialize settings
 */
async function initSettings(): Promise<void> {
  try {
    // Create settings directory
    const settingsDir = path.dirname(SETTINGS_PATH);
    await fs.mkdir(settingsDir, { recursive: true });

    // Try to load existing settings
    try {
      const data = await fs.readFile(SETTINGS_PATH, 'utf-8');
      serverSettings = JSON.parse(data);
    } catch (error) {
      console.error(error);
      // If file doesn't exist, use default settings
      serverSettings = { servers: [] };
      // Save default settings
      await saveSettings();
    }
  } catch (error) {
    console.error('Failed to initialize settings:', error);
  }
}

/**
 * Save settings
 */
async function saveSettings(): Promise<void> {
  try {
    // Ensure directory exists
    const settingsDir = path.dirname(SETTINGS_PATH);
    await fs.mkdir(settingsDir, { recursive: true });

    // Save settings file
    await fs.writeFile(SETTINGS_PATH, JSON.stringify(serverSettings, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save settings:', error);
    throw new Error('Failed to save settings');
  }
}

/**
 * Find server
 */
async function findServer(name: string): Promise<MCPServerInfo | undefined> {
  // Ensure settings are loaded
  await initSettings();
  return serverSettings.servers.find(s => s.name.includes(name.toLowerCase()));
}

const createServer = (jsonOnly = false) => {
  console.error('jsonOnly', jsonOnly);
  const server = new Server(
    {
      name: 'mcp-auto-install',
      version: '0.1.7',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Register tools list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'mcp_auto_install_getAvailableServers',
          description:
            'List all available MCP servers that can be installed. Returns a list of server names and their basic information. Use this to discover what MCP servers are available before installing or configuring them.',
          inputSchema: simpleZodToJsonSchema(
            z.object({
              random_string: z.string().describe('Dummy parameter for no-parameter tools'),
            }),
          ),
        },
        {
          name: 'mcp_auto_install_removeServer',
          description:
            "Remove a registered MCP server from the local registry. This will unregister the server but won't uninstall it. Provide the exact server name to remove. Use getAvailableServers first to see registered servers.",
          inputSchema: simpleZodToJsonSchema(
            z.object({
              serverName: z
                .string()
                .describe('The exact name of the server to remove from registry'),
            }),
          ),
        },
        {
          name: 'mcp_auto_install_configureServer',
          description:
            'Get detailed configuration help for a specific MCP server. Provides README content, configuration instructions, and suggested commands. Optionally specify a purpose or specific configuration question.',
          inputSchema: simpleZodToJsonSchema(
            z.object({
              serverName: z.string().describe('The exact name of the server to configure'),
            }),
          ),
        },
        {
          name: 'mcp_auto_install_saveCommand',
          description:
            'Save an npx command configuration for an MCP server. This stores the command, arguments and environment variables in both the MCP settings and LLM configuration files. Use this to persist server-specific command configurations.',
          inputSchema: simpleZodToJsonSchema(
            z.object({
              serverName: z
                .string()
                .describe('The exact name of the server to save command configuration for'),
              command: z
                .string()
                .describe(
                  "The main command to execute (e.g., 'npx', 'node', 'npm', 'yarn', 'pnpm','cmd', 'powershell', 'bash', 'sh', 'zsh', 'fish', 'tcsh', 'csh', 'cmd', 'powershell', 'pwsh', 'cmd.exe', 'powershell.exe', 'cmd.ps1', 'powershell.ps1')",
                ),
              args: z
                .array(z.string())
                .describe(
                  "Array of command arguments (e.g., ['--port', '3000', '--config', 'config.json'])",
                ),
              env: z
                .record(z.string())
                .describe(
                  "Environment variables object for the command (e.g., { 'NODE_ENV': 'production', 'DEBUG': 'true' })",
                )
                .optional(),
              description: z
                .string()
                .describe(
                  'A description of the functionality and purpose of the server to which the command configuration needs to be saved',
                ),
            }),
          ),
        },
        // {
        //   name: 'mcp_auto_install_parseJsonConfig',
        //   description:
        //     'Parse and validate a JSON configuration string for MCP servers. This tool processes server configurations, validates their format, and merges them with existing configurations. Use this for bulk server configuration.',
        //   inputSchema: simpleZodToJsonSchema(
        //     z.object({
        //       config: z
        //         .string()
        //         .describe(
        //           "JSON string containing server configurations in the format: { 'mcpServers': { 'serverName': { 'command': 'string', 'args': ['string'] } } }",
        //         ),
        //     }),
        //   ),
        // },
      ],
    };
  });

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async req => {
    const { name, arguments: args = {} } = req.params;

    switch (name) {
      case 'mcp_auto_install_getAvailableServers': {
        const servers = await getRegisteredServers();
        return {
          content: [
            {
              type: 'text',
              text: `📋 Found ${servers.length} MCP servers`,
            },
            {
              type: 'text',
              text: servers
                .map(s => `• ${s.name}${s.description ? `: ${s.description}` : ''}`)
                .join('\n'),
            },
          ],
          success: true,
        };
      }

      case 'mcp_auto_install_removeServer': {
        const result = await handleRemoveServer(args as unknown as { serverName: string });
        return createServerResponse(result, false);
      }

      case 'mcp_auto_install_configureServer': {
        const result = await handleConfigureServer(
          args as unknown as {
            serverName: string;
          },
        );
        return createServerResponse(result, false);
      }

      case 'mcp_auto_install_saveCommand': {
        const result = await saveCommandToExternalConfig(
          args.serverName as string,
          args.command as string,
          args.args as string[],
          args.description as string,
          jsonOnly,
          args.env as Record<string, string>,
        );
        return createServerResponse(result, jsonOnly);
      }

      // case 'mcp_auto_install_parseJsonConfig': {
      //   const result = await handleParseConfig(args as unknown as { config: string }, jsonOnly);
      //   return createServerResponse(result, jsonOnly);
      // }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });
  return server;
};

/**
 * Start MCP server
 */
export async function startServer(jsonOnly = false): Promise<void> {
  console.error('Initializing MCP server...');
  await initSettings();

  console.error('Loading MCP packages...');
  await preloadMCPPackages();

  const server = createServer(jsonOnly);

  console.error('Connecting to transport...');
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP server started and ready');
}

/**
 * Get list of registered servers
 */
export async function getRegisteredServers(): Promise<MCPServerInfo[]> {
  // Ensure settings are loaded
  await initSettings();
  return serverSettings.servers;
}

/**
 * The following are interface functions for CLI tools
 */

export async function handleInstallServer(args: { serverName: string }): Promise<OperationResult> {
  const { serverName } = args;
  const server = await findServer(serverName);

  if (!server) {
    return createErrorResponse(
      `❌ Server '${serverName}' not found. Use 'getAvailableServers' to see options.`,
    );
  }

  try {
    // Install using git clone
    const repoName = server.repo.split('/').pop()?.replace('.git', '') || serverName;
    const cloneDir = path.join(homedir(), '.mcp', 'servers', repoName);

    // Create directory
    await fs.mkdir(path.join(homedir(), '.mcp', 'servers'), {
      recursive: true,
    });

    // Clone repository
    await exec(`git clone ${server.repo} ${cloneDir}`);

    // Install dependencies
    await exec(`cd ${cloneDir} && npm install`);

    if (server.installCommands && server.installCommands.length > 0) {
      // Run custom installation commands
      for (const cmd of server.installCommands) {
        await exec(`cd ${cloneDir} && ${cmd}`);
      }
    }

    return createSuccessResponse(`✅ Installed '${serverName}'. Path: ${cloneDir}`, {
      installPath: cloneDir,
      serverName: server.name,
      description: server.description,
    });
  } catch (error) {
    return createErrorResponse(`⚠️ Install failed: ${(error as Error).message}`);
  }
}

export async function handleRegisterServer(serverInfo: MCPServerInfo): Promise<OperationResult> {
  // Check if server already exists
  const existingIndex = serverSettings.servers.findIndex(s => s.name === serverInfo.name);

  if (existingIndex !== -1) {
    // Update existing server
    serverSettings.servers[existingIndex] = serverInfo;
  } else {
    // Add new server
    serverSettings.servers.push(serverInfo);
  }

  // Save updated settings
  await saveSettings();

  const action = existingIndex !== -1 ? 'updated' : 'registered';
  return createSuccessResponse(`✅ Server '${serverInfo.name}' ${action} successfully.`);
}

export async function handleRemoveServer(args: { serverName: string }): Promise<OperationResult> {
  const { serverName } = args;
  const initialLength = serverSettings.servers.length;

  // Remove specified server
  serverSettings.servers = serverSettings.servers.filter(s => s.name !== serverName);

  if (serverSettings.servers.length === initialLength) {
    return createErrorResponse(`❌ Server '${serverName}' not found.`);
  }

  // Save updated settings
  await saveSettings();

  return createSuccessResponse(`✅ Server '${serverName}' removed.`);
}

export async function handleConfigureServer(args: {
  serverName: string;
}): Promise<OperationResult> {
  const { serverName } = args;
  const server = await findServer(serverName);

  if (!server) {
    return createErrorResponse(`❌ Server '${serverName}' not found.`);
  }

  // Get README content
  const readmeResult = await handleGetServerReadme({ serverName });

  if (!readmeResult.message || !readmeResult.data) {
    return createErrorResponse(
      `⚠️ README not available: ${readmeResult.message?.[0] || 'Unknown error'}`,
    );
  }

  const messages = [
    `📝 Config guide for '${serverName}'`,
    server.description ? `Description: ${server.description}` : '',
    readmeResult.data as string,
  ];

  return createSuccessResponse(messages);
}

/**
 * Get server README content
 */
export async function handleGetServerReadme(args: {
  serverName: string;
}): Promise<OperationResult> {
  const { serverName } = args;
  const server = await findServer(serverName);

  if (!server) {
    return createErrorResponse(`❌ Server '${serverName}' not found in the registry.`);
  }

  try {
    // Get README content (directly from server object)
    const readmeContent = server.readme || 'No README content available for this server.';

    // Add prompts to guide LLM in summarizing content and guiding parameter configuration
    const promptedReadme = `# ${serverName} README
${server.description ? `\n> ${server.description}\n` : ''}
${readmeContent}

---
<CURRENT_CURSOR_POSITION>

Summary: What does this MCP server do? (1-2 sentences)

Setup: List required/optional parameters, env vars needed.

Examples:
- Working npx command example
- JSON config example for integration

Next steps: How to get started quickly?

Note any unclear/missing information.
`;

    return createSuccessResponse('README fetch successful', promptedReadme);
  } catch (error) {
    return createErrorResponse(`⚠️ Failed to fetch README: ${(error as Error).message}`);
  }
}

/**
 * Handle user configuration parsing
 */
export async function handleParseConfig(
  args: { config: string },
  jsonOnly = false,
): Promise<OperationResult> {
  try {
    // Parse the JSON string sent by the user
    const userConfig = JSON.parse(args.config);

    // Ensure mcpServers field exists
    if (!userConfig.mcpServers) {
      userConfig.mcpServers = {};
    }

    // Validate each server's configuration format
    for (const [serverName, serverConfig] of Object.entries(userConfig.mcpServers)) {
      const config = serverConfig as { command: string; args: string[] };

      // Validate required fields
      if (!config.command || !Array.isArray(config.args)) {
        return createErrorResponse(
          `❌ Invalid config for '${serverName}'. Require 'command' and 'args' fields.`,
        );
      }
    }

    // If jsonOnly is true, just return the parsed config without saving
    if (jsonOnly) {
      return createSuccessResponse('✅ Config parsed', userConfig);
    }

    // Save configuration to external file
    const externalConfigPath = process.env.MCP_SETTINGS_PATH;
    if (!externalConfigPath) {
      return createErrorResponse('❌ MCP_SETTINGS_PATH not set. Set this to save config.');
    }

    // Read existing configuration (if any)
    let existingConfig: Record<string, unknown> = {};
    try {
      const existingData = await fs.readFile(externalConfigPath, 'utf-8');
      existingConfig = JSON.parse(existingData);
    } catch (error) {
      return createErrorResponse(`⚠️ Parse error: ${(error as Error).message}`);
    }

    // Merge configurations
    const mergedConfig = {
      ...existingConfig,
      mcpServers: {
        ...((existingConfig.mcpServers as Record<string, unknown>) || {}),
        ...userConfig.mcpServers,
      },
    };

    // Save merged configuration
    await fs.writeFile(externalConfigPath, JSON.stringify(mergedConfig, null, 2), 'utf-8');

    return createSuccessResponse('✅ Config saved');
  } catch (error) {
    return createErrorResponse(`⚠️ Parse error: ${(error as Error).message}`);
  }
}

/**
 * Save command to external configuration file (e.g., Claude's configuration file)
 * @param serverName MCP server name
 * @param command User input command, e.g., "npx @modelcontextprotocol/server-name --arg1 value1 --arg2 value2"
 * @param args Array of command arguments, e.g., ['--port', '3000', '--config', 'config.json']
 * @param env Environment variables object for the command, e.g., { 'NODE_ENV': 'production', 'DEBUG': 'true' }
 * @param jsonOnly If true, only return the command configuration without saving to files
 * @param description Optional description for the command
 * @returns Operation result
 */
export async function saveCommandToExternalConfig(
  serverName: string,
  command: string,
  args: string[],
  description: string,
  jsonOnly = false,
  env?: Record<string, string>,
): Promise<OperationResult> {
  try {
    if (!command) {
      return createErrorResponse('❌ Command cannot be empty');
    }

    // Check if server exists (in our MCP server registry)
    const server = await findServer(serverName);
    if (!server) {
      return createErrorResponse(`❌ Server '${serverName}' not found`);
    }

    // Create command configuration
    const commandConfig = {
      name: server?.name || serverName,
      command,
      args,
      env: env || {},
      description: description || server.description || '',
    };

    // If jsonOnly is true, just return the configuration without saving
    if (jsonOnly) {
      return createSuccessResponse('✅ Command config generated', commandConfig);
    }

    // Check environment variable - points to LLM (e.g., Claude) config file path
    const externalConfigPath = process.env.MCP_SETTINGS_PATH;
    if (!externalConfigPath) {
      return createErrorResponse(
        '❌ MCP_SETTINGS_PATH not set. Please set it to your LLM config path.',
      );
    }

    try {
      // Read external LLM configuration file
      const configData = await fs.readFile(externalConfigPath, 'utf-8');
      const config = JSON.parse(configData);

      // Ensure mcpServers field exists
      if (!config.mcpServers) {
        config.mcpServers = {};
      }

      // Add/update server configuration to LLM config file
      config.mcpServers[serverName] = commandConfig;

      // Save configuration to LLM config file
      await fs.writeFile(externalConfigPath, JSON.stringify(config, null, 2), 'utf-8');

      // Also update internal server configuration - save to our MCP server registry
      server.commandConfig = commandConfig;

      // Update server description if provided
      if (description) {
        server.description = description;
      }

      await saveSettings();

      return createSuccessResponse(`✅ Command saved for '${serverName}'`);
    } catch (error) {
      return createErrorResponse(`⚠️ Config file error: ${(error as Error).message}`);
    }
  } catch (error) {
    return createErrorResponse(`⚠️ Command save error: ${(error as Error).message}`);
  }
}
