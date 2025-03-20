# MCP Auto Install

MCP Auto Install is a tool for automatically installing and managing Model Context Protocol (MCP) servers. It can automatically detect, install, and configure various MCP servers, making it easier for developers to use the MCP ecosystem.

## Features

- Automatic detection and installation of MCP servers
- Support for installing servers from npm packages and GitHub repositories
- Automatic retrieval and caching of server README content
- Server configuration assistance
- Custom command configuration support
- Seamless integration with the MCP ecosystem

## Prerequisites

- Node.js >= 18.0.0
- npm or pnpm package manager

## Installation

```bash
npm install -g mcp-auto-install
```

## Usage

### Basic Commands

```bash
# Start the MCP Auto Install server
mcp-auto-install

# Get list of available servers
mcp-auto-install list

# Install a specific server
mcp-auto-install install <server-name>

# Remove a server
mcp-auto-install remove <server-name>

# Configure a server
mcp-auto-install configure <server-name>

# Get server README
mcp-auto-install readme <server-name>

# Save server command to config
mcp-auto-install save-command <server-name> <command>
```

### Configuration

MCP Auto Install uses two configuration files:

1. `mcp_settings.json`: Internal configuration file for storing server registration information
2. External configuration file: Specified by the `MCP_SETTINGS_PATH` environment variable, used for storing server command configurations

### Environment Variables

- `MCP_SETTINGS_PATH`: Path to the external configuration file (e.g., Claude's config file)

Example:
```bash
export MCP_SETTINGS_PATH="/Users/username/Library/Application Support/Claude/claude_desktop_config.json"
```

## Development

### Building

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start in development mode
npm run dev
```

### Testing

```bash
npm test
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Version History

- v1.0.0: Initial Release
  - Basic server management functionality
  - Automatic detection and installation
  - README content management
  - Configuration system
  - CLI interface
  - External config integration

## Support

For support, please open an issue in the [GitHub repository](https://github.com/anthropics/mcp-auto-install/issues). 