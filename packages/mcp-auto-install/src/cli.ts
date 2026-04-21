#!/usr/bin/env node

import { createRequire } from 'node:module';
import { Command } from 'commander';

import { startServer, searchServers, getServer } from './server.js';
import { writeServerConfig, removeServerConfig } from './clients.js';
import {
  pickBestPackage,
  resolveCommand,
  resolveArgs,
  buildInstallCommand,
  fetchReadme,
} from './helpers.js';

const require = createRequire(import.meta.url);
const { version: PKG_VERSION } = require('../package.json') as { version: string };

/**
 * CLI application for MCP Auto Install.
 */
export class MCPCliApp {
  private program: Command;

  constructor() {
    this.program = new Command();
    this.setupCLI();
  }

  private setupCLI() {
    this.program
      .name('mai')
      .description('Discover, install, and manage MCP servers from the official registry')
      .version(PKG_VERSION);

    // Default command: start MCP server
    this.program
      .command('start', { isDefault: true })
      .description('Start the MCP Auto Install server')
      .action(async () => {
        await startServer();
      });

    // Search the registry
    this.program
      .command('search <query>')
      .description('Search for MCP servers in the official registry')
      .option('-l, --limit <n>', 'Max results (default 20)', val => parseInt(val, 10))
      .action(async (query: string, options: { limit?: number }) => {
        try {
          const result = await searchServers(query, options.limit || 20);
          if (result.servers.length === 0) {
            console.log(`No servers found for "${query}".`);
            process.exit(0);
          }

          console.log(`Found ${result.servers.length} server(s) for "${query}":\n`);
          for (const entry of result.servers) {
            const s = entry.server;
            const types = (s.packages || []).map(p => p.registryType).join(', ');
            const remote = s.remotes?.length ? ' | remote' : '';
            console.log(`  ${s.name} (v${s.version})`);
            console.log(`    ${s.description}`);
            if (types || remote) console.log(`    [${types}${remote}]`);
            console.log();
          }
        } catch (error) {
          console.error('Search failed:', (error as Error).message);
          process.exit(1);
        }
        process.exit(0);
      });

    // Show server details
    this.program
      .command('info <name>')
      .description('Show detailed information about an MCP server')
      .action(async (name: string) => {
        try {
          const entry = await getServer(name);
          if (!entry) {
            console.error(`Server "${name}" not found in the registry.`);
            process.exit(1);
          }

          const s = entry.server;
          console.log(`\n${s.title || s.name} (v${s.version})`);
          console.log(`  ${s.description}`);
          if (s.repository) console.log(`  Repository: ${s.repository.url}`);
          if (s.websiteUrl) console.log(`  Website: ${s.websiteUrl}`);

          if (s.packages?.length) {
            console.log('\nPackages:');
            for (const pkg of s.packages) {
              console.log(`  [${pkg.registryType}] ${pkg.identifier}`);
              const cmd = buildInstallCommand(pkg);
              if (cmd) console.log(`    Install: ${cmd}`);

              if (pkg.environmentVariables?.length) {
                console.log('    Env vars:');
                for (const ev of pkg.environmentVariables) {
                  const flags = [
                    ev.isRequired && 'required',
                    ev.isSecret && 'secret',
                    ev.default && `default: ${ev.default}`,
                  ]
                    .filter(Boolean)
                    .join(', ');
                  console.log(`      ${ev.name}: ${ev.description}${flags ? ` (${flags})` : ''}`);
                }
              }
            }
          }

          if (s.remotes?.length) {
            console.log('\nRemote connections:');
            for (const r of s.remotes) {
              console.log(`  ${r.type}: ${r.url}`);
            }
          }

          console.log();
        } catch (error) {
          console.error('Failed:', (error as Error).message);
          process.exit(1);
        }
        process.exit(0);
      });

    // Install a server
    this.program
      .command('install <name>')
      .description('Install and configure an MCP server')
      .option(
        '--env <key=value>',
        'Set environment variable (repeatable)',
        (val: string, prev: Record<string, string>) => {
          const eqIndex = val.indexOf('=');
          if (eqIndex === -1) return prev;
          const key = val.slice(0, eqIndex);
          const value = val.slice(eqIndex + 1);
          return { ...prev, [key]: value };
        },
        {} as Record<string, string>,
      )
      .option('--dry-run', 'Return config without writing to files')
      .action(async (name: string, options: { env: Record<string, string>; dryRun?: boolean }) => {
        try {
          const entry = await getServer(name);
          if (!entry) {
            console.error(`Server "${name}" not found in the registry.`);
            process.exit(1);
          }

          const s = entry.server;
          const pkg = pickBestPackage(s.packages || []);
          if (!pkg) {
            console.error(`No installable package found for "${name}".`);
            process.exit(1);
          }

          const command = resolveCommand(pkg);
          const args = resolveArgs(pkg);
          const env = options.env;
          const config = {
            command,
            args,
            ...(Object.keys(env).length > 0 && { env }),
          };

          // Dry run: just print config
          if (options.dryRun) {
            console.log(
              JSON.stringify(
                {
                  serverName: name,
                  config,
                  registryType: pkg.registryType,
                  transport: pkg.transport,
                },
                null,
                2,
              ),
            );
            process.exit(0);
          }

          const written = await writeServerConfig(name, config);
          if (written.length === 0) {
            console.error('No LLM client configs found. Set MCP_SETTINGS_PATH.');
            process.exit(1);
          }

          console.log(`Installed "${name}" to: ${written.join(', ')}`);
          console.log(`  ${command} ${args.join(' ')}`);

          // Warn about required env vars
          const missing = (pkg.environmentVariables || []).filter(
            ev => ev.isRequired && !env[ev.name],
          );
          if (missing.length > 0) {
            console.log('\nRequired env vars not set:');
            for (const ev of missing) {
              console.log(`  ${ev.name}: ${ev.description}`);
            }
          }
        } catch (error) {
          console.error('Install failed:', (error as Error).message);
          process.exit(1);
        }
        process.exit(0);
      });

    // Remove a server
    this.program
      .command('remove <name>')
      .description('Remove an installed MCP server')
      .action(async (name: string) => {
        const removed = await removeServerConfig(name);

        if (removed.length === 0) {
          console.error(`Server "${name}" not found in any client configs.`);
          process.exit(1);
        }

        console.log(`Removed "${name}" from: ${removed.join(', ')}`);
        process.exit(0);
      });

    // Fetch README from GitHub
    this.program
      .command('readme <name>')
      .description("Fetch the server's README from GitHub")
      .action(async (name: string) => {
        try {
          const entry = await getServer(name);
          if (!entry) {
            console.error(`Server "${name}" not found in the registry.`);
            process.exit(1);
          }

          const repo = entry.server.repository;
          if (!repo?.url) {
            console.error(`Server "${name}" has no repository URL.`);
            process.exit(1);
          }

          const readme = await fetchReadme(repo.url, repo.subfolder);
          if (!readme) {
            console.error(
              `Could not fetch README for "${name}". Repository: ${repo.url}\n` +
                'Only GitHub repositories are supported. The README may not exist or the repository may be private.',
            );
            process.exit(1);
          }

          console.log(readme);
        } catch (error) {
          console.error('Failed:', (error as Error).message);
          process.exit(1);
        }
        process.exit(0);
      });
  }

  public async run() {
    this.program.parse(process.argv);
  }
}

export default MCPCliApp;
