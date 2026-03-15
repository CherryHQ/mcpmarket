# @mcpmarket/frihet

AI-native MCP server for business management. 31 tools for invoicing, expenses, clients, products, quotes & tax compliance.

## Features

- **Invoicing**: Create, update, list, and manage invoices with full line-item support
- **Expenses**: Track and categorize business expenses
- **Clients**: Complete client/contact management
- **Products**: Product and service catalog
- **Quotes**: Generate and manage quotes/estimates
- **Tax Compliance**: VeriFactu-ready tax reporting (Spain)
- **Webhooks**: Real-time event notifications
- **Structured Output**: Every tool returns typed, structured data

## Installation

```bash
pnpm add @mcpmarket/frihet
```

Or use directly with npx:

```bash
npx -y @frihet/mcp-server
```

## Configuration

### Claude Desktop / Claude Code

```json
{
  "mcpServers": {
    "frihet": {
      "command": "npx",
      "args": ["-y", "@frihet/mcp-server"],
      "env": {
        "FRIHET_API_KEY": "fri_your_key_here"
      }
    }
  }
}
```

### Remote (no install)

Connect directly to the hosted endpoint -- zero local dependencies:

```
https://mcp.frihet.io/mcp
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FRIHET_API_KEY` | Yes | Your Frihet API key (get one at [app.frihet.io](https://app.frihet.io)) |

## Tools (31)

| Category | Tools |
|----------|-------|
| Invoices | `create_invoice`, `update_invoice`, `list_invoices`, `get_invoice`, `delete_invoice`, `send_invoice` |
| Expenses | `create_expense`, `update_expense`, `list_expenses`, `get_expense`, `delete_expense` |
| Clients | `create_client`, `update_client`, `list_clients`, `get_client`, `delete_client` |
| Products | `create_product`, `update_product`, `list_products`, `get_product`, `delete_product` |
| Quotes | `create_quote`, `update_quote`, `list_quotes`, `get_quote`, `delete_quote`, `send_quote` |
| Settings | `get_settings`, `update_settings` |
| Dashboard | `get_dashboard` |
| Webhooks | `create_webhook`, `delete_webhook` |

## Example

```
You:     "Create an invoice for TechStart SL, 40h consulting at 75 EUR/h, due March 1st"
Claude:  Done. Invoice INV-2026-089 created. Total: 3,000.00 EUR + 21% IVA = 3,630.00 EUR.
```

## Links

- **Source**: [github.com/Frihet-io/frihet-mcp](https://github.com/Frihet-io/frihet-mcp)
- **npm**: [@frihet/mcp-server](https://www.npmjs.com/package/@frihet/mcp-server)
- **Website**: [frihet.io](https://frihet.io)
- **Docs**: [docs.frihet.io](https://docs.frihet.io)

## License

[MIT](./LICENSE)
