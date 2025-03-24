/**
 * Check MCP settings environment variable
 */
export function checkMCPSettings(isMcp?: boolean) {
  if (!process.env.MCP_SETTINGS_PATH) {
    console.warn('\n⚠️  Warning: MCP_SETTINGS_PATH environment variable not set');
    console.warn(
      'This environment variable is used to specify the path to the LLM (e.g., Claude) MCP service configuration file',
    );
    console.warn(
      'To save commands to the LLM configuration file, please set this environment variable, for example:',
    );
    console.warn(
      'export MCP_SETTINGS_PATH="/Users/username/Library/Application Support/Claude/claude_desktop_config.json"\n',
    );
  } else {
    console[isMcp ? 'error' : 'log'](`📁 Using LLM config file: ${process.env.MCP_SETTINGS_PATH}`);
  }
}
