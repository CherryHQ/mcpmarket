# @mcpmarket/auto-install

A powerful MCP server with CLI that integrates into your client's MCP ecosystem. It enables you to install and manage other MCP servers through natural language conversations with LLMs. By default, it discovers MCP servers from the `@modelcontextprotocol` scope, but you can customize the sources using the `add-source` command.

## ✨ Features

- **Natural Language Interaction**: Install and manage MCP servers through natural language conversations with LLMs
- **Automatic Server Discovery**: Automatically discovers MCP servers from the `@modelcontextprotocol` scope
- **Custom Source Management**: Add and manage custom MCP server sources
- **Command Configuration**: Save and manage server commands with environment variables
- **Server Documentation**: Access server READMEs directly through the CLI
- **Direct MCP Connection**: Quick connection to MCP services using npx
- **JSON Configuration Support**: Parse and validate JSON configurations for bulk server setup
- **JSON Output Format**: Support for machine-readable JSON output with `--json` flag
- **Custom Registry Location**: Customize registry location via environment variable
- **Service Descriptions**: Add descriptive metadata to MCP services

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

### Starting the Server

```bash
# Start the MCP Auto Install server
mcp-auto-install start

# Start with JSON output
mcp-auto-install start --json
```

### Connecting to MCP Service

```bash
# Quick connection using npx
npx -y @mcpmarket/mcp-auto-install connect

# With JSON output (for programmatic use)
npx -y @mcpmarket/mcp-auto-install connect --json
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

# Save command with description
mcp-auto-install save-command my-server npx @modelcontextprotocol/server-name --port 3000 --description "A server that handles file operations"

# Save command with JSON output
mcp-auto-install save-command my-server npx @modelcontextprotocol/server-name --port 3000 --json
```

### Viewing Documentation

```bash
# Get server README
mcp-auto-install readme my-server

# Get server configuration help
mcp-auto-install configure-server my-server
```

### Bulk Configuration

```bash
# Parse and save JSON configuration
mcp-auto-install parse-config '{
  "mcpServers": {
    "my-server": {
      "command": "npx @modelcontextprotocol/server-name",
      "args": ["--port", "3000"],
      "description": "A server that handles file operations"
    }
  }
}'

# Parse configuration with JSON output
mcp-auto-install parse-config '{"mcpServers":{...}}' --json
```

## 🔧 Configuration

The tool uses two configuration files:

1. **MCP Registry** (`mcp-registry.json`): Stores information about registered MCP server sources

   - Default locations:
     - Windows: `%APPDATA%\mcp\mcp-registry.json`
     - macOS/Linux: `~/.mcp/mcp-registry.json`
   - Can be customized with the `MCP_REGISTRY_PATH` environment variable

2. **External Configuration**: Specified by the `MCP_SETTINGS_PATH` environment variable, used for storing server command configurations

### Environment Variables

- `MCP_SETTINGS_PATH`: Path to the LLM (e.g., Claude) MCP service configuration file

  ```bash
  export MCP_SETTINGS_PATH="/Users/username/Library/Application Support/Claude/claude_desktop_config.json"
  ```

- `MCP_REGISTRY_PATH`: Custom path to the MCP registry file (default: `~/.mcp/mcp-registry.json`)
  ```bash
  export MCP_REGISTRY_PATH="/path/to/custom/mcp-registry.json"
  ```

### MCP_PACKAGE_SCOPES

Specify one or more package scopes to search for MCP servers. Multiple scopes can be specified using comma separation.

Default value: `@modelcontextprotocol`

Examples:

```bash
# Single scope
MCP_PACKAGE_SCOPES=@modelcontextprotocol

# Multiple scopes
MCP_PACKAGE_SCOPES=@modelcontextprotocol,@other-scope

# Multiple scopes with spaces
MCP_PACKAGE_SCOPES=@modelcontextprotocol, @other-scope
```

## 📝 Version History

- v0.1.6: Added support for multiple package scopes via `MCP_PACKAGE_SCOPES` environment variable
- v0.1.5: Fixed dependencies in package.json
- v0.1.1: Added JSON configuration support and improved command management
- v0.1.0: Added support for custom server sources and command configuration
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
- 📋 JSON-based bulk configuration support
- 🧩 Machine-readable JSON output format for automation
- 📝 Descriptive metadata for MCP services

## 📋 Prerequisites

- Node.js >= 18.0.0
- npm or pnpm package manager
- An MCP-compatible client (e.g., Claude)

## 🤝 Contributing

- Development workflow
- Creating new packages
- Publishing packages
- Pull request process

## Support

For support, please open an issue in the [GitHub repository](https://github.com/CherryHQ/mcpmarket/issues).
