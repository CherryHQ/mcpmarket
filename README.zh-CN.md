# MCP Market

[English](README.md) | [中文](README.zh-CN.md)

Minecraft 服务器控制面板（MCP）服务集合。

[![NPM Organization](https://img.shields.io/badge/npm-@mcpmarket-blue.svg)](https://www.npmjs.com/org/mcpmarket)
[![pnpm](https://img.shields.io/badge/maintained%20with-pnpm-cc00ff.svg)](https://pnpm.io/)

## 🎮 特性

- 丰富的 MCP 服务器集合
- 简单的安装和配置流程
- TypeScript 支持
- Monorepo 结构，便于维护

## 📦 可用服务

所有服务都发布在 npm 的 `@mcpmarket` 域下。

```bash
# 安装特定服务
pnpm add @mcpmarket/server-name
```

## 🚀 快速开始

1. 从包列表中选择你想使用的服务
2. 使用 pnpm 安装：
   ```bash
   pnpm add @mcpmarket/server-name
   ```
3. 按照服务特定的 README 进行设置

## 📂 项目结构

```
packages/              # MCP 服务集合
├── server-a/         # MCP 服务 A
├── server-b/         # MCP 服务 B
└── ...               # 更多服务
```

## 📦 发布指南

### 前置条件

1. 登录到 npm：

   ```bash
   pnpm login
   ```

2. 确保你有 @mcpmarket 组织的访问权限：
   ```bash
   npm whoami --registry=https://registry.npmjs.org/
   ```

### 发布流程

#### 单包发布

```bash
# 1. 构建特定包
pnpm build --filter @mcpmarket/your-package

# 2. 发布包
pnpm publish:single --filter @mcpmarket/your-package
```

#### 批量发布

```bash
# 1. 创建变更集（记录你的改动）
pnpm changeset
# 按照提示完成以下步骤：
# - 选择要发布的包
# - 选择版本升级类型（patch/minor/major）
# - 写入变更描述

# 2. 提交变更集
git add .
git commit -m "chore: add changeset"

# 3. 更新版本号并生成更新日志
pnpm version

# 4. 构建所有包
pnpm build

# 5. 发布包
pnpm publish:all
```

### 包的要求

每个包都应该包含：

```json
{
  "name": "@mcpmarket/your-package",
  "publishConfig": {
    "access": "public"
  }
}
```

### 取消发布（如果需要）

你可以在发布后 72 小时内取消发布：

```bash
# 取消发布特定版本
npm unpublish @mcpmarket/your-package@0.0.1 --force

# 取消发布整个包
npm unpublish @mcpmarket/your-package --force
```

注意事项：

- 一旦取消发布，相同的版本号不能再次使用
- 包名在 24 小时内不能被重新使用
- 如果其他包依赖此包，则不能取消发布

## 🛠 开发指南

```bash
# 安装依赖
pnpm install

# 构建所有包
pnpm build

# 运行测试
pnpm test

# 清理构建产物
pnpm clean
```

## 📝 贡献指南

请查看我们的[贡献指南](CONTRIBUTING.zh-CN.md)了解以下内容：

- 开发流程
- 创建新包
- 发布包
- Pull Request 流程

## 📜 许可证

ISC

## 🌏 语言

- [English](README.md)
- [中文](README.zh-CN.md)

## 📦 发布流程

1. 单个包发布：

   ```bash
   pnpm publish:single --filter @mcpmarket/your-package
   ```

2. 整体发布：

   ```bash
   # 1. 创建变更集
   pnpm changeset

   # 2. 更新版本
   pnpm version

   # 3. 发布
   pnpm release
   ```

## 🔧 包开发流程

1. 创建新包：

   ```bash
   mkdir -p packages/your-package
   cd packages/your-package
   pnpm init
   ```

2. 包命名规范：

   - 包名必须以 `@mcpmarket/` 开头
   - 建议使用描述性名称，如 `@mcpmarket/vanilla-server`

3. 开发建议：
   - 使用 TypeScript 开发
   - 提供完整的类型定义
   - 编写详细的文档
   - 包含使用示例
