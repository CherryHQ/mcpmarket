#!/usr/bin/env node

import { MCPCliApp } from "./cli.js";

/**
 * Main entry point for the MCP Auto Install application
 */
async function main() {
  try {
    const cliApp = new MCPCliApp();
    cliApp.run();
  } catch (error) {
    console.error("Failed to start the application:", error);
    process.exit(1);
  }
}

// Start the application
main();
