# Contributing to MCP Market

[English](CONTRIBUTING.md) | [中文](CONTRIBUTING.zh-CN.md)

## 🔧 Development Guide

### Project Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/CherryHQ/mcpmarket.git
   cd mcpmarket
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

### Code Style and Formatting

We use ESLint and Prettier for code formatting and linting to maintain consistent code style across the project.

1. Format your code:

   ```bash
   pnpm format
   ```

2. Lint your code:

   ```bash
   pnpm lint
   ```

3. Check and auto-fix issues:
   ```bash
   pnpm lint:check
   ```

Key formatting rules:

- Indent: 2 spaces
- Quote style: single quotes
- Max line length: 100 characters
- Trailing comma: all
- Semicolons: always required

### Creating a New Package

1. Create package directory:

   ```bash
   mkdir -p packages/your-package
   cd packages/your-package
   ```

2. Initialize package:

   ```bash
   pnpm init
   ```

3. Package naming conventions:

   - Must start with `@mcpmarket/`
   - Use descriptive names, e.g., `@mcpmarket/vanilla-server`
   - Keep it simple and clear

4. Required package.json fields:
   ```json
   {
     "name": "@mcpmarket/your-package",
     "version": "0.0.1",
     "publishConfig": {
       "access": "public"
     },
     "files": ["dist"],
     "scripts": {
       "build": "tsc",
       "test": "jest",
       "clean": "rimraf dist"
     }
   }
   ```

### Development Best Practices

1. Use TypeScript

   - Provide complete type definitions
   - Enable strict mode in tsconfig.json
   - Document public APIs

2. Documentation

   - Write clear README.md
   - Include usage examples
   - Document configuration options

3. Testing
   - Write unit tests
   - Include integration tests if needed
   - Test with different Node.js versions

## 📦 Publishing Guide

### Prerequisites

1. Login to npm:

   ```bash
   pnpm login
   ```

2. Verify organization access:
   ```bash
   npm whoami --registry=https://registry.npmjs.org/
   ```

### Publishing Workflows

#### Single Package

```bash
# 1. Build the package
pnpm build --filter @mcpmarket/your-package

# 2. Publish
pnpm publish:single --filter @mcpmarket/your-package
```

#### Batch Publishing

```bash
# 1. Create changeset
pnpm changeset
# Follow prompts:
# - Select packages
# - Choose version type (patch/minor/major)
# - Write change description

# 2. Commit changeset
git add .
git commit -m "chore: add changeset"

# 3. Update versions & generate changelog
pnpm version

# 4. Build all packages
pnpm build

# 5. Publish
pnpm publish:all
```

### Version Management

- patch (0.0.x): Bug fixes
- minor (0.x.0): New features (backward compatible)
- major (x.0.0): Breaking changes

### Unpublishing

Can unpublish within 72 hours:

```bash
# Specific version
npm unpublish @mcpmarket/your-package@0.0.1 --force

# Entire package
npm unpublish @mcpmarket/your-package --force
```

Restrictions:

- Version numbers cannot be reused
- Package name reserved for 24 hours
- Cannot unpublish if other packages depend on it

## 🤝 Pull Request Process

1. Fork the repository
2. Create feature branch
3. Make changes
4. Add changeset:
   ```bash
   pnpm changeset
   ```
5. Commit changes
6. Push to your fork
7. Create Pull Request

### PR Guidelines

1. Keep changes focused
2. Follow existing code style
3. Add tests for new features
4. Update documentation
5. Verify all tests pass
6. Include changeset for version management
