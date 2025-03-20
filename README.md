# MCP Market

[English](README.md) | [中文](README.zh-CN.md)

A collection of MCP (Minecraft Control Panel) servers for managing Minecraft servers.

[![NPM Organization](https://img.shields.io/badge/npm-@mcpmarket-blue.svg)](https://www.npmjs.com/org/mcpmarket)
[![pnpm](https://img.shields.io/badge/maintained%20with-pnpm-cc00ff.svg)](https://pnpm.io/)

## 🎮 Features

- Collection of various MCP servers
- Easy installation and configuration
- TypeScript support
- Monorepo structure for better maintainability

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

## 📦 Publishing Guide

### Prerequisites

1. Login to npm:

   ```bash
   pnpm login
   ```

2. Ensure you have access to the @mcpmarket organization
   ```bash
   npm whoami --registry=https://registry.npmjs.org/
   ```

### Publishing Process

#### Single Package Publishing

```bash
# 1. Build the specific package
pnpm build --filter @mcpmarket/your-package

# 2. Publish the package
pnpm publish:single --filter @mcpmarket/your-package
```

#### Batch Publishing

```bash
# 1. Create a changeset (document your changes)
pnpm changeset
# Follow the prompts to:
# - Select packages to publish
# - Choose version bump type (patch/minor/major)
# - Write change descriptions

# 2. Commit the changeset
git add .
git commit -m "chore: add changeset"

# 3. Update versions and generate changelog
pnpm version

# 4. Build all packages
pnpm build

# 5. Publish packages
pnpm publish:all
```

### Package Requirements

Each package should have:

```json
{
  "name": "@mcpmarket/your-package",
  "publishConfig": {
    "access": "public"
  }
}
```

### Unpublishing (if needed)

You can unpublish a package within 72 hours of publishing:

```bash
# Unpublish specific version
npm unpublish @mcpmarket/your-package@0.0.1 --force

# Unpublish entire package
npm unpublish @mcpmarket/your-package --force
```

Note: Once unpublished:

- The same version number cannot be reused
- The package name is reserved for 24 hours
- Cannot unpublish if other packages depend on it

## 🛠 Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Clean build artifacts
pnpm clean
```

## 📝 Contributing

Please see our [Contributing Guide](CONTRIBUTING.md) for details about:

- Development workflow
- Creating new packages
- Publishing packages
- Pull request process

## 📜 License

ISC
