import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { expect } from 'chai';

import { createServer } from '../src/server.js';
import type { RegistryServerEntry } from '../src/types.js';

const SERVER_NAME = 'io.github.acme/widget';

const fixture: RegistryServerEntry = {
  server: {
    name: SERVER_NAME,
    description: 'Widget',
    version: '1.0.0',
    packages: [
      {
        registryType: 'npm',
        identifier: '@acme/widget',
        transport: { type: 'stdio' },
        environmentVariables: [
          { name: 'WORKSPACE_ROOT', description: 'Root dir', isRequired: true, format: 'filepath' },
        ],
        packageArguments: [
          { type: 'named', name: '--port', description: 'Port', isRequired: true },
        ],
      },
    ],
  },
  _meta: {
    'io.modelcontextprotocol.registry/official': {
      status: 'active',
      publishedAt: '',
      updatedAt: '',
      isLatest: true,
    },
  },
};

describe('mcp-auto-install server', () => {
  let tmp: string;
  let client: Client;
  let tools: Tool[];

  before(async () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mai-test-'));
    process.env.MCP_REGISTRY_PATH = path.join(tmp, 'registry.json');
    process.env.MCP_SETTINGS_PATH = path.join(tmp, 'settings.json');
    fs.writeFileSync(
      process.env.MCP_REGISTRY_PATH,
      JSON.stringify({
        servers: { [SERVER_NAME]: { entry: fixture, cachedAt: new Date().toISOString() } },
      }),
    );

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await createServer().connect(serverTransport);
    client = new Client({ name: 'test', version: '0' });
    await client.connect(clientTransport);
    tools = (await client.listTools()).tools;
  });

  after(async () => {
    await client.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  const tool = (name: string) => tools.find(t => t.name === name)!;

  it('marks discovery tools read-only and config-writing tools destructive', () => {
    for (const name of ['mai_search', 'mai_details', 'mai_readme']) {
      expect(tool(name).annotations, name).to.include({ readOnlyHint: true });
    }
    for (const name of ['mai_install', 'mai_remove']) {
      expect(tool(name).annotations, name).to.include({ destructiveHint: true });
    }
  });

  it('gives every tool a human-readable title', () => {
    for (const t of tools) {
      expect(t.title, t.name).to.be.a('string').and.not.equal('');
    }
  });

  it('declares an output schema for mai_install so clients can consume the plan without parsing text', () => {
    expect(tool('mai_install').outputSchema).to.have.property('type', 'object');
    expect(tool('mai_install').outputSchema)
      .to.have.nested.property('properties.kind.enum')
      .that.includes('package');
  });

  it('returns the install plan as structured content on a dry run, honouring the arguments input', async () => {
    const result = await client.callTool({
      name: 'mai_install',
      arguments: { serverName: SERVER_NAME, dryRun: true, arguments: { '--port': '8080' } },
    });

    expect(result.isError).to.not.equal(true);
    expect(result.structuredContent).to.deep.equal({
      kind: 'package',
      serverName: SERVER_NAME,
      registryType: 'npm',
      transport: { type: 'stdio' },
      config: { command: 'npx', args: ['-y', '@acme/widget', '--port', '8080'] },
      requiredEnvVars: [
        { name: 'WORKSPACE_ROOT', description: 'Root dir', isSecret: false, format: 'filepath' },
      ],
      requiredArguments: [],
    });
    expect(fs.existsSync(process.env.MCP_SETTINGS_PATH!), 'dry run must not write').to.equal(false);
  });
});
