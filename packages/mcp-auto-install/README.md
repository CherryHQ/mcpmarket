# @mcpmarket/auto-install

A powerful MCP server with CLI that integrates into your client's MCP ecosystem. It enables you to install and manage other MCP servers through natural language conversations with LLMs. By default, it discovers MCP servers from the `@modelcontextprotocol` scope, but you can customize the sources using the `add-source` command.

## 🎮 Features

- 🤖 Natural language interaction with LLMs for server installation
- 🔍 Automatic discovery of MCP servers from `@modelcontextprotocol` scope
- 📦 Custom server source management through GitHub repositories
- 📚 Server documentation and README viewing
- ⚙️ Flexible command and environment configuration
- 🔄 Seamless integration with your MCP ecosystem

## 📋 Prerequisites

- Node.js >= 18.0.0
- npm or pnpm package manager
- An MCP-compatible client (e.g., Claude)

## 🚀 Installation

```bash
# Using pnpm (recommended)
pnpm add @mcpmarket/auto-install

# Using npm
npm install @mcpmarket/auto-install
```

## 💡 Usage

### Basic Commands

```bash
# Start the MCP Auto Install server
mcp-auto-install start

# List all registered MCP server sources
mcp-auto-install list

# Add or update a server source in the registry
mcp-auto-install add-source <name> -r <github-url> -c <command> -d <description> [-k <keywords>] [-i <install-commands>]

# Install a server from GitHub
mcp-auto-install install <name>

# Get server README
mcp-auto-install readme <name>

# Remove a server from registry
mcp-auto-install remove <name>

# Save server command configuration
mcp-auto-install save-command <server-name> <command> [args...] [--env KEY=VALUE]
```

### ⚙️ Configuration

MCP Auto Install uses two configuration files:

1. `mcp_settings.json`: Internal configuration file for storing server source information
2. External configuration file: Specified by the `MCP_SETTINGS_PATH` environment variable, used for storing server command configurations

### 🔧 Environment Variables

- `MCP_SETTINGS_PATH`: Path to the external configuration file (e.g., Claude's config file)

Example:

```bash
export MCP_SETTINGS_PATH="/Users/username/Library/Application Support/Claude/claude_desktop_config.json"
```

### 📝 Command Configuration Format

When saving command configurations, you can specify:

- Command name (e.g., 'npx', 'node', 'npm', 'yarn', 'pnpm', 'cmd', 'powershell', 'bash', 'sh', 'zsh', 'fish', 'tcsh', 'csh')
- Command arguments (e.g., '@modelcontextprotocol/server-name', '--port', '3000', '--config', 'config.json')
- Environment variables (e.g., --env NODE_ENV=production --env DEBUG=true)

Example:

```bash
# Command: npx
# Arguments: @modelcontextprotocol/server-name --port 3000
# Environment: NODE_ENV=production
mcp-auto-install save-command my-server npx @modelcontextprotocol/server-name --port 3000 --env NODE_ENV=production
```

### 🔄 JSON Configuration

You can also provide server configurations in JSON format:

```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-name", "--port", "3000", "--config", "config.json"],
      "env": {
        "NODE_ENV": "production",
        "DEBUG": "true"
      }
    }
  }
}
```

### 📦 Server Source Registration

Each server source registration includes:

- Server name and description
- GitHub repository URL
- Command to run the server
- Optional keywords for server type identification
- Optional custom installation commands

## 📝 Version History

- v0.0.3: Current Version
  - Automatic server discovery
  - Server source management
  - GitHub-based installation
  - README content viewing
  - Command configuration system
  - CLI interface
  - External config integration

## 🤝 Contributing

Please see our [Contributing Guide](../../CONTRIBUTING.md) for details about:

- Development workflow
- Creating new packages
- Publishing packages
- Pull request process

## 📜 License

ISC

## Support

For support, please open an issue in the [GitHub repository](https://github.com/anthropics/mcp-auto-install/issues).
