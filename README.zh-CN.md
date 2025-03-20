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

1. Fork 本仓库
2. 创建特性分支
3. 进行修改
4. 创建变更集：
   ```bash
   pnpm changeset
   ```
5. 提交修改
6. 推送到你的分支
7. 创建 Pull Request

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