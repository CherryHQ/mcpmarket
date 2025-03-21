# MCP Market 贡献指南

[English](CONTRIBUTING.md) | [中文](CONTRIBUTING.zh-CN.md)

## 🔧 开发指南

### 项目设置

1. 克隆仓库：

   ```bash
   git clone https://github.com/CherryHQ/mcpmarket.git
   cd mcpmarket
   ```

2. 安装依赖：
   ```bash
   pnpm install
   ```

### 代码风格和格式化

我们使用 ESLint 和 Prettier 进行代码格式化和规范检查，以保持项目中的代码风格一致性。

1. 格式化代码：

   ```bash
   pnpm format
   ```

2. 代码检查：

   ```bash
   pnpm lint
   ```

3. 检查并自动修复问题：
   ```bash
   pnpm lint:check
   ```

主要格式化规则：

- 缩进：2个空格
- 引号风格：单引号
- 最大行长：100个字符
- 尾随逗号：all
- 分号：必须添加

### 创建新包

1. 创建包目录：

   ```bash
   mkdir -p packages/your-package
   cd packages/your-package
   ```

2. 初始化包：

   ```bash
   pnpm init
   ```

3. 包命名规范：

   - 必须以 `@mcpmarket/` 开头
   - 使用描述性名称，如 `@mcpmarket/vanilla-server`
   - 保持简单明了

4. package.json 必需字段：
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

### 开发最佳实践

1. 使用 TypeScript

   - 提供完整的类型定义
   - 在 tsconfig.json 中启用严格模式
   - 为公共 API 编写文档

2. 文档

   - 编写清晰的 README.md
   - 包含使用示例
   - 记录配置选项

3. [ ] 测试
   - 编写单元测试
   - 必要时包含集成测试
   - 在不同 Node.js 版本下测试

## 📦 发布指南

### 前置条件

1. 登录 npm：

   ```bash
   pnpm login
   ```

2. 验证组织访问权限：
   ```bash
   npm whoami --registry=https://registry.npmjs.org/
   ```

### 发布流程

#### 单包发布

```bash
# 1. 构建包
pnpm build --filter @mcpmarket/your-package

# 2. 发布
pnpm publish:single --filter @mcpmarket/your-package
```

#### 批量发布

```bash
# 1. 创建变更集
pnpm changeset
# 按照提示：
# - 选择包
# - 选择版本类型（patch/minor/major）
# - 写入变更描述

# 2. 提交变更集
git add .
git commit -m "chore: add changeset"

# 3. 更新版本号和生成更新日志
pnpm version

# 4. 构建所有包
pnpm build

# 5. 发布
pnpm publish:all
```

### 版本管理

- patch (0.0.x): 错误修复
- minor (0.x.0): 新功能（向后兼容）
- major (x.0.0): 破坏性更改

### 取消发布

可以在发布后 72 小时内取消发布：

```bash
# 特定版本
npm unpublish @mcpmarket/your-package@0.0.1 --force

# 整个包
npm unpublish @mcpmarket/your-package --force
```

限制：

- 版本号不能重复使用
- 包名在 24 小时内被保留
- 如果其他包依赖此包则不能取消发布

## 🤝 Pull Request 流程

1. Fork 仓库
2. 创建特性分支
3. 进行修改
4. 添加变更集：
   ```bash
   pnpm changeset
   ```
5. 提交更改
6. 推送到你的 fork
7. 创建 Pull Request

### PR 指南

1. 保持更改聚焦
2. 遵循现有代码风格
3. 为新功能添加测试
4. 更新文档
5. 验证所有测试通过
6. 包含版本管理的变更集
