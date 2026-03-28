import { NextRequest, NextResponse } from 'next/server';
import mongoose, { Connection } from 'mongoose';
import type { DatabaseConnectionStatus, DatabaseProvider } from '@/types/database.types';
import { requireRole } from '@/lib/auth/require-auth';
import { Action } from '@/lib/auth/permissions';

export async function POST(request: NextRequest) {
  const authResult = await requireRole(Action.ManageUsers);
  if (authResult instanceof NextResponse) return authResult;
  const body = await request.json();
  const provider: DatabaseProvider = body.provider ?? 'custom-mongodb';

  if (provider === 'supabase') {
    return testSupabase(body);
  }

  return testMongo(body);
}

async function testMongo(body: { connectionUri?: string; provider?: DatabaseProvider }) {
  let testConnection: Connection | null = null;

  try {
    const uri = body.connectionUri;
    if (!uri?.trim()) {
      return NextResponse.json({ error: 'connectionUri is required' }, { status: 400 });
    }

    const start = Date.now();

    testConnection = await mongoose.createConnection(uri, {
      serverSelectionTimeoutMS: 6000,
      connectTimeoutMS: 6000,
      bufferCommands: false,
    }).asPromise();

    const latencyMs = Date.now() - start;
    const host = testConnection.host ?? 'unknown';
    const port = testConnection.port ?? 0;
    const database = testConnection.db?.databaseName ?? 'unknown';

    const result: DatabaseConnectionStatus = {
      connected: true,
      provider: body.provider ?? 'custom-mongodb',
      host: `${host}:${port}`,
      database,
      latencyMs,
    };

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown connection error';
    return NextResponse.json(
      {
        connected: false,
        provider: body.provider ?? 'custom-mongodb',
        host: '',
        database: '',
        latencyMs: 0,
        error: friendlyMongoError(message),
      } satisfies DatabaseConnectionStatus,
      { status: 422 },
    );
  } finally {
    if (testConnection) {
      try { await testConnection.close(); } catch { /* swallow */ }
    }
  }
}

async function testSupabase(body: { supabaseUrl?: string; supabaseKey?: string }) {
  const { supabaseUrl, supabaseKey } = body;

  if (!supabaseUrl?.trim() || !supabaseKey?.trim()) {
    return NextResponse.json(
      { error: 'supabaseUrl and supabaseKey are required' },
      { status: 400 },
    );
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const start = Date.now();
    const sb = createClient(supabaseUrl, supabaseKey);

    // Probe the connection by querying the schema - works even if the table doesn't exist yet
    const { error } = await sb.from('token_collections').select('id').limit(1);

    const latencyMs = Date.now() - start;

    // "relation does not exist" means we connected fine but the table isn't created yet — that's OK
    const tableNotFound = error?.message?.includes('does not exist') ||
                          error?.code === '42P01';

    if (error && !tableNotFound) {
      throw new Error(error.message);
    }

    const host = new URL(supabaseUrl).hostname;

    const result: DatabaseConnectionStatus = {
      connected: true,
      provider: 'supabase',
      host,
      database: tableNotFound ? '(table not yet created)' : 'token_collections',
      latencyMs,
    };

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      {
        connected: false,
        provider: 'supabase',
        host: '',
        database: '',
        latencyMs: 0,
        error: friendlySupabaseError(message),
      } satisfies DatabaseConnectionStatus,
      { status: 422 },
    );
  }
}

function friendlyMongoError(raw: string): string {
  if (raw.includes('ECONNREFUSED')) return 'Connection refused — is MongoDB running at the specified host?';
  if (raw.includes('ENOTFOUND') || raw.includes('getaddrinfo')) return 'Host not found — check the hostname in your connection string.';
  if (raw.includes('Authentication failed') || raw.includes('auth')) return 'Authentication failed — check your username and password.';
  if (raw.includes('ETIMEOUT') || raw.includes('timed out')) return 'Connection timed out — the server may be unreachable or behind a firewall.';
  if (raw.includes('SSL') || raw.includes('TLS')) return 'SSL/TLS error — check your SSL settings or certificate.';
  return raw;
}

function friendlySupabaseError(raw: string): string {
  if (raw.includes('Invalid API key') || raw.includes('apikey')) return 'Invalid API key — check your Supabase service-role key.';
  if (raw.includes('ENOTFOUND') || raw.includes('getaddrinfo')) return 'Project not found — check your Supabase project URL.';
  if (raw.includes('FetchError') || raw.includes('fetch')) return 'Could not reach Supabase — check your project URL and network.';
  return raw;
}
