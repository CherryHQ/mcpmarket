import { expect } from 'chai';

import {
  missingPackageArguments,
  pickBestPackage,
  resolveArgs,
  resolveCommand,
} from '../src/helpers.js';
import type { RegistryPackage } from '../src/types.js';

const stdio = { type: 'stdio' };
const npm: RegistryPackage = { registryType: 'npm', identifier: '@scope/server', transport: stdio };
const cargo: RegistryPackage = {
  registryType: 'cargo',
  identifier: 'widget-mcp',
  transport: stdio,
};
const nuget: RegistryPackage = {
  registryType: 'nuget',
  identifier: 'Knapcode.SampleMcpServer',
  version: '0.5.0',
  runtimeHint: 'dnx',
  transport: stdio,
};
const mcpb: RegistryPackage = {
  registryType: 'mcpb',
  identifier: 'https://example.com/text-editor.mcpb',
  transport: stdio,
};

describe('pickBestPackage', () => {
  it('skips mcpb bundles, which no CLI can launch', () => {
    expect(pickBestPackage([mcpb, npm])).to.equal(npm);
    expect(pickBestPackage([mcpb])).to.equal(undefined);
  });
});

describe('resolveCommand', () => {
  it('runs npm packages through npx', () => {
    expect(resolveCommand(npm)).to.equal('npx');
  });

  it('runs a cargo crate as the binary `cargo install` put on PATH', () => {
    expect(resolveCommand(cargo)).to.equal('widget-mcp');
  });

  it('honours runtimeHint over the registry-type default', () => {
    expect(resolveCommand(nuget)).to.equal('dnx');
  });
});

describe('resolveArgs', () => {
  it('passes nothing to a cargo binary', () => {
    expect(resolveArgs(cargo)).to.deep.equal([]);
  });

  it('pins a nuget package to its version for dnx', () => {
    expect(resolveArgs(nuget)).to.deep.equal(['Knapcode.SampleMcpServer@0.5.0']);
  });

  it('fills required package arguments from the caller before falling back to defaults', () => {
    const pkg: RegistryPackage = {
      ...npm,
      packageArguments: [
        { type: 'positional', name: 'root', description: '', isRequired: true, default: '/tmp' },
        { type: 'named', name: '--port', description: '', isRequired: true },
      ],
    };
    expect(resolveArgs(pkg, { root: '/data', '--port': '8080' })).to.deep.equal([
      '-y',
      '@scope/server',
      '/data',
      '--port',
      '8080',
    ]);
    expect(resolveArgs(pkg, {})).to.deep.equal(['-y', '@scope/server', '/tmp']);
  });
});

describe('missingPackageArguments', () => {
  it('reports required arguments that have neither a caller value nor a default', () => {
    const pkg: RegistryPackage = {
      ...npm,
      packageArguments: [
        { type: 'positional', name: 'root', description: 'Workspace root', isRequired: true },
        { type: 'named', name: '--port', description: 'Port', isRequired: true, default: '80' },
        { type: 'named', name: '--verbose', description: 'Verbose', isRequired: false },
      ],
    };
    expect(missingPackageArguments(pkg, {})).to.deep.equal([
      { type: 'positional', name: 'root', description: 'Workspace root', isRequired: true },
    ]);
    expect(missingPackageArguments(pkg, { root: '/data' })).to.deep.equal([]);
  });
});
