import path from 'node:path';
import os from 'node:os';

import type { RegistryServerEntry, RegistryListResult, RegistryCache } from './types.js';
import { readJsonFile, atomicWriteJson } from './utils/file.js';

const REGISTRY_BASE = 'https://registry.modelcontextprotocol.io/v0';
const DEFAULT_TIMEOUT = 10_000;
const MAX_RETRIES = 2;

/** Cache TTL: 1 hour in milliseconds. */
const CACHE_TTL = 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

function getCachePath(): string {
  return process.env.MCP_REGISTRY_PATH || path.join(os.homedir(), '.mcp', 'mcp-registry.json');
}

let memoryCache: RegistryCache | null = null;

async function loadCache(): Promise<RegistryCache> {
  if (memoryCache) return memoryCache;
  memoryCache = (await readJsonFile<RegistryCache>(getCachePath())) || { servers: {} };
  return memoryCache;
}

async function saveCache(): Promise<void> {
  if (memoryCache) {
    await atomicWriteJson(getCachePath(), memoryCache);
  }
}

function isCacheValid(cachedAt: string): boolean {
  return Date.now() - new Date(cachedAt).getTime() < CACHE_TTL;
}

/**
 * Get a server from cache if fresh.
 */
async function getFromCache(name: string): Promise<RegistryServerEntry | null> {
  const cache = await loadCache();
  const cached = cache.servers[name];
  if (cached && isCacheValid(cached.cachedAt)) {
    return cached.entry;
  }
  return null;
}

/**
 * Store a server entry in cache.
 */
async function putInCache(name: string, entry: RegistryServerEntry): Promise<void> {
  const cache = await loadCache();
  cache.servers[name] = { entry, cachedAt: new Date().toISOString() };
  await saveCache();
}

/**
 * Store multiple server entries in cache.
 * Exported so npm-fallback search results can be cached too.
 */
export async function putManyInCache(entries: RegistryServerEntry[]): Promise<void> {
  const cache = await loadCache();
  const now = new Date().toISOString();
  for (const entry of entries) {
    cache.servers[entry.server.name] = { entry, cachedAt: now };
  }
  cache.lastUpdated = now;
  await saveCache();
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<Response> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Registry API returned ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError!;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Search for MCP servers in the official registry.
 * Results are cached for future getServer() lookups.
 */
export async function searchServers(query: string, limit = 20): Promise<RegistryListResult> {
  const params = new URLSearchParams({
    search: query,
    limit: String(Math.min(limit, 100)),
    version: 'latest',
  });

  const response = await fetchWithRetry(`${REGISTRY_BASE}/servers?${params}`);
  const result = (await response.json()) as RegistryListResult;

  // Cache search results
  if (result.servers.length > 0) {
    await putManyInCache(result.servers);
  }

  return result;
}

/**
 * Get a specific server by name. Checks cache first, then fetches from registry.
 * Returns null if not found.
 */
export async function getServer(
  name: string,
  version = 'latest',
): Promise<RegistryServerEntry | null> {
  // Check cache first
  if (version === 'latest') {
    const cached = await getFromCache(name);
    if (cached) return cached;
  }

  try {
    const encodedName = encodeURIComponent(name);
    const response = await fetchWithRetry(
      `${REGISTRY_BASE}/servers/${encodedName}/versions/${version}`,
    );
    const entry = (await response.json()) as RegistryServerEntry;

    // Cache the result
    await putInCache(name, entry);

    return entry;
  } catch (error) {
    // 404 means server genuinely not found — return null
    if (error instanceof Error && error.message.includes('404')) {
      return null;
    }
    // Network errors, timeouts, 5xx — re-throw so callers can handle
    throw error;
  }
}

/**
 * List servers with pagination support.
 * Results are cached for future getServer() lookups.
 */
export async function listServers(
  options: {
    limit?: number;
    cursor?: string;
    updatedSince?: string;
  } = {},
): Promise<RegistryListResult> {
  const params = new URLSearchParams({
    limit: String(Math.min(options.limit || 30, 100)),
    version: 'latest',
  });

  if (options.cursor) {
    params.set('cursor', options.cursor);
  }

  if (options.updatedSince) {
    params.set('updated_since', options.updatedSince);
  }

  const response = await fetchWithRetry(`${REGISTRY_BASE}/servers?${params}`);
  const result = (await response.json()) as RegistryListResult;

  // Cache results
  if (result.servers.length > 0) {
    await putManyInCache(result.servers);
  }

  return result;
}
