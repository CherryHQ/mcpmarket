import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { exec as execCb } from "node:child_process";
import { promisify } from "node:util";
import { npxFinder } from "npx-scope-finder";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { MCPServerInfo, OperationResult } from "./types.js";

const exec = promisify(execCb);

/**
 * Simple Zod to JSON Schema conversion function
 */
function simpleZodToJsonSchema(
  schema: z.ZodType<unknown>
): Record<string, unknown> {
  // For simplicity, we only handle basic types
  if (schema instanceof z.ZodString) {
    return { type: "string" };
  }

  if (schema instanceof z.ZodNumber) {
    return { type: "number" };
  }

  if (schema instanceof z.ZodBoolean) {
    return { type: "boolean" };
  }

  if (schema instanceof z.ZodArray) {
    return {
      type: "array",
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
      type: "object",
      properties,
      required,
    };
  }

  if (schema instanceof z.ZodOptional) {
    return simpleZodToJsonSchema(schema._def.innerType);
  }

  // Default return
  return { type: "object" };
}

// Set path
const SETTINGS_PATH = path.join("mcp", "mcp_settings.json");

// Server settings
let serverSettings: { servers: MCPServerInfo[] } = { servers: [] };

/**
 * Preload MCP package information to local registry file
 */
async function preloadMCPPackages(): Promise<void> {
  try {
    // Get all available packages from @modelcontextprotocol domain
    const packages = await npxFinder("@modelcontextprotocol", {
      timeout: 15000,
      retries: 3,
      retryDelay: 1000,
    });

    // Filter and process package information
    for (const pkg of packages) {
      if (!pkg.name || pkg.name === "@modelcontextprotocol/sdk") {
        continue; // Skip SDK itself
      }

      try {
        // Extract server type (from package name)
        const nameParts = pkg.name.split("/");
        const serverName = nameParts[nameParts.length - 1];
        const serverType = serverName.replace("mcp-", "");

        // Build server information
        const serverInfo: MCPServerInfo = {
          name: pkg.name,
          repo: pkg.links?.repository || "",
          command: `npx ${pkg.name}`,
          description: pkg.description || `MCP ${serverType} server`,
          keywords: [...(pkg.keywords || []), serverType, "mcp"],
        };

        // Get README content directly from npxFinder returned data and add to serverInfo
        if (pkg.original?.readme) {
          serverInfo.readme = pkg.original.readme;
        }

        // Check if server is already registered
        const existingServer = serverSettings.servers.find(
          (s) => s.name === pkg.name
        );
        if (!existingServer) {
          serverSettings.servers.push(serverInfo);
        } else {
          // Update existing server's readme (if available)
          if (serverInfo.readme && !existingServer.readme) {
            existingServer.readme = serverInfo.readme;
          }
        }
      } catch (pkgError) {
        // Silently handle package errors
      }
    }

    // Save updated settings
    await saveSettings();
  } catch (error) {
    // Silently handle errors
  }
}

// Create MCP server instance
const server = new Server(
  {
    name: "mcp-auto-install",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tools list handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "mcp_auto_install_getAvailableServers",
        description:
          "List all available MCP servers that can be installed. Returns a list of server names and their basic information. Use this to discover what MCP servers are available before installing or configuring them.",
        inputSchema: simpleZodToJsonSchema(
          z.object({
            random_string: z
              .string()
              .describe("Dummy parameter for no-parameter tools"),
          })
        ),
      },
      {
        name: "mcp_auto_install_removeServer",
        description:
          "Remove a registered MCP server from the local registry. This will unregister the server but won't uninstall it. Provide the exact server name to remove. Use getAvailableServers first to see registered servers.",
        inputSchema: simpleZodToJsonSchema(
          z.object({
            serverName: z
              .string()
              .describe("The exact name of the server to remove from registry"),
          })
        ),
      },
      {
        name: "mcp_auto_install_configureServer",
        description:
          "Get detailed configuration help for a specific MCP server. Provides README content, configuration instructions, and suggested commands. Optionally specify a purpose or specific configuration question.",
        inputSchema: simpleZodToJsonSchema(
          z.object({
            serverName: z
              .string()
              .describe("The exact name of the server to configure"),
            purpose: z
              .string()
              .describe(
                "Optional: Specific use case or purpose for the server configuration"
              )
              .optional(),
            query: z
              .string()
              .describe(
                "Optional: Specific configuration question or parameter to get help with"
              )
              .optional(),
          })
        ),
      },
      // {
      //   name: "mcp_auto_install_getServerReadme",
      //   description:
      //     "Retrieve and display the full README documentation for a specific MCP server. This includes installation instructions, configuration options, and usage examples. Use this for detailed server information.",
      //   inputSchema: simpleZodToJsonSchema(
      //     z.object({
      //       serverName: z
      //         .string()
      //         .describe(
      //           "The exact name of the server to get README documentation for"
      //         ),
      //     })
      //   ),
      // },
      {
        name: "mcp_auto_install_saveNpxCommand",
        description:
          "Save an npx command configuration for an MCP server. This stores the command, arguments and environment variables in both the MCP settings and LLM configuration files. Use this to persist server-specific command configurations.",
        inputSchema: simpleZodToJsonSchema(
          z.object({
            serverName: z
              .string()
              .describe(
                "The exact name of the server to save command configuration for"
              ),
            command: z
              .string()
              .describe(
                "The main command to execute (e.g., 'npx', '@modelcontextprotocol/server-name')"
              ),
            args: z
              .array(z.string())
              .describe(
                "Array of command arguments (e.g., ['--port', '3000', '--config', 'config.json'])"
              ),
            env: z
              .record(z.string())
              .describe(
                "Environment variables object for the command (e.g., { 'NODE_ENV': 'production', 'DEBUG': 'true' })"
              )
              .optional(),
          })
        ),
      },
      {
        name: "mcp_auto_install_parseJsonConfig",
        description:
          "Parse and validate a JSON configuration string for MCP servers. This tool processes server configurations, validates their format, and merges them with existing configurations. Use this for bulk server configuration.",
        inputSchema: simpleZodToJsonSchema(
          z.object({
            config: z
              .string()
              .describe(
                "JSON string containing server configurations in the format: { 'mcpServers': { 'serverName': { 'command': 'string', 'args': ['string'] } } }"
              ),
          })
        ),
      },
    ],
  };
});

// Register tool call handler
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;

  switch (name) {
    case "mcp_auto_install_getAvailableServers": {
      const servers = await getRegisteredServers();
      return {
        content: [
          {
            type: "text",
            text: `Found ${servers.length} MCP servers`,
          },
          {
            type: "text",
            text: `${servers
              .map((server) => server.name)
              .join("\n")}\n Find similar MCP services from these`,
          },
        ],
      };
    }

    case "mcp_auto_install_removeServer": {
      const result = await handleRemoveServer(
        args as unknown as { serverName: string }
      );
      return {
        content: [
          {
            type: "text",
            text: result.message,
          },
        ],
      };
    }

    case "mcp_auto_install_configureServer": {
      const result = await handleConfigureServer(
        args as unknown as {
          serverName: string;
          purpose?: string;
          query?: string;
        }
      );

      const contentItems = [];

      // Add message
      contentItems.push({
        type: "text",
        text: result.message,
      });

      // Add explanation (if available)
      if (result.explanation) {
        contentItems.push({
          type: "text",
          text: result.explanation,
        });
      }

      // Add README content (if available)
      if (result.readmeContent) {
        contentItems.push({
          type: "text",
          text: result.readmeContent,
        });
      }

      return {
        content: contentItems,
      };
    }

    // case "mcp_auto_install_getServerReadme": {
    //   const result = await handleGetServerReadme(
    //     args as unknown as { serverName: string }
    //   );

    //   return {
    //     content: [
    //       {
    //         type: "text",
    //         text: result.message,
    //       },
    //       {
    //         type: "text",
    //         text: result.readmeContent || "No README content found.",
    //       },
    //     ],
    //   };
    // }

    case "mcp_auto_install_saveNpxCommand": {
      const result = await saveCommandToExternalConfig(
        args.serverName as string,
        args.command as string,
        args.args as string[],
        args.env as Record<string, string>
      );
      return {
        content: [
          {
            type: "text",
            text: result.message,
          },
        ],
      };
    }

    case "mcp_auto_install_parseJsonConfig": {
      const result = await handleParseConfig(
        args as unknown as { config: string }
      );
      return {
        content: [
          {
            type: "text",
            text: result.message,
          },
          ...(result.config
            ? [
                {
                  type: "text",
                  text: `Parsed configuration:\n${JSON.stringify(
                    result.config,
                    null,
                    2
                  )}`,
                },
              ]
            : []),
        ],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

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
      const data = await fs.readFile(SETTINGS_PATH, "utf-8");
      serverSettings = JSON.parse(data);
    } catch (error) {
      // If file doesn't exist, use default settings
      serverSettings = { servers: [] };
      // Save default settings
      await saveSettings();
    }
  } catch (error) {
    console.error("Failed to initialize settings:", error);
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
    await fs.writeFile(
      SETTINGS_PATH,
      JSON.stringify(serverSettings, null, 2),
      "utf-8"
    );
  } catch (error) {
    console.error("Failed to save settings:", error);
    throw new Error("Failed to save settings");
  }
}

/**
 * Find server
 */
async function findServer(name: string): Promise<MCPServerInfo | undefined> {
  // Ensure settings are loaded
  await initSettings();
  return serverSettings.servers.find((s) => s.name.includes(name));
}

/**
 * Get npm package name from GitHub repository URL
 */
async function getPackageNameFromRepo(repoUrl: string): Promise<string | null> {
  try {
    // First try using CLI method with -r option
    try {
      const { stdout } = await exec(`npx npx-scope-finder find ${repoUrl}`);
      const trimmedOutput = stdout.trim();
      if (trimmedOutput) {
        return trimmedOutput;
      }
    } catch (cliError) {
      // Continue with other methods
    }

    // Extract GitHub path
    const repoPath = extractGitHubPathFromUrl(repoUrl);
    if (!repoPath) {
      throw new Error(`Invalid GitHub repository URL: ${repoUrl}`);
    }

    // Use npxFinder API to find all executable packages under @modelcontextprotocol domain
    try {
      const packages = await npxFinder("@modelcontextprotocol", {
        timeout: 10000,
        retries: 3,
        retryDelay: 1000,
      });

      // Find package matching repo URL
      const matchingPackage = packages.find((pkg) =>
        pkg.links?.repository?.includes(repoPath)
      );

      if (matchingPackage) {
        return matchingPackage.name;
      }

      // If no matching package found, try matching by name
      const [owner, repo] = repoPath.split("/");
      const nameMatchingPackage = packages.find((pkg) =>
        pkg.name.endsWith(`/${repo}`)
      );

      if (nameMatchingPackage) {
        return nameMatchingPackage.name;
      }
    } catch (npmError) {
      // Continue with fallback methods
    }

    // Fallback method: assume package name format is @modelcontextprotocol/repo
    const repo = repoPath.split("/")[1];
    return `@modelcontextprotocol/${repo}`;
  } catch (error) {
    // If above methods fail, try extracting package name from URL
    const parts = repoUrl.split("/");
    if (parts.length >= 2) {
      const repo = parts[parts.length - 1].replace(".git", "");
      return `@modelcontextprotocol/${repo}`;
    }

    return null;
  }
}

/**
 * Extract GitHub path from URL
 */
function extractGitHubPathFromUrl(url: string): string | null {
  // Match GitHub URL
  const githubPattern = /github\.com[\/:]([^\/]+)\/([^\/\.]+)(\.git)?/;
  const match = url.match(githubPattern);

  if (match && match.length >= 3) {
    const owner = match[1];
    const repo = match[2];
    return `${owner}/${repo}`;
  }

  return null;
}

/**
 * Start MCP server
 */
export async function startServer(): Promise<void> {
  // Initialize settings
  await initSettings();

  // Preload MCP package information
  await preloadMCPPackages();

  // Start server with standard input/output
  const transport = new StdioServerTransport();
  await server.connect(transport);
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

export async function handleInstallServer(args: {
  serverName: string;
  useNpx?: boolean;
}): Promise<OperationResult> {
  const { serverName, useNpx = true } = args;
  const server = await findServer(serverName);

  if (!server) {
    return {
      success: false,
      message: `Server '${serverName}' not found in the registry. Use getAvailableServers to see available servers.`,
    };
  }

  try {
    if (useNpx) {
      // Install using npx
      const packageName = await getPackageNameFromRepo(server.repo);
      if (!packageName) {
        throw new Error(`Could not determine package name for ${server.repo}`);
      }

      const { stdout, stderr } = await exec(`npx ${packageName}`);

      return {
        success: true,
        message: `Successfully installed ${serverName} using npx. Output: ${stdout}`,
        output: stdout,
        error: stderr,
      };
    }

    // Install using git clone
    const repoName =
      server.repo.split("/").pop()?.replace(".git", "") || serverName;
    const cloneDir = path.join(homedir(), ".mcp", "servers", repoName);

    // Create directory
    await fs.mkdir(path.join(homedir(), ".mcp", "servers"), {
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

    return {
      success: true,
      message: `Successfully installed ${serverName} using git clone to ${cloneDir}`,
      installPath: cloneDir,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to install ${serverName}: ${(error as Error).message}`,
      error: (error as Error).message,
    };
  }
}

export async function handleRegisterServer(
  serverInfo: MCPServerInfo
): Promise<OperationResult> {
  // Check if server already exists
  const existingIndex = serverSettings.servers.findIndex(
    (s) => s.name === serverInfo.name
  );

  if (existingIndex !== -1) {
    // Update existing server
    serverSettings.servers[existingIndex] = serverInfo;
  } else {
    // Add new server
    serverSettings.servers.push(serverInfo);
  }

  // Save updated settings
  await saveSettings();

  return {
    success: true,
    message: `Server '${serverInfo.name}' has been registered successfully.`,
  };
}

export async function handleRemoveServer(args: {
  serverName: string;
}): Promise<OperationResult> {
  const { serverName } = args;
  const initialLength = serverSettings.servers.length;

  // Remove specified server
  serverSettings.servers = serverSettings.servers.filter(
    (s) => s.name !== serverName
  );

  if (serverSettings.servers.length === initialLength) {
    return {
      success: false,
      message: `Server '${serverName}' not found in the registry.`,
    };
  }

  // Save updated settings
  await saveSettings();

  return {
    success: true,
    message: `Server '${serverName}' has been removed successfully.`,
  };
}

export async function handleConfigureServer(args: {
  serverName: string;
  purpose?: string;
  query?: string;
}): Promise<OperationResult> {
  const { serverName, purpose = "", query = "" } = args;
  const server = await findServer(serverName);
  console.error("handleConfigureServer", server);

  if (!server) {
    return {
      success: false,
      message: `Server '${serverName}' not found in the registry.`,
    };
  }
  console.error("server_live");
  // Get README content
  const readmeResult = await handleGetServerReadme({ serverName });

  if (!readmeResult.success || !readmeResult.readmeContent) {
    return {
      success: false,
      message: `Failed to get README for ${serverName}: ${readmeResult.message}`,
    };
  }

  // Here we should call LLM API for configuration suggestions
  // For simplicity, we just return README content and prompts

  return {
    success: true,
    message: `Configuration help for ${serverName}`,
    readmeContent: readmeResult.readmeContent,
    explanation:
      "Please refer to the README content for configuration instructions.",
    // suggestedCommand: `mcp-auto-install install ${serverName}`,
  };
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
    return {
      success: false,
      message: `Server '${serverName}' not found in the registry.`,
    };
  }

  try {
    // Get README content (directly from server object)
    const readmeContent = server.readme || "Failed to get README.";

    // Add prompts to guide LLM in summarizing content and guiding parameter configuration
    const promptedReadme = `# ${serverName} README

${readmeContent}

---

Please follow the README content above to:
1. Summarize the main functions and purposes of this MCP server
2. Guide users on how to configure necessary parameters
3. Provide a simple usage example`;

    return {
      success: true,
      message: "README fetch successful",
      readmeContent: promptedReadme,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to fetch README: ${(error as Error).message}`,
    };
  }
}

/**
 * Get npm package README (from cache only)
 */
async function getPackageReadme(packageName: string): Promise<string> {
  try {
    // Ensure settings are loaded
    await initSettings();

    // Find README from server settings
    const server = serverSettings.servers.find((s) =>
      s.name.includes(packageName)
    );
    if (server?.readme) {
      return server.readme;
    }

    return "Failed to get README. Server has no preloaded README information.";
  } catch (error) {
    return `Failed to get README: ${(error as Error).message}`;
  }
}

/**
 * Save command to external configuration file (e.g., Claude's configuration file)
 * @param serverName MCP server name
 * @param command User input command, e.g., "npx @modelcontextprotocol/server-name --arg1 value1 --arg2 value2"
 * @param args Array of command arguments, e.g., ['--port', '3000', '--config', 'config.json']
 * @param env Environment variables object for the command, e.g., { 'NODE_ENV': 'production', 'DEBUG': 'true' }
 * @returns Operation result
 */
export async function saveCommandToExternalConfig(
  serverName: string,
  command: string,
  args: string[],
  env?: Record<string, string>
): Promise<OperationResult> {
  try {
    if (!command) {
      return {
        success: false,
        message: "Command cannot be empty",
      };
    }

    // Check environment variable - points to LLM (e.g., Claude) config file path, not mcp_settings.json
    const externalConfigPath = process.env.MCP_SETTINGS_PATH;
    if (!externalConfigPath) {
      return {
        success: false,
        message:
          "MCP_SETTINGS_PATH environment variable not set. Please set it to point to the LLM (e.g., Claude) configuration file path.",
      };
    }

    // Check if server exists (in our MCP server registry)
    const server = await findServer(serverName);
    if (!server) {
      return {
        success: false,
        message: `Server '${serverName}' does not exist in MCP server registry`,
      };
    }

    try {
      // Read external LLM configuration file
      const configData = await fs.readFile(externalConfigPath, "utf-8");
      const config = JSON.parse(configData);

      // Ensure mcpServers field exists
      if (!config.mcpServers) {
        config.mcpServers = {};
      }

      // Add/update server configuration to LLM config file
      config.mcpServers[serverName] = {
        command,
        args,
        env: env || {},
      };

      // Save configuration to LLM config file
      await fs.writeFile(
        externalConfigPath,
        JSON.stringify(config, null, 2),
        "utf-8"
      );

      // Also update internal server configuration - save to our MCP server registry
      server.commandConfig = {
        command,
        args,
        env: env || {},
      };
      await saveSettings();

      return {
        success: true,
        message: `Successfully saved command configuration for ${serverName} to LLM configuration file ${externalConfigPath}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to read or write LLM configuration file: ${
          (error as Error).message
        }`,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Failed to save command configuration: ${(error as Error).message}`,
    };
  }
}

/**
 * Handle user configuration parsing
 */
export async function handleParseConfig(args: {
  config: string;
}): Promise<OperationResult> {
  try {
    // Parse the JSON string sent by the user
    const userConfig = JSON.parse(args.config);

    // Ensure mcpServers field exists
    if (!userConfig.mcpServers) {
      userConfig.mcpServers = {};
    }

    // Validate each server's configuration format
    for (const [serverName, serverConfig] of Object.entries(
      userConfig.mcpServers
    )) {
      const config = serverConfig as { command: string; args: string[] };

      // Validate required fields
      if (!config.command || !Array.isArray(config.args)) {
        return {
          success: false,
          message: `Invalid configuration format for server ${serverName}. Must include command and args fields.`,
        };
      }
    }

    // Save configuration to external file
    const externalConfigPath = process.env.MCP_SETTINGS_PATH;
    if (!externalConfigPath) {
      return {
        success: false,
        message:
          "MCP_SETTINGS_PATH environment variable not set, cannot save configuration.",
      };
    }

    // Read existing configuration (if any)
    let existingConfig: Record<string, unknown> = {};
    try {
      const existingData = await fs.readFile(externalConfigPath, "utf-8");
      existingConfig = JSON.parse(existingData);
    } catch (error) {
      // If file doesn't exist or parsing fails, use empty object
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
    await fs.writeFile(
      externalConfigPath,
      JSON.stringify(mergedConfig, null, 2),
      "utf-8"
    );

    return {
      success: true,
      message: "Configuration parsed and saved successfully",
      config: mergedConfig,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to parse configuration: ${(error as Error).message}`,
    };
  }
}
