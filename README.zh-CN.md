# MCP Market (模型上下文协议市场)

[English](README.md) | [中文](README.zh-CN.md)

模型上下文协议（Model Context Protocol，MCP）服务集合，用于管理和集成各种大型语言模型 (LLM) 服务。

[![NPM Organization](https://img.shields.io/badge/npm-@mcpmarket-blue.svg)](https://www.npmjs.com/org/mcpmarket)
[![pnpm](https://img.shields.io/badge/maintained%20with-pnpm-cc00ff.svg)](https://pnpm.io/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## ✨ 特性

- **丰富的 MCP 服务**：提供多种 MCP 服务，满足不同的 LLM 集成需求。
- **易于安装和配置**：通过 npm 包管理器轻松安装和配置服务。
- **TypeScript 支持**：提供完整的 TypeScript 类型定义，提高开发效率和代码质量。
- **Monorepo 架构**：采用 Monorepo 结构，便于代码管理、维护和版本控制。
- **无缝集成 LLM 服务**：简化与各种 LLM 服务的集成流程。
- **标准化的MCP协议**: 提供一致的模型上下文定义和交互方式.

## 📦 可用服务

所有服务均发布在 npm 的 `@mcpmarket` 域下。

| 服务名称                                                                             | 描述                                                                                                                                                                                                                        | 安装命令                           |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| [@mcpmarket/auto-install](https://www.npmjs.com/package/@mcpmarket/mcp-auto-install) | 一个功能强大的MCP服务，带有CLI，可集成到客户端的MCP生态系统中。它使您能够通过与LLM的自然语言对话安装和管理其他MCP服务。默认情况下，它会从@modelcontextprotocol作用域中发现MCP服务，但您可以使用 `add-source` 命令自定义源。 | `pnpm add @mcpmarket/auto-install` |

```bash
# 安装指定的服务
pnpm add @mcpmarket/[server-name]
```

## 🚀 快速开始

1. 从 [可用服务](#-可用服务) 列表中选择您需要的服务。
2. 使用 pnpm 安装：

   ```bash
   pnpm add @mcpmarket/[server-name]
   ```

3. 按照服务对应的 README 文件中的说明进行配置和使用。

## 📂 项目结构

```
packages/             # MCP 服务集合
├── server-a/         # MCP server A
│   ├── src/          # 源代码
│   ├── README.md     # 服务说明文档
│   └── package.json  # 包配置文件
├── server-b/         # MCP server B
│   ├── src/
│   ├── README.md
│   └── package.json
└── ...               # 更多服务
```

## 🤝 贡献

请参阅我们的 [贡献指南](CONTRIBUTING.md) 了解以下详细信息：

- 开发流程
- 创建新包
- 发布包
- Pull Request 流程

## 📜 许可证

[MIT](./LICENSE)
