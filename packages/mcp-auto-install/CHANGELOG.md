# Changelog

## 0.2.0 — 2026-04-20

Major rewrite. Switches from a custom npm-scope discovery model to the official MCP Registry, redesigns the tool surface for LLM-driven workflows, and ships fixes for several silent-failure / data-loss issues in the previous version.

### Breaking changes

- **Tool names renamed**: `mcp_auto_install_*` → `mai_*`. Migration:
  - `mcp_auto_install_search_packages` → `mai_search`
  - `mcp_auto_install_get_server_readme` → `mai_readme`
  - `mcp_auto_install_install_server` → `mai_install`
  - `mcp_auto_install_remove_server` → `mai_remove`
- **Tool surface reduced to 5**: `mai_search`, `mai_details`, `mai_readme`, `mai_install`, `mai_remove`. Removed: `getAvailableServers`, `registerServer`, `parseConfig`, `configureServer`, `saveCommand`.
- **Installation model changed**: no more `git clone` + `npm install`. Servers are now installed by writing the correct `npx` / `uvx` / `docker` command to client config files, derived from Registry metadata.
- **Local registry semantics**: `mcp-registry.json` is now a **cache** of Registry API results, not a list of installed servers. Tracking installed servers is the host client's responsibility.
- **CLI commands renamed**: `add-source`, `parse-config`, `readme`, `configure-server`, `save-command` removed. New commands: `search`, `info`, `install`, `remove`.

### Added

- Integration with the official MCP Registry (`https://registry.modelcontextprotocol.io/v0/`) as the primary data source, with 1-hour TTL memory + disk cache.
- `mai_readme` tool: fetches README from `raw.githubusercontent.com` so LLMs can read tools list, usage examples, and configuration guides that aren't in Registry metadata. Tries `main`/`master` × `README.md`/`readme.md` in parallel.
- `mai_install --dry-run` (and `dryRun: true` MCP arg): returns the resolved config without writing to any files. Designed for clients like CherryStudio that store MCP configs in their own database (e.g. SQLite).
- Multi-client config auto-detection for Claude Desktop, Cursor, and Windsurf.
- npm-scope fallback (`@modelcontextprotocol/*` by default, configurable via `MCP_PACKAGE_SCOPES`) when the Registry API is unreachable. Fallback results are cached so subsequent `mai_install` / `mai_details` / `mai_readme` calls work offline too.
- Atomic file writes with `.bak` backups for all client config modifications.

### Fixed

- Refuses to overwrite malformed client config files (previously: silent corruption + lost user data).
- Distinguishes 404 from network errors when looking up servers (previously: all errors reported as "not found").
- Backup failures only swallow `ENOENT`; permission/disk errors are now surfaced.
- npm-fallback now respects the `limit` parameter.
- Version number now read from `package.json` at runtime; no more hardcoded version mismatches between files.

### Security

- Removed `git clone` execution path, eliminating command injection risk from repository URLs.
- All config writes go through atomic temp-file + rename, with `.bak` created before modification.

### Dependencies

- `@modelcontextprotocol/sdk`: `^1.8.0` → `^1.29.0`
- `zod`: `^3.22.4` → `^3.25.0`
- `npx-scope-finder`: `^1.3.0` → `^2.0.2`
- `commander`: `^11.1.0` (unchanged)

### Environment variables

- `MCP_SETTINGS_PATH` (existing): path to a single config file; takes priority over auto-detection.
- `MCP_REGISTRY_PATH` (new): path to the Registry cache file. Defaults to `~/.mcp/mcp-registry.json`.
- `MCP_PACKAGE_SCOPES` (new): comma-separated npm scopes for the fallback search. Defaults to `@modelcontextprotocol`.

## 0.1.6 and earlier

See git history.
