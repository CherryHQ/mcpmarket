import {
  missingPackageArguments,
  pickBestPackage,
  resolveArgs,
  resolveCommand,
} from './helpers.js';
import type { ArgumentDef, RegistryServer, RegistryTransport } from './types.js';

export interface InstallInputs {
  env?: Record<string, string>;
  arguments?: Record<string, string>;
}

/** An env var or header the caller still has to supply, with every hint the registry offers. */
export interface InputRequirement {
  name: string;
  description: string;
  isSecret: boolean;
  default?: string;
  format?: string;
  choices?: string[];
}

export type InstallPlan =
  | {
      kind: 'package';
      registryType: string;
      transport: RegistryTransport;
      config: { command: string; args: string[]; env?: Record<string, string> };
      requiredEnvVars: InputRequirement[];
      requiredArguments: ArgumentDef[];
    }
  | {
      kind: 'remote';
      transport: { type: string };
      config: { type: string; url: string; headers?: Record<string, string> };
      requiredHeaders: InputRequirement[];
    }
  | { kind: 'unsupported'; reason: string };

type HintedDef = {
  name: string;
  description: string;
  isSecret?: boolean;
  default?: string;
  format?: string;
  choices?: string[];
};

function toRequirement(def: HintedDef): InputRequirement {
  return {
    name: def.name,
    description: def.description,
    isSecret: def.isSecret ?? false,
    ...(def.default !== undefined && { default: def.default }),
    ...(def.format !== undefined && { format: def.format }),
    ...(def.choices !== undefined && { choices: def.choices }),
  };
}

/**
 * Turn a registry entry plus caller-supplied inputs into a launch config and the inputs still
 * missing. Pure: the same function serves the MCP tool, the CLI and any client's dry run.
 */
export function buildInstallPlan(server: RegistryServer, inputs: InstallInputs = {}): InstallPlan {
  const env = inputs.env ?? {};
  const values = inputs.arguments ?? {};
  const packages = server.packages ?? [];

  const pkg = pickBestPackage(packages);
  if (pkg) {
    return {
      kind: 'package',
      registryType: pkg.registryType,
      transport: pkg.transport,
      config: {
        command: resolveCommand(pkg),
        args: resolveArgs(pkg, values),
        ...(Object.keys(env).length > 0 && { env }),
      },
      requiredEnvVars: (pkg.environmentVariables ?? [])
        .filter(ev => ev.isRequired && env[ev.name] === undefined)
        .map(toRequirement),
      requiredArguments: missingPackageArguments(pkg, values),
    };
  }

  const remote = server.remotes?.[0];
  if (remote) {
    const headers: Record<string, string> = {};
    for (const h of remote.headers ?? []) {
      if (h.value !== undefined) headers[h.name] = h.value;
    }
    return {
      kind: 'remote',
      transport: { type: remote.type },
      config: {
        type: remote.type,
        url: remote.url,
        ...(Object.keys(headers).length > 0 && { headers }),
      },
      requiredHeaders: (remote.headers ?? [])
        .filter(h => h.isRequired && h.value === undefined)
        .map(toRequirement),
    };
  }

  if (packages.length > 0) {
    const types = [...new Set(packages.map(p => p.registryType))].join(', ');
    return {
      kind: 'unsupported',
      reason: `Only ships ${types} packages, which cannot be launched as a process (an mcpb bundle is installed by a client that supports it).`,
    };
  }

  return {
    kind: 'unsupported',
    reason: 'No package or remote connection is published for this server.',
  };
}
