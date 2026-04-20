/**
 * MCP Auto Install — Type Definitions
 */

// ============================================================================
// Registry API Types (https://registry.modelcontextprotocol.io/v0/)
// ============================================================================

/**
 * Top-level entry returned by the Registry API for each server.
 */
export interface RegistryServerEntry {
  server: RegistryServer;
  _meta: {
    'io.modelcontextprotocol.registry/official': RegistryMeta;
  };
}

/**
 * Server metadata from the official MCP Registry.
 */
export interface RegistryServer {
  name: string;
  description: string;
  title?: string;
  version: string;
  repository?: { url: string; source: string; subfolder?: string };
  websiteUrl?: string;
  packages?: RegistryPackage[];
  remotes?: RegistryRemote[];
}

/**
 * Package installation descriptor within a registry server entry.
 */
export interface RegistryPackage {
  registryType: string;
  identifier: string;
  version?: string;
  runtimeHint?: string;
  registryBaseUrl?: string;
  transport: RegistryTransport;
  environmentVariables?: EnvVarDef[];
  packageArguments?: ArgumentDef[];
  runtimeArguments?: ArgumentDef[];
}

/**
 * Transport configuration for a package.
 */
export interface RegistryTransport {
  type: string;
  url?: string;
  headers?: RegistryHeader[];
}

/**
 * Header definition for remote transports.
 */
export interface RegistryHeader {
  name: string;
  description: string;
  value?: string;
  isRequired?: boolean;
  isSecret?: boolean;
}

/**
 * Remote connection option for a server.
 */
export interface RegistryRemote {
  type: string;
  url: string;
  headers?: RegistryHeader[];
  variables?: Record<string, { description: string; format?: string; default?: string }>;
}

/**
 * Environment variable definition from the registry.
 */
export interface EnvVarDef {
  name: string;
  description: string;
  isRequired?: boolean;
  isSecret?: boolean;
  default?: string;
  format?: string;
}

/**
 * Argument definition (package or runtime) from the registry.
 */
export interface ArgumentDef {
  name: string;
  description: string;
  type: string;
  isRequired?: boolean;
  default?: string;
  format?: string;
  valueHint?: string;
  isRepeated?: boolean;
}

/**
 * Registry entry lifecycle metadata.
 */
export interface RegistryMeta {
  status: string;
  statusChangedAt?: string;
  publishedAt: string;
  updatedAt: string;
  isLatest: boolean;
}

/**
 * Paginated response from the Registry list/search endpoints.
 */
export interface RegistryListResult {
  servers: RegistryServerEntry[];
  metadata: {
    nextCursor?: string;
    count: number;
  };
}

// ============================================================================
// Local Cache Types
// ============================================================================

/**
 * Cached registry data stored in mcp-registry.json.
 */
export interface RegistryCache {
  /** Cached server entries keyed by server name. */
  servers: Record<string, RegistryCacheEntry>;
  /** Last full refresh timestamp (ISO string). */
  lastUpdated?: string;
}

/**
 * A single cached server entry with TTL tracking.
 */
export interface RegistryCacheEntry {
  entry: RegistryServerEntry;
  cachedAt: string;
}

// ============================================================================
// Operation Types
// ============================================================================

/**
 * Standard operation result returned by service functions.
 */
export interface OperationResult {
  success: boolean;
  message: string[];
  data?: unknown;
}
