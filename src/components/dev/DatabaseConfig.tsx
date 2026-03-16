'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DATABASE_PROVIDERS,
  MONGODB_PROVIDERS,
  type DatabaseConfig as DbConfig,
  type DatabaseProvider,
  type DatabaseProviderInfo,
  type DatabaseConnectionStatus,
} from '@/types/database.types';

const SUPPORTED_PROVIDERS: DatabaseProvider[] = [...MONGODB_PROVIDERS, 'supabase'];

type ConfigSource = 'file' | 'env' | 'default';
type TestState = 'idle' | 'testing' | 'success' | 'error';

interface SaveState {
  status: 'idle' | 'saving' | 'saved' | 'error';
  message?: string;
}

export function DatabaseConfig() {
  const [provider, setProvider] = useState<DatabaseProvider>('local-mongodb');
  const [formValues, setFormValues] = useState<Record<string, string>>({
    host: 'localhost',
    port: '27017',
    database: 'atui-tokens',
    connectionUri: '',
    supabaseUrl: '',
    supabaseKey: '',
  });
  const [configSource, setConfigSource] = useState<ConfigSource>('default');
  const [testState, setTestState] = useState<TestState>('idle');
  const [testResult, setTestResult] = useState<DatabaseConnectionStatus | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({ status: 'idle' });
  const [loaded, setLoaded] = useState(false);
  const [showSchema, setShowSchema] = useState(false);

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/database/config');
      if (!res.ok) return;
      const data = await res.json();
      setProvider(data.provider ?? 'local-mongodb');
      setConfigSource(data.source ?? 'default');
      setFormValues({
        host: data.host ?? 'localhost',
        port: String(data.port ?? 27017),
        database: data.database ?? 'atui-tokens',
        connectionUri: data.connectionUri ?? '',
        supabaseUrl: data.options?.supabaseUrl ?? '',
        supabaseKey: data.options?.supabaseKey ?? '',
      });
    } catch { /* use defaults */ }
    setLoaded(true);
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const selectedProvider = DATABASE_PROVIDERS.find((p) => p.id === provider)!;
  const isSupported = SUPPORTED_PROVIDERS.includes(provider);

  function buildTestPayload(): Record<string, unknown> {
    if (provider === 'supabase') {
      return {
        provider,
        supabaseUrl: formValues.supabaseUrl,
        supabaseKey: formValues.supabaseKey,
      };
    }
    if (provider === 'local-mongodb') {
      const h = formValues.host || 'localhost';
      const p = formValues.port || '27017';
      const db = formValues.database || 'atui-tokens';
      return { provider, connectionUri: `mongodb://${h}:${p}/${db}` };
    }
    return { provider, connectionUri: formValues.connectionUri };
  }

  function buildSavePayload(): DbConfig {
    if (provider === 'supabase') {
      return {
        provider,
        connectionUri: '',
        options: {
          supabaseUrl: formValues.supabaseUrl,
          supabaseKey: formValues.supabaseKey,
        },
      };
    }
    if (provider === 'local-mongodb') {
      const h = formValues.host || 'localhost';
      const p = formValues.port || '27017';
      const db = formValues.database || 'atui-tokens';
      return {
        provider,
        connectionUri: `mongodb://${h}:${p}/${db}`,
        host: h,
        port: Number(p) || 27017,
        database: db,
      };
    }
    return { provider, connectionUri: formValues.connectionUri };
  }

  async function handleTest() {
    setTestState('testing');
    setTestResult(null);

    try {
      const res = await fetch('/api/database/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildTestPayload()),
      });
      const data: DatabaseConnectionStatus = await res.json();
      setTestResult(data);
      setTestState(data.connected ? 'success' : 'error');
    } catch {
      setTestState('error');
      setTestResult({
        connected: false,
        provider,
        host: '',
        database: '',
        latencyMs: 0,
        error: 'Network error — could not reach the server.',
      });
    }
  }

  async function handleSave() {
    setSaveState({ status: 'saving' });

    try {
      const res = await fetch('/api/database/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildSavePayload()),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Save failed');
      }

      setConfigSource('file');
      setSaveState({ status: 'saved', message: 'Configuration saved' });
      setTimeout(() => setSaveState({ status: 'idle' }), 3000);
    } catch (err) {
      setSaveState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Save failed',
      });
    }
  }

  async function handlePersistFromEnv() {
    setSaveState({ status: 'saving' });

    try {
      const res = await fetch('/api/database/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persistFromEnv: true }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to persist');
      }

      setConfigSource('file');
      setSaveState({ status: 'saved', message: 'Configuration persisted' });
      setTimeout(() => setSaveState({ status: 'idle' }), 3000);
    } catch (err) {
      setSaveState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Failed to persist',
      });
    }
  }

  function handleReset() {
    setProvider('local-mongodb');
    setFormValues({
      host: 'localhost',
      port: '27017',
      database: 'atui-tokens',
      connectionUri: '',
      supabaseUrl: '',
      supabaseKey: '',
    });
    setTestState('idle');
    setTestResult(null);
    setSaveState({ status: 'idle' });
    setShowSchema(false);
  }

  function handleFieldChange(key: string, value: string) {
    setFormValues((prev) => ({ ...prev, [key]: value }));
    setTestState('idle');
    setTestResult(null);
  }

  function handleProviderChange(id: DatabaseProvider) {
    setProvider(id);
    setTestState('idle');
    setTestResult(null);
    setShowSchema(false);
  }

  if (!loaded) {
    return <div className="text-sm text-gray-400">Loading database configuration...</div>;
  }

  const isEnvDetected = configSource === 'env';

  return (
    <div className="space-y-6">
      {isEnvDetected && (
        <EnvDetectedBanner
          provider={provider}
          maskedUri={formValues.connectionUri}
          onPersist={handlePersistFromEnv}
          saving={saveState.status === 'saving'}
        />
      )}

      {configSource === 'file' && MONGODB_PROVIDERS.includes(provider) && (
        <ActiveConnectionBanner
          provider={selectedProvider}
          maskedUri={formValues.connectionUri}
        />
      )}

      <ProviderSelector
        providers={DATABASE_PROVIDERS}
        selected={provider}
        onChange={handleProviderChange}
      />

      {isSupported && !isEnvDetected && (
        <ProviderForm
          provider={selectedProvider}
          values={formValues}
          onChange={handleFieldChange}
        />
      )}

      {!isSupported && (
        <UnavailableNotice provider={selectedProvider} />
      )}

      {provider === 'supabase' && (
        <SupabaseSchemaSection
          showSchema={showSchema}
          onToggle={() => setShowSchema((v) => !v)}
        />
      )}

      {isSupported && !isEnvDetected && (
        <>
          <ConnectionTestSection
            testState={testState}
            testResult={testResult}
            onTest={handleTest}
          />

          <div className="flex justify-between items-center pt-2">
            <Button
              variant="outline"
              onClick={handleReset}
              className="text-gray-600 hover:text-gray-800"
            >
              Reset to Default
            </Button>

            <div className="flex items-center gap-3">
              {saveState.status === 'saved' && (
                <span className="text-sm text-green-600">{saveState.message}</span>
              )}
              {saveState.status === 'error' && (
                <span className="text-sm text-red-600">{saveState.message}</span>
              )}
              <Button
                onClick={handleSave}
                disabled={saveState.status === 'saving'}
              >
                {saveState.status === 'saving' ? 'Saving...' : 'Save Configuration'}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ProviderSelector({
  providers,
  selected,
  onChange,
}: {
  providers: DatabaseProviderInfo[];
  selected: DatabaseProvider;
  onChange: (id: DatabaseProvider) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {providers.map((p) => (
        <button
          key={p.id}
          onClick={() => p.available && onChange(p.id)}
          className={`
            relative text-left rounded-lg border p-3 transition-all
            ${selected === p.id
              ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
              : p.available
                ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer'
                : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
            }
          `}
        >
          <div className="flex items-start gap-2">
            <span className="text-lg leading-none mt-0.5">{p.icon}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{p.name}</span>
                {!p.available && (
                  <span className="text-[10px] uppercase font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                    Coming soon
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5 leading-snug">{p.description}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function ProviderForm({
  provider,
  values,
  onChange,
}: {
  provider: DatabaseProviderInfo;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      {provider.fields.map((field) => (
        <div key={field.key}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.required && <span className="text-red-400 ml-0.5">*</span>}
          </label>
          <Input
            type={field.type === 'number' ? 'text' : field.type}
            inputMode={field.type === 'number' ? 'numeric' : undefined}
            value={values[field.key] ?? ''}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder={field.placeholder}
          />
          {field.helpText && (
            <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function ConnectionTestSection({
  testState,
  testResult,
  onTest,
}: {
  testState: TestState;
  testResult: DatabaseConnectionStatus | null;
  onTest: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={onTest}
          disabled={testState === 'testing'}
          className="text-blue-600 border-blue-300 hover:bg-blue-50"
        >
          {testState === 'testing' ? 'Testing...' : 'Test Connection'}
        </Button>

        {testState === 'success' && (
          <span className="text-sm text-green-600 flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full inline-block" />
            Connected
          </span>
        )}
        {testState === 'error' && (
          <span className="text-sm text-red-600">Connection failed</span>
        )}
      </div>

      {testResult && testResult.connected && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-green-800 font-medium">Connected successfully</span>
            <span className="text-green-600">{testResult.latencyMs}ms</span>
          </div>
          <p className="text-green-700 text-xs">
            Host: {testResult.host} &middot; Database: {testResult.database}
          </p>
        </div>
      )}

      {testResult && !testResult.connected && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm">
          <p className="text-red-800 font-medium">Connection failed</p>
          <p className="text-red-600 text-xs mt-1">{testResult.error}</p>
        </div>
      )}
    </div>
  );
}

const SUPABASE_SQL = `-- Run this in your Supabase SQL Editor (one-time setup)
CREATE TABLE IF NOT EXISTS token_collections (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  tokens        JSONB NOT NULL DEFAULT '{}',
  source_metadata JSONB DEFAULT NULL,
  user_id       TEXT DEFAULT NULL,
  description   TEXT DEFAULT NULL,
  tags          TEXT[] DEFAULT '{}',
  figma_token   TEXT DEFAULT NULL,
  figma_file_id TEXT DEFAULT NULL,
  github_repo   TEXT DEFAULT NULL,
  github_branch TEXT DEFAULT NULL,
  graph_state   JSONB DEFAULT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tc_name ON token_collections (name);
CREATE INDEX IF NOT EXISTS idx_tc_updated_at ON token_collections (updated_at DESC);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON token_collections;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON token_collections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();`;

function SupabaseSchemaSection({
  showSchema,
  onToggle,
}: {
  showSchema: boolean;
  onToggle: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(SUPABASE_SQL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-md p-4 space-y-3">
      <div>
        <p className="text-sm font-medium text-blue-900">Table setup required</p>
        <p className="text-xs text-blue-700 mt-1">
          Before saving, run the SQL below in your Supabase project&apos;s
          <strong> SQL Editor</strong> to create the required table.
        </p>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onToggle}
        className="text-blue-700 border-blue-300 hover:bg-blue-100 text-xs"
      >
        {showSchema ? 'Hide SQL' : 'Show Setup SQL'}
      </Button>

      {showSchema && (
        <div className="relative">
          <pre className="bg-gray-900 text-green-300 text-xs rounded-md p-4 overflow-x-auto max-h-72 overflow-y-auto leading-relaxed">
            {SUPABASE_SQL}
          </pre>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="absolute top-2 right-2 text-xs bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700 hover:text-white"
          >
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
      )}
    </div>
  );
}

function EnvDetectedBanner({
  provider,
  maskedUri,
  onPersist,
  saving,
}: {
  provider: DatabaseProvider;
  maskedUri: string;
  onPersist: () => void;
  saving: boolean;
}) {
  const providerInfo = DATABASE_PROVIDERS.find((p) => p.id === provider);
  const label = providerInfo?.name ?? provider;

  return (
    <div className="bg-green-50 border border-green-200 rounded-md p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            <p className="text-sm font-medium text-green-900">
              Active: {label}
            </p>
          </div>
          <p className="text-xs text-green-700 mt-1">
            Detected from <code className="bg-green-100 px-1 rounded text-[11px]">MONGODB_URI</code> environment variable
          </p>
          {maskedUri && (
            <p className="text-xs text-green-600 mt-1 font-mono break-all">
              {maskedUri}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onPersist}
          disabled={saving}
          className="text-green-700 border-green-300 hover:bg-green-100 text-xs flex-shrink-0"
        >
          {saving ? 'Saving...' : 'Save to Config'}
        </Button>
      </div>
      <p className="text-xs text-green-600">
        Click &quot;Save to Config&quot; to persist this connection, or select a different provider below.
      </p>
    </div>
  );
}

function ActiveConnectionBanner({
  provider,
  maskedUri,
}: {
  provider: DatabaseProviderInfo;
  maskedUri: string;
}) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-md p-3">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 bg-green-500 rounded-full" />
        <p className="text-sm font-medium text-green-900">
          Active: {provider.name}
        </p>
      </div>
      {maskedUri && (
        <p className="text-xs text-green-600 mt-1 font-mono break-all">
          {maskedUri}
        </p>
      )}
    </div>
  );
}

function UnavailableNotice({ provider }: { provider: DatabaseProviderInfo }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
      <p className="text-sm font-medium text-amber-900">
        {provider.name} support is coming soon
      </p>
      <p className="text-xs text-amber-700 mt-1">
        Adding support for {provider.name} requires a database adapter.
        MongoDB-compatible providers (Atlas, DigitalOcean, AWS DocumentDB) and
        Supabase work today.
      </p>
    </div>
  );
}
