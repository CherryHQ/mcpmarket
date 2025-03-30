/**
 * Check if MCP settings environment variable is set
 */
export function checkMCPSettings(silent = false): boolean {
  // Check if MCP_SETTINGS_PATH is set
  if (!process.env.MCP_SETTINGS_PATH) {
    if (!silent) {
      console.warn('\n⚠️  MCP_SETTINGS_PATH environment variable is not set');
      console.warn(
        '   This variable is needed to save commands and configurations to your LLM client.',
      );
      console.warn('   Set it to point to your LLM config file, for example:');
      console.warn(
        '   export MCP_SETTINGS_PATH="/Users/username/Library/Application Support/Claude/claude_desktop_config.json"\n',
      );
    }
    return false;
  }

  // Optional: Check if MCP_REGISTRY_PATH is set (will use default if not)
  if (process.env.MCP_REGISTRY_PATH && !silent) {
    console.info(`📂 Using custom registry location: ${process.env.MCP_REGISTRY_PATH}`);
  } else if (!silent) {
    console.info('📂 Using default registry location (set MCP_REGISTRY_PATH to customize)');
  }

  if (!silent) {
    console.info(`✅ Using LLM config file: ${process.env.MCP_SETTINGS_PATH}`);
  }

  return true;
}
