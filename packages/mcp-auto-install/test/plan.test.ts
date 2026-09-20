import { expect } from 'chai';

import { buildInstallPlan } from '../src/plan.js';
import type { RegistryServer } from '../src/types.js';

const base = { name: 'io.github.acme/widget', description: 'Widget', version: '1.0.0' };

describe('buildInstallPlan', () => {
  it('turns a launchable package into a command and keeps every env hint the registry gave', () => {
    const server: RegistryServer = {
      ...base,
      packages: [
        {
          registryType: 'npm',
          identifier: '@acme/widget',
          transport: { type: 'stdio' },
          environmentVariables: [
            {
              name: 'WORKSPACE_ROOT',
              description: 'Root dir',
              isRequired: true,
              format: 'filepath',
            },
            {
              name: 'MODE',
              description: 'Mode',
              isRequired: true,
              default: 'fast',
              choices: ['fast', 'safe'],
            },
            { name: 'API_KEY', description: 'Key', isRequired: true, isSecret: true },
            { name: 'DEBUG', description: 'Debug', isRequired: false },
          ],
        },
      ],
    };

    const plan = buildInstallPlan(server, { env: { API_KEY: 'k' } });

    expect(plan).to.deep.equal({
      kind: 'package',
      registryType: 'npm',
      transport: { type: 'stdio' },
      config: { command: 'npx', args: ['-y', '@acme/widget'], env: { API_KEY: 'k' } },
      requiredEnvVars: [
        { name: 'WORKSPACE_ROOT', description: 'Root dir', isSecret: false, format: 'filepath' },
        {
          name: 'MODE',
          description: 'Mode',
          isSecret: false,
          default: 'fast',
          choices: ['fast', 'safe'],
        },
      ],
      requiredArguments: [],
    });
  });

  it('reports required package arguments the caller did not fill', () => {
    const server: RegistryServer = {
      ...base,
      packages: [
        {
          registryType: 'npm',
          identifier: '@acme/widget',
          transport: { type: 'stdio' },
          packageArguments: [
            { type: 'positional', name: 'root', description: 'Workspace root', isRequired: true },
          ],
        },
      ],
    };

    const plan = buildInstallPlan(server);

    expect(plan).to.include({ kind: 'package' });
    expect(plan).to.have.nested.property('config.args').that.deep.equals(['-y', '@acme/widget']);
    expect(plan)
      .to.have.property('requiredArguments')
      .that.deep.equals([
        { type: 'positional', name: 'root', description: 'Workspace root', isRequired: true },
      ]);
  });

  it('resolves a remote-only server to a url config, applying constant headers and reporting the rest', () => {
    const server: RegistryServer = {
      ...base,
      remotes: [
        {
          type: 'streamable-http',
          url: 'https://mcp.acme.dev/mcp',
          headers: [
            { name: 'X-App', description: 'App id', value: 'widget' },
            {
              name: 'Authorization',
              description: 'Bearer token',
              isRequired: true,
              isSecret: true,
            },
          ],
        },
      ],
    };

    expect(buildInstallPlan(server)).to.deep.equal({
      kind: 'remote',
      transport: { type: 'streamable-http' },
      config: {
        type: 'streamable-http',
        url: 'https://mcp.acme.dev/mcp',
        headers: { 'X-App': 'widget' },
      },
      requiredHeaders: [{ name: 'Authorization', description: 'Bearer token', isSecret: true }],
    });
  });

  it('explains a server that only ships mcpb instead of inventing a command', () => {
    const server: RegistryServer = {
      ...base,
      packages: [
        {
          registryType: 'mcpb',
          identifier: 'https://example.com/widget.mcpb',
          transport: { type: 'stdio' },
        },
      ],
    };

    const plan = buildInstallPlan(server);

    expect(plan).to.include({ kind: 'unsupported' });
    expect(plan).to.have.property('reason').that.matches(/mcpb/);
  });

  it('explains a server with neither packages nor remotes', () => {
    const plan = buildInstallPlan({ ...base });

    expect(plan).to.include({ kind: 'unsupported' });
    expect(plan)
      .to.have.property('reason')
      .that.matches(/no package or remote/i);
  });
});
