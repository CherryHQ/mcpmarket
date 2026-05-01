# @mcpmarket/mcp-auto-install

An MCP server that lets LLMs discover, install, and manage other MCP servers through natural language. Backed by the official [MCP Registry](https://registry.modelcontextprotocol.io), with an npm-scope fallback for offline / outage scenarios.

## What's new in v0.2.0

- **Official MCP Registry** as the primary data source
- **5 focused tools** (`mai_*`) replacing the previous tool surface
- **Multi-client auto-detection**: writes config to Claude Desktop, Cursor, and Windsurf in one call
- **`dryRun` mode** for clients that manage their own config storage (e.g. CherryStudio)
- **Atomic file writes** with `.bak` backups — safe to interrupt
- **Removed git-clone install flow** — pure config writes via `npx` / `uvx` / `docker`
- **Short CLI**: new `mai` binary (the old `mcp-auto-install` name still works)

See [CHANGELOG.md](./CHANGELOG.md) for the full release notes.

## Installation

> **v0.2.x is currently published under the `next` npm tag** while CherryStudio integration is being verified. Pin `@next` (or an explicit version like `@0.2.1`) until v0.2.x is promoted to `latest`. Without `@next`, you'll get the v0.1.x line, which has a completely different tool surface.

The most common usage is to register this package as an MCP server in your LLM client.

### Claude Desktop / Cursor / Windsurf

Add to your client's MCP config:

```json
{
  "mcpServers": {
    "mcp-auto-install": {
      "command": "npx",
      "args": ["-y", "@mcpmarket/mcp-auto-install@next"]
    }
  }
}
```

Restart the client. The 5 `mai_*` tools become available to the LLM.

### Global install (optional, for CLI use)

```bash
pnpm add -g @mcpmarket/mcp-auto-install@next
# both `mai` and `mcp-auto-install` are now on your PATH
```

## Usage as an MCP server

Once registered, ask the LLM in natural language. Example:

> "Find me an MCP server for filesystem access, install the official one for Claude Desktop, and tell me what env vars I need to set."

The LLM will chain `mai_search` → `mai_details` → `mai_install` to complete the task.

### Tool reference

| Tool          | Purpose                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------- |
| `mai_search`  | Search the registry by keyword. Returns name, description, version, supported package types.                        |
| `mai_details` | Structured metadata for a server: env vars, arguments, transport, install command.                                  |
| `mai_readme`  | Fetch the full README from GitHub. Use when you need usage examples or a tool list (`mai_details` is summary-only). |
| `mai_install` | Resolve the best package and write the config to all detected client config files. Supports `dryRun`.               |
| `mai_remove`  | Remove a server from all client config files.                                                                       |

## Usage as a CLI

The same operations are available as CLI commands using the `mai` binary:

```bash
mai search filesystem
mai info io.github.modelcontextprotocol/server-filesystem
mai readme io.github.modelcontextprotocol/server-filesystem
mai install io.github.modelcontextprotocol/server-filesystem --env API_KEY=xxx
mai install io.github.modelcontextprotocol/server-filesystem --dry-run
mai remove io.github.modelcontextprotocol/server-filesystem
mai --help
```

`mai` with no arguments starts the MCP server (same as `mai start`). The legacy `mcp-auto-install` command is preserved as an alias.

## Configuration

### Client config locations

By default, `mai_install` / `mai install` writes to all detected client config files:

| Client         | macOS                                                             | Windows                                           | Linux                                         |
| -------------- | ----------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------- |
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` | `%APPDATA%/Claude/claude_desktop_config.json`     | `~/.config/Claude/claude_desktop_config.json` |
| Cursor         | `~/.cursor/mcp.json`                                              | `%USERPROFILE%/.cursor/mcp.json`                  | `~/.cursor/mcp.json`                          |
| Windsurf       | `~/.codeium/windsurf/mcp_config.json`                             | `%USERPROFILE%/.codeium/windsurf/mcp_config.json` | `~/.codeium/windsurf/mcp_config.json`         |

Set `MCP_SETTINGS_PATH` to override and target a single file.

### Environment variables

| Variable             | Default                    | Description                                                                                     |
| -------------------- | -------------------------- | ----------------------------------------------------------------------------------------------- |
| `MCP_SETTINGS_PATH`  | _(unset)_                  | Override target config file. When set, only this file is written.                               |
| `MCP_REGISTRY_PATH`  | `~/.mcp/mcp-registry.json` | Local cache file for registry data (1-hour TTL).                                                |
| `MCP_PACKAGE_SCOPES` | `@modelcontextprotocol`    | Comma-separated npm scopes used by the npm-scope fallback when the Registry API is unreachable. |

## CherryStudio / custom-config integration

Clients that manage their own MCP config (e.g. SQLite-backed CherryStudio) should call `mai_install` with `dryRun: true`. The tool returns the resolved config payload without touching any files; the client persists it to its own storage.

Request:

```json
{
  "name": "mai_install",
  "arguments": {
    "serverName": "io.github.modelcontextprotocol/server-filesystem",
    "env": { "API_KEY": "xxx" },
    "dryRun": true
  }
}
```

Response `data` field:

```json
{
  "serverName": "io.github.modelcontextprotocol/server-filesystem",
  "config": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem"],
    "env": { "API_KEY": "xxx" }
  },
  "registryType": "npm",
  "transport": { "type": "stdio" },
  "requiredEnvVars": [{ "name": "API_KEY", "description": "...", "isSecret": true }]
}
```

## Prerequisites

- Node.js >= 18.0.0
- An MCP-compatible client (Claude Desktop, Cursor, Windsurf, CherryStudio, ...)

## Contributing

Issues and PRs welcome at [github.com/CherryHQ/mcpmarket](https://github.com/CherryHQ/mcpmarket/issues).

## License

[MIT](./LICENSE)
