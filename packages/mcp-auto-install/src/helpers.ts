import type { ArgumentDef, RegistryPackage } from './types.js';

const README_TIMEOUT = 10_000;
const MAX_README_LENGTH = 40_000;

/** Package formats a client can launch as a process. mcpb is a bundle the client installs itself. */
const LAUNCHABLE_REGISTRY_TYPES = new Set(['npm', 'pypi', 'oci', 'nuget', 'cargo']);

/**
 * Pick the best launchable package from a list.
 * Prefers npm + stdio, then any stdio, then the first launchable one.
 */
export function pickBestPackage(packages: RegistryPackage[]): RegistryPackage | undefined {
  const launchable = packages.filter(p => LAUNCHABLE_REGISTRY_TYPES.has(p.registryType));
  return (
    launchable.find(p => p.registryType === 'npm' && p.transport.type === 'stdio') ||
    launchable.find(p => p.transport.type === 'stdio') ||
    launchable[0]
  );
}

/**
 * Resolve the CLI command for a package (e.g. npx, uvx, docker).
 */
export function resolveCommand(pkg: RegistryPackage): string {
  if (pkg.runtimeHint) return pkg.runtimeHint;

  switch (pkg.registryType) {
    case 'npm':
      return 'npx';
    case 'pypi':
      return 'uvx';
    case 'oci':
      return 'docker';
    case 'nuget':
      return 'dnx';
    case 'cargo':
      // `cargo install` puts the binary on PATH under the crate name; there is no runner.
      return pkg.identifier;
    default:
      return 'npx';
  }
}

/**
 * Build the full argument list for running a package.
 * `values` fills package arguments by name and wins over registry defaults.
 */
export function resolveArgs(pkg: RegistryPackage, values: Record<string, string> = {}): string[] {
  const args: string[] = [];

  switch (pkg.registryType) {
    case 'npm':
      args.push('-y', pkg.identifier);
      break;
    case 'pypi':
      args.push(pkg.identifier);
      break;
    case 'oci':
      args.push('run', '-i', '--rm');
      for (const ra of pkg.runtimeArguments ?? []) {
        if (ra.default) args.push(ra.name, ra.default);
      }
      args.push(pkg.identifier);
      break;
    case 'nuget':
      args.push(pkg.version ? `${pkg.identifier}@${pkg.version}` : pkg.identifier);
      break;
    case 'cargo':
      break;
    default:
      args.push(pkg.identifier);
  }

  for (const pa of pkg.packageArguments ?? []) {
    const value = values[pa.name] ?? (pa.isRequired ? pa.default : undefined);
    if (value === undefined) continue;
    if (pa.type === 'positional') args.push(value);
    else args.push(pa.name, value);
  }

  return args;
}

/**
 * Required package arguments that neither `values` nor a registry default can fill.
 */
export function missingPackageArguments(
  pkg: RegistryPackage,
  values: Record<string, string> = {},
): ArgumentDef[] {
  return (pkg.packageArguments ?? []).filter(
    pa => pa.isRequired && values[pa.name] === undefined && pa.default === undefined,
  );
}

/**
 * Build a human-readable install command string; empty when the package cannot be launched.
 */
export function buildInstallCommand(pkg: RegistryPackage): string {
  if (!LAUNCHABLE_REGISTRY_TYPES.has(pkg.registryType)) return '';
  return `${resolveCommand(pkg)} ${resolveArgs(pkg).join(' ')}`;
}

// ---------------------------------------------------------------------------
// README fetching
// ---------------------------------------------------------------------------

/**
 * Parse a GitHub repository URL into owner and repo.
 * Supports trailing slash, .git suffix, query strings, and repo names containing dots.
 */
function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+?)\/([^/?#]+?)(?:\.git)?(?:[/?#]|$)/i);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

/**
 * Build raw.githubusercontent.com URLs for a README file.
 */
function buildReadmeUrls(owner: string, repo: string, subfolder?: string): string[] {
  const base = `https://raw.githubusercontent.com/${owner}/${repo}`;
  const prefix = subfolder ? `/${subfolder}` : '';

  return [
    `${base}/main${prefix}/README.md`,
    `${base}/master${prefix}/README.md`,
    `${base}/main${prefix}/readme.md`,
    `${base}/master${prefix}/readme.md`,
  ];
}

/**
 * Fetch README content from a GitHub repository.
 * Tries main/master branches and README.md/readme.md variants in parallel.
 * Returns null if not found or not a GitHub repo.
 */
export async function fetchReadme(
  repositoryUrl: string,
  subfolder?: string,
): Promise<string | null> {
  const parsed = parseGitHubUrl(repositoryUrl);
  if (!parsed) return null;

  const urls = buildReadmeUrls(parsed.owner, parsed.repo, subfolder);

  const fetchOne = async (url: string): Promise<string> => {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(README_TIMEOUT),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.text();
  };

  let content: string;
  try {
    content = await Promise.any(urls.map(fetchOne));
  } catch {
    return null;
  }

  if (content.length > MAX_README_LENGTH) {
    const original = content.length;
    content =
      content.slice(0, MAX_README_LENGTH) +
      `\n\n...(truncated; original ${original} chars, showing first ${MAX_README_LENGTH})`;
  }

  return content;
}
