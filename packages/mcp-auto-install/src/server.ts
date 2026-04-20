#!/usr/bin/env node

import { createRequire } from 'node:module';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import type { RegistryServerEntry } from './types.js';
import * as registry from './registry.js';
import { writeServerConfig, removeServerConfig } from './clients.js';
import {
  pickBestPackage,
  resolveCommand,
  resolveArgs,
  buildInstallCommand,
  fetchReadme,
} from './helpers.js';
import { toToolResponse } from './utils/response.js';

// ---------------------------------------------------------------------------
// Version (read from package.json at runtime)
// ---------------------------------------------------------------------------

const require = createRequire(import.meta.url);
const { version: PKG_VERSION } = require('../package.json') as { version: string };

// ---------------------------------------------------------------------------
// npm scope fallback (used when Registry API is unavailable)
// ---------------------------------------------------------------------------

const DEFAULT_PACKAGE_SCOPES = ['@modelcontextprotocol'];
const PACKAGE_SCOPES = process.env.MCP_PACKAGE_SCOPES
  ? process.env.MCP_PACKAGE_SCOPES.split(',')
      .map(s => s.trim())
      .filter(Boolean)
  : DEFAULT_PACKAGE_SCOPES;

async function fallbackNpmSearch(query: string, limit = 20): Promise<RegistryServerEntry[]> {
  try {
    const { npxFinder } = await import('npx-scope-finder');
    const results: RegistryServerEntry[] = [];

    for (const scope of PACKAGE_SCOPES) {
      try {
        const packages = await npxFinder(scope, {
          timeout: 15_000,
          retries: 2,
          retryDelay: 1000,
        });

        for (const pkg of packages) {
          if (!pkg.name || pkg.name === '@modelcontextprotocol/sdk') continue;
          if (
            query &&
            !pkg.name.toLowerCase().includes(query.toLowerCase()) &&
            !(pkg.description || '').toLowerCase().includes(query.toLowerCase())
          ) {
            continue;
          }

          results.push({
            server: {
              name: pkg.name,
              description: pkg.description || '',
              version: pkg.version || '0.0.0',
              repository: pkg.links?.repository
                ? { url: pkg.links.repository, source: 'npm' }
                : undefined,
              packages: [
                {
                  registryType: 'npm',
                  identifier: pkg.name,
                  transport: { type: 'stdio' },
                },
              ],
            },
            _meta: {
              'io.modelcontextprotocol.registry/official': {
                status: 'active',
                publishedAt: '',
                updatedAt: '',
                isLatest: true,
              },
            },
          });
        }
      } catch {
        // Individual scope failure — continue with others
      }
    }

    const limited = results.slice(0, limit);

    // Cache fallback results so subsequent mai_install/mai_details/mai_readme
    // can resolve them via getServer() without hitting the (down) Registry.
    if (limited.length > 0) {
      try {
        await registry.putManyInCache(limited);
      } catch {
        // Cache write failure shouldn't break the search
      }
    }

    return limited;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Tool: mai_search
// ---------------------------------------------------------------------------

const SearchInputSchema = z.object({
  query: z.string().describe('Search keyword (e.g. "filesystem", "git", "database")'),
  limit: z.number().optional().describe('Max results to return (default 20, max 100)'),
});

async function handleSearch(args: z.infer<typeof SearchInputSchema>) {
  const { query, limit } = args;

  let entries: RegistryServerEntry[];
  let source = 'registry';

  try {
    const result = await registry.searchServers(query, limit || 20);
    entries = result.servers;
  } catch {
    source = 'npm-fallback';
    entries = await fallbackNpmSearch(query, limit || 20);
  }

  if (entries.length === 0) {
    return toToolResponse({
      success: true,
      message: [`No servers found for "${query}" (source: ${source}).`],
    });
  }

  const lines = entries.map(e => {
    const s = e.server;
    const types = (s.packages || []).map(p => p.registryType).join(', ');
    const remote = s.remotes?.length ? ' | remote' : '';
    return `- ${s.name} (v${s.version}) — ${s.description}${types ? ` [${types}${remote}]` : ''}`;
  });

  return toToolResponse({
    success: true,
    message: [`Found ${entries.length} server(s) for "${query}" (source: ${source}):`, ...lines],
  });
}

// ---------------------------------------------------------------------------
// Tool: mai_details
// ---------------------------------------------------------------------------

const DetailsInputSchema = z.object({
  serverName: z
    .string()
    .describe('Full server name from the registry (e.g. "io.github.user/repo")'),
});

async function handleDetails(args: z.infer<typeof DetailsInputSchema>) {
  let entry: RegistryServerEntry | null;
  try {
    entry = await registry.getServer(args.serverName);
  } catch (error) {
    return toToolResponse({
      success: false,
      message: [`Failed to fetch server "${args.serverName}": ${(error as Error).message}`],
    });
  }

  if (!entry) {
    return toToolResponse({
      success: false,
      message: [`Server "${args.serverName}" not found in the registry.`],
    });
  }

  const s = entry.server;
  const sections: string[] = [`# ${s.title || s.name}`, `Version: ${s.version}`, s.description];

  if (s.repository) {
    sections.push(`Repository: ${s.repository.url}`);
  }
  if (s.websiteUrl) {
    sections.push(`Website: ${s.websiteUrl}`);
  }

  // Packages
  if (s.packages?.length) {
    sections.push('\n## Packages');
    for (const pkg of s.packages) {
      const cmd = buildInstallCommand(pkg);
      sections.push(`- [${pkg.registryType}] ${pkg.identifier}${cmd ? `\n  Install: ${cmd}` : ''}`);

      if (pkg.environmentVariables?.length) {
        sections.push('  Environment variables:');
        for (const ev of pkg.environmentVariables) {
          const req = ev.isRequired ? ' (required)' : '';
          const def = ev.default ? ` [default: ${ev.default}]` : '';
          const secret = ev.isSecret ? ' (secret)' : '';
          sections.push(`    ${ev.name}: ${ev.description}${req}${def}${secret}`);
        }
      }

      if (pkg.packageArguments?.length) {
        sections.push('  Arguments:');
        for (const arg of pkg.packageArguments) {
          const req = arg.isRequired ? ' (required)' : '';
          const def = arg.default ? ` [default: ${arg.default}]` : '';
          sections.push(`    ${arg.name}: ${arg.description}${req}${def}`);
        }
      }
    }
  }

  // Remotes
  if (s.remotes?.length) {
    sections.push('\n## Remote connections');
    for (const r of s.remotes) {
      sections.push(`- ${r.type}: ${r.url}`);
    }
  }

  // Hint for LLM to use mai_readme for more details
  if (s.repository?.url) {
    sections.push(
      '\n---',
      'Tip: Use mai_readme to get the full documentation, including available tools, usage examples, and configuration guides.',
    );
  }

  return toToolResponse({
    success: true,
    message: sections,
    data: entry,
  });
}

// ---------------------------------------------------------------------------
// Tool: mai_install
// ---------------------------------------------------------------------------

const InstallInputSchema = z.object({
  serverName: z
    .string()
    .describe('Full server name from the registry (e.g. "io.github.user/repo")'),
  env: z
    .record(z.string())
    .optional()
    .describe('Environment variables to set (e.g. { "API_KEY": "xxx" })'),
  dryRun: z
    .boolean()
    .optional()
    .describe(
      'If true, return the config without writing to any files. Useful for clients that manage their own config storage (e.g. CherryStudio).',
    ),
});

async function handleInstall(args: z.infer<typeof InstallInputSchema>) {
  let entry: RegistryServerEntry | null;
  try {
    entry = await registry.getServer(args.serverName);
  } catch (error) {
    return toToolResponse({
      success: false,
      message: [`Failed to fetch server "${args.serverName}": ${(error as Error).message}`],
    });
  }

  if (!entry) {
    return toToolResponse({
      success: false,
      message: [`Server "${args.serverName}" not found in the registry.`],
    });
  }

  const s = entry.server;

  // Pick the best package (prefer npm stdio)
  const pkg = pickBestPackage(s.packages || []);
  if (!pkg) {
    // Check for remote-only servers
    if (s.remotes?.length) {
      return toToolResponse({
        success: false,
        message: [
          `"${s.name}" is a remote-only server (no local package).`,
          `Connect via: ${s.remotes[0].type} at ${s.remotes[0].url}`,
          'Remote server configuration is not yet supported by auto-install.',
        ],
      });
    }

    return toToolResponse({
      success: false,
      message: [`No installable package found for "${s.name}".`],
    });
  }

  // Build command config
  const command = resolveCommand(pkg);
  const cmdArgs = resolveArgs(pkg);
  const env = args.env || {};

  const configPayload = {
    command,
    args: cmdArgs,
    ...(Object.keys(env).length > 0 && { env }),
  };

  // Dry run: return config data without writing
  if (args.dryRun) {
    const requiredEnvVars = (pkg.environmentVariables || []).filter(
      ev => ev.isRequired && !env[ev.name],
    );

    return toToolResponse({
      success: true,
      message: [`Config for "${s.name}" (dry run):`],
      data: {
        serverName: args.serverName,
        config: configPayload,
        registryType: pkg.registryType,
        transport: pkg.transport,
        requiredEnvVars: requiredEnvVars.map(ev => ({
          name: ev.name,
          description: ev.description,
          isSecret: ev.isSecret || false,
        })),
      },
    });
  }

  // Write to client configs
  const written = await writeServerConfig(args.serverName, configPayload);

  if (written.length === 0) {
    return toToolResponse({
      success: false,
      message: [
        `Failed to write config. No LLM client config files found.`,
        'Set MCP_SETTINGS_PATH or install a supported client (Claude Desktop, Cursor, Windsurf).',
      ],
    });
  }

  // Report required env vars the user still needs to set
  const requiredEnvVars = (pkg.environmentVariables || []).filter(
    ev => ev.isRequired && !env[ev.name],
  );

  const messages = [
    `Installed "${s.name}" to: ${written.join(', ')}`,
    `Command: ${command} ${cmdArgs.join(' ')}`,
  ];

  if (requiredEnvVars.length > 0) {
    messages.push(
      '\nRequired environment variables not yet set:',
      ...requiredEnvVars.map(ev => `  ${ev.name}: ${ev.description}`),
      '\nSet these in the server config or re-run with --env.',
    );
  }

  return toToolResponse({ success: true, message: messages });
}

// ---------------------------------------------------------------------------
// Tool: mai_remove
// ---------------------------------------------------------------------------

const RemoveInputSchema = z.object({
  serverName: z.string().describe('Exact name of the server to remove'),
});

async function handleRemove(args: z.infer<typeof RemoveInputSchema>) {
  const removed = await removeServerConfig(args.serverName);

  if (removed.length === 0) {
    return toToolResponse({
      success: false,
      message: [`Server "${args.serverName}" not found in any client configs.`],
    });
  }

  return toToolResponse({
    success: true,
    message: [
      `Removed "${args.serverName}".`,
      `Removed from client configs: ${removed.join(', ')}`,
    ],
  });
}

// ---------------------------------------------------------------------------
// Tool: mai_readme
// ---------------------------------------------------------------------------

const ReadmeInputSchema = z.object({
  serverName: z
    .string()
    .describe('Full server name from the registry (e.g. "io.github.user/repo")'),
});

async function handleReadme(args: z.infer<typeof ReadmeInputSchema>) {
  let entry: RegistryServerEntry | null;
  try {
    entry = await registry.getServer(args.serverName);
  } catch (error) {
    return toToolResponse({
      success: false,
      message: [`Failed to fetch server "${args.serverName}": ${(error as Error).message}`],
    });
  }

  if (!entry) {
    return toToolResponse({
      success: false,
      message: [`Server "${args.serverName}" not found in the registry.`],
    });
  }

  const repo = entry.server.repository;
  if (!repo?.url) {
    return toToolResponse({
      success: false,
      message: [`Server "${args.serverName}" has no repository URL.`],
    });
  }

  const readme = await fetchReadme(repo.url, repo.subfolder);
  if (!readme) {
    return toToolResponse({
      success: false,
      message: [
        `Could not fetch README for "${args.serverName}".`,
        `Repository: ${repo.url}`,
        'Only GitHub repositories are supported. The README may not exist or the repository may be private.',
      ],
    });
  }

  return toToolResponse({
    success: true,
    message: [
      `# README: ${entry.server.title || entry.server.name}`,
      `Repository: ${repo.url}`,
      '',
      readme,
    ],
  });
}

// ---------------------------------------------------------------------------
// Zod schema → JSON Schema (lightweight, for ListTools inputSchema)
// ---------------------------------------------------------------------------

function zodToInputSchema(schema: z.ZodObject<z.ZodRawShape>): Record<string, unknown> {
  const properties: Record<string, Record<string, unknown>> = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(schema.shape)) {
    const zodVal = value as z.ZodTypeAny;
    properties[key] = describeZodType(zodVal);

    if (!zodVal.isOptional()) {
      required.push(key);
    }
  }

  return { type: 'object', properties, required };
}

function describeZodType(schema: z.ZodTypeAny): Record<string, unknown> {
  if (schema instanceof z.ZodOptional) {
    return describeZodType(schema._def.innerType);
  }

  const desc = schema._def.description;
  const base: Record<string, unknown> = {};
  if (desc) base.description = desc;

  if (schema instanceof z.ZodString) return { type: 'string', ...base };
  if (schema instanceof z.ZodNumber) return { type: 'number', ...base };
  if (schema instanceof z.ZodBoolean) return { type: 'boolean', ...base };

  if (schema instanceof z.ZodArray) {
    return { type: 'array', items: describeZodType(schema._def.type), ...base };
  }

  if (schema instanceof z.ZodRecord) {
    return {
      type: 'object',
      additionalProperties: describeZodType(schema._def.valueType),
      ...base,
    };
  }

  if (schema instanceof z.ZodObject) {
    return { ...zodToInputSchema(schema as z.ZodObject<z.ZodRawShape>), ...base };
  }

  return { type: 'object', ...base };
}

// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------

function createServer() {
  const server = new Server(
    { name: 'mcp-auto-install', version: PKG_VERSION },
    { capabilities: { tools: {} } },
  );

  const tools = [
    {
      name: 'mai_search',
      description:
        'Search for MCP servers in the official registry. Returns server names, descriptions, versions, and supported package types. Use this to discover available servers before installing.',
      inputSchema: zodToInputSchema(SearchInputSchema),
    },
    {
      name: 'mai_details',
      description:
        'Get detailed information about a specific MCP server from the registry. Returns environment variables, arguments, transport config, and installation commands.',
      inputSchema: zodToInputSchema(DetailsInputSchema),
    },
    {
      name: 'mai_install',
      description:
        'Install an MCP server by writing its configuration to LLM client config files (Claude Desktop, Cursor, Windsurf). Automatically builds the correct npx/uvx/docker command from registry metadata.',
      inputSchema: zodToInputSchema(InstallInputSchema),
    },
    {
      name: 'mai_remove',
      description: 'Remove an MCP server from LLM client config files.',
      inputSchema: zodToInputSchema(RemoveInputSchema),
    },
    {
      name: 'mai_readme',
      description:
        'Get the full documentation (README) of an MCP server. Returns available tools, usage examples, configuration guides, and other details not included in mai_details. Use this when you need to understand what a server can do or help the user decide between similar servers.',
      inputSchema: zodToInputSchema(ReadmeInputSchema),
    },
  ];

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async req => {
    const { name, arguments: args = {} } = req.params;

    switch (name) {
      case 'mai_search':
        return handleSearch(SearchInputSchema.parse(args));
      case 'mai_details':
        return handleDetails(DetailsInputSchema.parse(args));
      case 'mai_install':
        return handleInstall(InstallInputSchema.parse(args));
      case 'mai_remove':
        return handleRemove(RemoveInputSchema.parse(args));
      case 'mai_readme':
        return handleReadme(ReadmeInputSchema.parse(args));
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  return server;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function startServer(): Promise<void> {
  console.error('Starting MCP Auto Install server...');
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Auto Install server ready (v' + PKG_VERSION + ')');
}

// Re-export for CLI usage
export { searchServers, getServer } from './registry.js';
