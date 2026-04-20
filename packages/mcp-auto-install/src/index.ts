#!/usr/bin/env node

import { MCPCliApp } from './cli.js';
import { startServer } from './server.js';

async function main() {
  // Direct server mode: npx @mcpmarket/mcp-auto-install connect
  if (process.argv[2] === 'connect') {
    try {
      await startServer();
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
    return;
  }

  // CLI mode
  try {
    const cli = new MCPCliApp();
    await cli.run();
  } catch (error) {
    console.error('Failed to start:', error);
    process.exit(1);
  }
}

main();
