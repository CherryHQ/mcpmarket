#!/usr/bin/env node

import { Command } from 'commander';

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
/**
 * Command line interface for controlling MCP automatic installation servers
 */
export class MCPCliApp {
  private program: Command;

  constructor() {
    this.program = new Command();
    this.setupCLI();
  }

  private setupCLI() {
    this.program
      .name('mcp-auto-install')
      .description('A tool for managing MCP server sources and installing MCP servers from GitHub')
      .version('0.1.1');

    // Add default command to start the server
    this.program
      .command('start', { isDefault: true })
      .description('Start the MCP Auto Install server')
      .option('--json', 'Return responses in JSON format (for programmatic use)')
      .action(async options => {
        await startServer(options.json);
      });

    // Add command to register a new server
    this.program
      .command('add-source <name>')
      .description('Add or update an MCP server source in the registry')
      .requiredOption('-r, --repo <url>', 'GitHub repository URL')
      .requiredOption('-c, --command <command>', 'Command to run the server')
      .requiredOption('-d, --description <text>', 'Description of the server')
      .option('-k, --keywords <keywords>', 'Comma-separated keywords', val => val.split(','))
      .option(
        '-i, --install-commands <commands>',
        'Comma-separated custom installation commands',
        val => val.split(','),
      )
      .action(async (name, options) => {
        const result = await handleRegisterServer({
          name,
          repo: options.repo,
          command: options.command,
          description: options.description,
          keywords: options.keywords || [],
          installCommands: options.installCommands,
        });

        if (result.success) {
          console.log(result.message);
        } else {
          console.error(result.message);
        }
        process.exit(0);
      });

    // Add a command to install a server
    this.program
      .command('install <name>')
      .description('Install an MCP server from GitHub repository')
      .action(async name => {
        const result = await handleInstallServer({ serverName: name });

        if (result.success) {
          console.log(result.message);
        } else {
          console.error(result.message);
        }
        process.exit(0);
      });

    // Add command to list registered servers
    this.program
      .command('list')
      .description('List all registered MCP server sources')
      .action(async () => {
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
    this.program
      .command('readme <name>')
      .description('Get the README content for an MCP server')
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
    this.program
      .command('configure-server <name>')
      .description('Get configuration help for an MCP server')
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
    this.program
      .command('remove <name>')
      .description('Remove a registered MCP server')
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
    this.program
      .command('parse-config <config>')
      .description('Parse and save JSON configuration for MCP servers')
      .option('--json', 'Return result as JSON without modifying config files')
      .action(async (config: string, options) => {
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
    this.program
      .command('save-command <server-name> <command>')
      .description('Save a command for a server to external config file')
      .argument('[args...]', 'Command arguments')
      .option(
        '--env <key=value>',
        'Environment variables (e.g., --env NODE_ENV=production)',
        (val, prev) => {
          const [key, value] = val.split('=');
          return { ...prev, [key]: value };
        },
        {},
      )
      .option('--json', 'Return result as JSON without modifying config files')
      .option('--description <text>', 'A description of what this MCP service does')
      .action(
        async (
          serverName: string,
          command: string,
          args: string[],
          options: { env: Record<string, string>; json?: boolean; description?: string },
        ) => {
          console.log(
            `Saving command to external config file: ${serverName} ${command} ${args.join(' ')}`,
          );
          const result = await saveCommandToExternalConfig(
            serverName,
            command,
            args,
            options.description || '',
            options.json,
            options.env,
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
        },
      );

    // Uncomment if you want to implement the update-registry command
    /*
    this.program
      .command("update-registry")
      .description("Update the registry from a remote source")
      .option("-u, --url <url>", "URL to fetch registry from")
      .action(async (options: { url?: string }) => {
        try {
          // Initialize server instance
          this.server = new MCPAutoInstallServer();
          await this.server.init();

          // Implement update registry functionality
          console.log("Registry updated successfully");
        } catch (error) {
          console.error("Failed to update registry:", error);
        }
        process.exit(0);
      });
    */

    this.program.parse(process.argv);
  }

  /**
   * Run the CLI application
   */
  public run() {
    // Check environment variables
    checkMCPSettings();

    this.program.parse(process.argv);
  }
}

// In ESM module, do not use module detection, directly delete this part of the code
export default MCPCliApp;
