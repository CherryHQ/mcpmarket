# MCP Market

[English](README.md) | [中文](README.zh-CN.md)

A collection of MCP (Model Context Protocol) servers for managing and integrating with LLM services.

[![NPM Organization](https://img.shields.io/badge/npm-@mcpmarket-blue.svg)](https://www.npmjs.com/org/mcpmarket)
[![pnpm](https://img.shields.io/badge/maintained%20with-pnpm-cc00ff.svg)](https://pnpm.io/)

## 🎮 Features

- Collection of various MCP servers
- Easy installation and configuration
- TypeScript support
- Monorepo structure for better maintainability
- Seamless integration with LLM services

## 📦 Available Servers

All servers are published under the `@mcpmarket` scope on npm.

```bash
# Install a specific server
pnpm add @mcpmarket/server-name
```

## 🚀 Quick Start

1. Choose the server you want to use from the packages
2. Install it using pnpm:
   ```bash
   pnpm add @mcpmarket/server-name
   ```
3. Follow the server-specific setup instructions in its README

## 📂 Project Structure

```
packages/              # MCP servers collection
├── server-a/         # MCP server A
├── server-b/         # MCP server B
└── ...               # More servers
```

## 🤝 Contributing

Please see our [Contributing Guide](CONTRIBUTING.md) for details about:

- Development workflow
- Creating new packages
- Publishing packages
- Pull request process

## 📜 License

ISC
