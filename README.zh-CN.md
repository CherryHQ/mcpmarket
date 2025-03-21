# MCP Market

[English](README.md) | [中文](README.zh-CN.md)

模型上下文协议（Model Context Protocol，MCP）服务集合，用于管理和集成 LLM 服务。

[![NPM Organization](https://img.shields.io/badge/npm-@mcpmarket-blue.svg)](https://www.npmjs.com/org/mcpmarket)
[![pnpm](https://img.shields.io/badge/maintained%20with-pnpm-cc00ff.svg)](https://pnpm.io/)

## 🎮 特性

- 丰富的 MCP 服务器集合
- 简单的安装和配置流程
- TypeScript 支持
- Monorepo 结构，便于维护
- 与 LLM 服务的无缝集成

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

## 🤝 贡献指南

请查看我们的[贡献指南](CONTRIBUTING.zh-CN.md)了解以下内容：

- 开发流程
- 创建新包
- 发布包
- Pull Request 流程

## 📜 许可证

ISC
