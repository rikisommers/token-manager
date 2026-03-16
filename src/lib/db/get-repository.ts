import { readDbConfig } from '@/lib/db-config';
import type { ICollectionRepository } from './repository';
import { MongoCollectionRepository } from './mongo-repository';

/**
 * Database repository factory — the single entry point for all database access.
 *
 * All API routes MUST use getRepository() from this file.
 * Do NOT import MongoCollectionRepository or SupabaseCollectionRepository directly.
 *
 * Provider selection: reads from db config (set via Settings UI).
 * Result is cached per-process; restart server after changing provider.
 */

declare global {
  var __repo_cache: { repo: ICollectionRepository | null; provider: string | null };
}

let cache = global.__repo_cache ?? { repo: null, provider: null };
global.__repo_cache = cache;

export async function getRepository(): Promise<ICollectionRepository> {
  const config = readDbConfig();
  const provider = config?.provider ?? 'local-mongodb';

  if (cache.repo && cache.provider === provider) {
    return cache.repo;
  }

  let repo: ICollectionRepository;

  switch (provider) {
    case 'supabase': {
      const { SupabaseCollectionRepository } = await import('./supabase-repository');
      repo = new SupabaseCollectionRepository();
      break;
    }
    default: {
      repo = new MongoCollectionRepository();
      break;
    }
  }

  cache.repo = repo;
  cache.provider = provider;
  return repo;
}

/** Force re-creation of the repository on next call (e.g. after config change). */
export function invalidateRepository(): void {
  cache.repo = null;
  cache.provider = null;
  // Clear cached Supabase client too
  global.__supabase_client = null;
  global.__supabase_ensured = false;
}
