# MCP Market

[English](README.md) | [中文](README.zh-CN.md)

A collection of MCP (Model Context Protocol) servers for managing and integrating (LLM) various Large Language Model services.

[![NPM Organization](https://img.shields.io/badge/npm-@mcpmarket-blue.svg)](https://www.npmjs.com/org/mcpmarket)
[![pnpm](https://img.shields.io/badge/maintained%20with-pnpm-cc00ff.svg)](https://pnpm.io/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## ✨ Features

- **Rich MCP Servers**: Provides a variety of MCP servers to meet different LLM integration needs.
- **Easy Installation and Configuration**: Easily install and configure servers via the npm package manager.
- **TypeScript Support**: Provides complete TypeScript type definitions to improve development efficiency and code quality.
- **Monorepo Architecture**: Adopts a Monorepo structure for easy code management, maintenance, and version control.
- **Seamless Integration of LLM Services**: Simplifies the integration process with various LLM services.
- **Standardized MCP Protocol**: Provides consistent model context definition and interaction methods.

## 📦 Available Servers

All servers are published under the `@mcpmarket` scope on npm.

| Server Name                                                                          | Description                                                                                                                                                                                                                                                                                                                              | Installation Command               |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| [@mcpmarket/auto-install](https://www.npmjs.com/package/@mcpmarket/mcp-auto-install) | A powerful MCP server with CLI that integrates into your client's MCP ecosystem. It enables you to install and manage other MCP servers through natural language conversations with LLMs. By default, it discovers MCP servers from the `@modelcontextprotocol` scope, but you can customize the sources using the `add-source` command. | `pnpm add @mcpmarket/auto-install` |

```bash
# Install a specific server
pnpm add @mcpmarket/[server-name]
```

## 🚀 Quick Start

1. Choose the server you need from the [Available Servers](#-available-Servers) list.
2. Install using pnpm:

   ```bash
   pnpm add @mcpmarket/[server-name]
   ```

3. Follow the instructions in the server's corresponding README file for configuration and usage.

## 📂 Project Structure

```
packages/             # Collection of MCP servers
├── server-a/         # MCP server A
│   ├── src/          # Source code
│   ├── README.md     # Server documentation
│   └── package.json  # Package configuration file
├── server-b/         # MCP server B
│   ├── src/
│   ├── README.md
│   └── package.json
└── ...               # More servers
```

## 🤝 Contributing

Please see our [Contributing Guide](CONTRIBUTING.md) for details about:

- Development workflow
- Creating new packages
- Publishing packages
- Pull Request process

## 📜 License

[MIT](./LICENSE)
