# @mcpmarket/auto-install

[English](README.md) | [中文](README.zh-CN.md)

A powerful tool for automatically installing and managing Model Context Protocol (MCP) servers. It streamlines the process of detecting, installing, and configuring various MCP servers, making it easier for developers to use the MCP ecosystem.

## 🎮 Features

- 🔍 Automatic detection and installation of MCP servers
- 📦 Support for installing servers from npm packages and GitHub repositories
- 📚 Automatic retrieval and caching of server README content
- ⚙️ Server configuration assistance
- ⌨️ Custom command configuration support
- 🔄 Seamless integration with the MCP ecosystem

## 📋 Prerequisites

- Node.js >= 18.0.0
- npm or pnpm package manager

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
mcp-auto-install

# Get list of available servers
mcp-auto-install list

# Remove a server from registry
mcp-auto-install remove <server-name>

# Configure a server
mcp-auto-install configure <server-name>

# Get server README
mcp-auto-install readme <server-name>

# Save server command configuration
mcp-auto-install save-command <server-name> <command> [args...] [--env KEY=VALUE]
```

### ⚙️ Configuration

MCP Auto Install uses two configuration files:

1. `mcp_settings.json`: Internal configuration file for storing server registration information
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

### 📦 Server Registration

The tool automatically registers MCP servers from the `@modelcontextprotocol` scope on npm. Each server registration includes:

- Server name and description
- Repository information
- README content
- Command configuration
- Keywords for server type identification

## 📝 Version History

- v1.0.0: Initial Release
  - Basic server management functionality
  - Automatic detection and installation
  - README content management
  - Configuration system
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
