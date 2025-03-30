#!/usr/bin/env node

import { MCPCliApp } from './cli.js';
import { startServer } from './server.js';
import { checkMCPSettings } from './utils/utils.js';

/**
 * Main entry point for the MCP Auto Install application
 */
async function main() {
  // Check if we're in direct server mode (npx -y @mcpmarket/mcp-auto-install connect)
  if (process.argv[2] === 'connect') {
    try {
      checkMCPSettings(true);
      // Check if --json flag is set
      const jsonOnly = process.argv.includes('--json');
      await startServer(jsonOnly);
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
    return;
  }

  // Otherwise, run in CLI mode
  try {
    const cliApp = new MCPCliApp();
    cliApp.run();
  } catch (error) {
    console.error('Failed to start the application:', error);
    process.exit(1);
  }
}

// Start the application
main();
