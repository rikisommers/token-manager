import { NextRequest, NextResponse } from 'next/server';
import { readDbConfig, writeDbConfig } from '@/lib/db-config';
import { type DatabaseConfig } from '@/types/database.types';
import { invalidateRepository } from '@/lib/db/get-repository';
import { requireRole } from '@/lib/auth/require-auth';
import { Action } from '@/lib/auth/permissions';

export async function GET() {
  try {
    const saved = readDbConfig();

    if (saved) {
      return NextResponse.json({ ...sanitiseForClient(saved), source: 'file' });
    }

    const inferred = inferFromEnv();
    return NextResponse.json({ ...sanitiseForClient(inferred), source: inferred.source });
  } catch {
    return NextResponse.json(
      { error: 'Failed to read database configuration' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await requireRole(Action.ManageUsers);
  if (authResult instanceof NextResponse) return authResult;
  try {
    const body = (await request.json()) as DatabaseConfig & { persistFromEnv?: boolean };

    // Special action: persist current env var to config file (credentials stay server-side)
    if (body.persistFromEnv) {
      const envUri = process.env.MONGODB_URI;
      if (!envUri) {
        return NextResponse.json(
          { error: 'No MONGODB_URI environment variable found' },
          { status: 400 },
        );
      }
      const config: DatabaseConfig = {
        provider: envUri.includes('+srv') ? 'mongodb-atlas' : 'custom-mongodb',
        connectionUri: envUri,
      };
      writeDbConfig(config);
      invalidateRepository();
      return NextResponse.json({
        ok: true,
        message: 'Environment configuration persisted to config file.',
        config: sanitiseForClient(config),
        source: 'file',
      });
    }

    if (!body.provider) {
      return NextResponse.json(
        { error: 'provider is required' },
        { status: 400 },
      );
    }

    const SUPPORTED = ['local-mongodb', 'mongodb-atlas', 'custom-mongodb', 'supabase'];
    if (!SUPPORTED.includes(body.provider)) {
      return NextResponse.json(
        { error: `Provider "${body.provider}" is not yet supported.` },
        { status: 400 },
      );
    }

    if (body.provider === 'supabase') {
      if (!body.options?.supabaseUrl || !body.options?.supabaseKey) {
        return NextResponse.json(
          { error: 'Supabase URL and service-role key are required' },
          { status: 400 },
        );
      }
    } else if (body.provider !== 'local-mongodb' && !body.connectionUri?.trim()) {
      return NextResponse.json(
        { error: 'connectionUri is required for remote providers' },
        { status: 400 },
      );
    }

    writeDbConfig(body);
    invalidateRepository();

    return NextResponse.json({
      ok: true,
      message: 'Database configuration saved.',
      config: sanitiseForClient(body),
      source: 'file',
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to save database configuration' },
      { status: 500 },
    );
  }
}

function inferFromEnv(): DatabaseConfig & { source: string } {
  const envUri = process.env.MONGODB_URI;
  if (envUri && !envUri.startsWith('mongodb://localhost')) {
    return {
      provider: envUri.includes('+srv') ? 'mongodb-atlas' : 'custom-mongodb',
      connectionUri: envUri,
      source: 'env',
    };
  }
  return {
    provider: 'local-mongodb',
    connectionUri: 'mongodb://localhost:27017/atui-tokens',
    host: 'localhost',
    port: 27017,
    database: 'atui-tokens',
    source: 'default',
  };
}

function sanitiseForClient(config: DatabaseConfig) {
  const sanitised = {
    ...config,
    connectionUri: config.connectionUri ? maskUri(config.connectionUri) : undefined,
    password: undefined,
  };

  if (sanitised.options?.supabaseKey) {
    sanitised.options = {
      ...sanitised.options,
      supabaseKey: sanitised.options.supabaseKey.slice(0, 12) + '••••••',
    };
  }

  return sanitised;
}

function maskUri(uri: string): string {
  try {
    const parsed = new URL(uri);
    if (parsed.password) {
      parsed.password = '••••••';
    }
    return parsed.toString();
  } catch {
    return uri.replace(/:([^@/]+)@/, ':••••••@');
  }
}
