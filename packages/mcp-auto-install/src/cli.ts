#!/usr/bin/env node

import cac from 'cac';

import {
  startServer,
  getRegisteredServers,
  handleInstallServer,
  handleRegisterServer,
  handleRemoveServer,
  handleGetServerReadme,
  handleConfigureServer,
  handleParseConfig,
  saveCommandToExternalConfig,
} from './server.js';
import { checkMCPSettings } from './utils/utils.js';

interface StartOptions {
  json?: boolean;
}

interface RegisterOptions {
  repo: string;
  command: string;
  description: string;
  keywords?: string;
  installCommands?: string;
}

interface ParseConfigOptions {
  json?: boolean;
}

interface SaveCommandOptions {
  env?: string | string[];
  json?: boolean;
  description?: string;
  params?: string[];
}

/**
 * Command line interface for controlling MCP automatic installation servers
 */
export class MCPCliApp {
  private cli: ReturnType<typeof cac>;

  constructor() {
    this.cli = cac('mcp-auto-install');
    this.setupCLI();
  }

  private setupCLI() {
    this.cli.version('0.1.8').help(() => {
      console.log('A tool for managing MCP server sources and installing MCP servers from GitHub');
    });

    // Add default command to start the server
    this.cli
      .command('start', 'Start the MCP Auto Install server')
      .option('--json', 'Return responses in JSON format (for programmatic use)')
      .action(async (options: StartOptions) => {
        await startServer(options.json);
      });

    // Add command to register a new server
    this.cli
      .command('add-source <name>', 'Add or update an MCP server source in the registry')
      .option('-r, --repo <url>', 'GitHub repository URL')
      .option('-c, --command <command>', 'Command to run the server')
      .option('-d, --description <text>', 'Description of the server')
      .option('-k, --keywords <keywords>', 'Comma-separated keywords')
      .option('-i, --install-commands <commands>', 'Comma-separated custom installation commands')
      .action(async (name: string, options: RegisterOptions) => {
        const result = await handleRegisterServer({
          name,
          repo: options.repo,
          command: options.command,
          description: options.description,
          keywords: options.keywords?.split(',').filter(Boolean) || [],
          installCommands: options.installCommands?.split(',').filter(Boolean),
        });

        if (result.success) {
          console.log(result.message);
        } else {
          console.error(result.message);
        }
        process.exit(0);
      });

    // Add a command to install a server
    this.cli
      .command('install <name>', 'Install an MCP server from GitHub repository')
      .action(async (name: string) => {
        const result = await handleInstallServer({ serverName: name });

        if (result.success) {
          console.log(result.message);
        } else {
          console.error(result.message);
        }
        process.exit(0);
      });

    // Add command to list registered servers
    this.cli.command('list', 'List all registered MCP server sources').action(async () => {
      const servers = await getRegisteredServers();
      if (servers.length === 0) {
        console.log('No MCP server sources registered.');
        return;
      }

      console.log('Registered MCP server sources:');
      for (const server of servers) {
        console.log(`\n${server.name}`);
        console.log(`  Description: ${server.description}`);
        console.log(`  Repository: ${server.repo}`);
        console.log(`  Command: ${server.command}`);
        if (server.keywords && server.keywords.length > 0) {
          console.log(`  Keywords: ${server.keywords.join(', ')}`);
        }
      }
      process.exit(0);
    });

    // Add command to get README for a server
    this.cli
      .command('readme <name>', 'Get the README content for an MCP server')
      .action(async (name: string) => {
        const result = await handleGetServerReadme({ serverName: name });

        if (result.success) {
          console.log(`README for ${name}:`);
          console.log();
          console.log(result.data || 'No README content available.');
        } else {
          console.error(result.message || 'Failed to fetch README.');
        }
        process.exit(0);
      });

    // Add command to configure a server
    this.cli
      .command('configure-server <name>', 'Get configuration help for an MCP server')
      .action(async (name: string) => {
        const result = await handleConfigureServer({ serverName: name });

        if (result.success) {
          console.log(`Configuration for ${name}:`);
          console.log();
          for (const msg of result.message) {
            console.log(msg);
          }
        } else {
          console.error(result.message || 'Failed to get configuration help.');
        }
        process.exit(0);
      });

    // Add command to remove a server
    this.cli
      .command('remove <name>', 'Remove a registered MCP server')
      .action(async (name: string) => {
        const result = await handleRemoveServer({ serverName: name });

        if (result.success) {
          console.log(result.message);
        } else {
          console.error(result.message);
        }
        process.exit(0);
      });

    // Add command to parse JSON config
    this.cli
      .command('parse-config <config>', 'Parse and save JSON configuration for MCP servers')
      .option('--json', 'Return result as JSON without modifying config files')
      .action(async (config: string, options: ParseConfigOptions) => {
        const result = await handleParseConfig({ config }, options.json);

        if (result.success) {
          if (options.json) {
            console.log(JSON.stringify(result, null, 2));
          } else {
            console.log(`✅ ${result.message}`);
          }
        } else {
          console.error(`❌ ${result.message}`);
        }
        process.exit(0);
      });

    // Add a command to save user command to config
    this.cli
      .command(
        'save-command <server-name> <command>',
        'Save a command for a server to external config file',
      )
      .option('-e, --env <env>', 'Environment variables (e.g., --env NODE_ENV=production)')
      .option('-p, --params <params...>', 'Arguments for the command being saved')
      .option('--json', 'Return result as JSON without modifying config files')
      .option('--description <text>', 'A description of what this MCP service does')
      .action(async (serverName: string, command: string, options: SaveCommandOptions) => {
        console.log(`Saving command to external config file: ${serverName} ${command}`);

        // Process env options
        const envVars: Record<string, string> = {};
        if (options.env) {
          const envEntries = Array.isArray(options.env) ? options.env : [options.env];
          for (const envItem of envEntries) {
            const [key, value] = envItem.split('=');
            if (key && value) {
              envVars[key] = value;
            }
          }
        }

        const result = await saveCommandToExternalConfig(
          serverName,
          command,
          options.params || [],
          options.description || '',
          options.json,
          envVars,
        );

        if (result.success) {
          if (options.json) {
            console.log(JSON.stringify(result, null, 2));
          } else {
            console.log(`✅ ${result.message}`);
          }
        } else {
          console.error(`❌ ${result.message}`);
        }
        process.exit(0);
      });

    this.cli.parse();
  }

  public run() {
    checkMCPSettings();
    this.cli.parse();
  }
}

export default MCPCliApp;
