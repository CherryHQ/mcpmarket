# @mcpmarket/auto-install

A powerful MCP server with CLI that integrates into your client's MCP ecosystem. It enables you to install and manage other MCP servers through natural language conversations with LLMs. By default, it discovers MCP servers from the `@modelcontextprotocol` scope, but you can customize the sources using the `add-source` command.

## ✨ Features

- **Natural Language Interaction**: Install and manage MCP servers through natural language conversations with LLMs
- **Automatic Server Discovery**: Automatically discovers MCP servers from the `@modelcontextprotocol` scope
- **Custom Source Management**: Add and manage custom MCP server sources
- **Command Configuration**: Save and manage server commands with environment variables
- **Server Documentation**: Access server READMEs directly through the CLI
- **Direct MCP Connection**: Quick connection to MCP services using npx

## 📦 Installation

You can install this package in two ways:

1. **Global Installation**:

   ```bash
   pnpm add -g @mcpmarket/mcp-auto-install
   ```

2. **Direct Execution with npx**:

   ```bash
   # Connect to MCP service
   npx -y @mcpmarket/mcp-auto-install connect

   # Use CLI commands
   npx @mcpmarket/mcp-auto-install [command] [options]
   ```

## 🚀 Usage

### Connecting to MCP Service

```bash
# Quick connection using npx
npx -y @mcpmarket/mcp-auto-install connect
```

### Managing Server Sources

```bash
# Add a new server source
mcp-auto-install add-source my-server -r https://github.com/username/repo -c "npx @modelcontextprotocol/server-name" -d "My MCP Server"

# List registered servers
mcp-auto-install list

# Remove a server
mcp-auto-install remove my-server
```

### Installing Servers

```bash
# Install a server
mcp-auto-install install my-server
```

### Managing Commands

```bash
# Save a command for a server
mcp-auto-install save-command my-server npx @modelcontextprotocol/server-name --port 3000 --env NODE_ENV=production
```

### Viewing Documentation

```bash
# Get server README
mcp-auto-install readme my-server
```

## 🔧 Configuration

The tool uses two configuration files:

1. **MCP Registry** (`mcp-registry.json`): Stores information about registered MCP server sources

   - Windows: `%APPDATA%\mcp\mcp-registry.json`
   - macOS/Linux: `~/.mcp/mcp-registry.json`

2. **External Configuration**: Specified by the `MCP_SETTINGS_PATH` environment variable, used for storing server command configurations

### Environment Variables

- `MCP_SETTINGS_PATH`: Path to the LLM (e.g., Claude) MCP service configuration file
  ```bash
  export MCP_SETTINGS_PATH="/Users/username/Library/Application Support/Claude/claude_desktop_config.json"
  ```

## 📝 Version History

- v0.0.4: Added direct MCP connection support with npx
- v0.0.3: Added support for npx execution and improved command management
- v0.0.2: Added server source management and command configuration
- v0.0.1: Initial release with basic MCP server installation functionality

## 📜 License

[MIT](./LICENSE)

## 🎮 Features

- 🤖 Natural language interaction with LLMs for server installation
- 🔍 Automatic discovery of MCP servers from `@modelcontextprotocol` scope
- 📦 Custom server source management through GitHub repositories
- 📚 Server documentation and README viewing
- ⚙️ Flexible command and environment configuration
- 🔄 Seamless integration with your MCP ecosystem
- 🔌 Quick connection to MCP services with npx

## 📋 Prerequisites

- Node.js >= 18.0.0
- npm or pnpm package manager
- An MCP-compatible client (e.g., Claude)

## 🤝 Contributing

Please see our [Contributing Guide](../../CONTRIBUTING.md) for details about:

- Development workflow
- Creating new packages
- Publishing packages
- Pull request process

## Support

For support, please open an issue in the [GitHub repository](https://github.com/anthropics/mcp-auto-install/issues).
