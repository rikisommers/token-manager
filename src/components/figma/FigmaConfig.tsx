'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface FigmaConfigState {
  token: string;
  fileUrl: string;
  fileKey: string;
}

interface FigmaConfigProps {
  onConfigChange?: (config: { token: string; fileKey: string } | null) => void;
  className?: string;
  alwaysOpen?: boolean;
}

function extractFileKeyFromUrl(url: string): string {
  const match = url.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
  return match ? match[1] : '';
}

export function FigmaConfig({ onConfigChange, className = '', alwaysOpen = false }: FigmaConfigProps) {
  const [config, setConfig] = useState<FigmaConfigState>({
    token: '',
    fileUrl: '',
    fileKey: '',
  });
  const [isOpen, setIsOpen] = useState(alwaysOpen);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  // Load saved config on mount
  useEffect(() => {
    const saved = localStorage.getItem('figma-config');
    if (saved) {
      const savedConfig: FigmaConfigState = JSON.parse(saved);
      setConfig(savedConfig);
      if (savedConfig.token && savedConfig.fileKey) {
        setIsConnected(true);
        if (onConfigChange) {
          onConfigChange({ token: savedConfig.token, fileKey: savedConfig.fileKey });
        }
      }
    }
  }, [onConfigChange]);

  const handleFileUrlChange = (url: string) => {
    const fileKey = extractFileKeyFromUrl(url);
    setConfig(prev => ({ ...prev, fileUrl: url, fileKey }));
    // Reset test status when URL changes
    setTestStatus('idle');
    setTestMessage('');
  };

  const handleTokenChange = (token: string) => {
    setConfig(prev => ({ ...prev, token }));
    // Reset test status when token changes
    setTestStatus('idle');
    setTestMessage('');
  };

  const handleTestConnection = async () => {
    if (!config.token) {
      setTestStatus('error');
      setTestMessage('Please enter a Personal Access Token first');
      return;
    }

    setLoading(true);
    setTestStatus('idle');
    setTestMessage('');

    try {
      const response = await fetch(
        `/api/figma/test?token=${encodeURIComponent(config.token)}`
      );

      if (response.ok) {
        setTestStatus('ok');
        setTestMessage('Connection successful');
      } else {
        setTestStatus('error');
        setTestMessage('Connection failed — check your token');
      }
    } catch {
      setTestStatus('error');
      setTestMessage('Connection failed — network error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!config.token || !config.fileKey) {
      return;
    }
    if (testStatus !== 'ok') {
      return;
    }

    localStorage.setItem('figma-config', JSON.stringify(config));
    setIsConnected(true);
    setIsOpen(false);

    if (onConfigChange) {
      onConfigChange({ token: config.token, fileKey: config.fileKey });
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset your Figma connection? This will clear all saved settings including your token.')) {
      localStorage.removeItem('figma-config');
      setConfig({ token: '', fileUrl: '', fileKey: '' });
      setIsConnected(false);
      setTestStatus('idle');
      setTestMessage('');
      setIsOpen(false);
      if (onConfigChange) {
        onConfigChange(null);
      }
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    // Reset test status on cancel so unsaved test state doesn't linger
    setTestStatus('idle');
    setTestMessage('');
    // Restore config from storage if user didn't save
    const saved = localStorage.getItem('figma-config');
    if (saved) {
      setConfig(JSON.parse(saved));
    }
  };

  const canSave = config.token.trim() !== '' && config.fileKey !== '' && testStatus === 'ok';

  return (
    <div className={className}>
      {!alwaysOpen && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsOpen(true)}
            className={
              isConnected
                ? 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200'
            }
          >
            {isConnected ? (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="max-w-[120px] truncate">{config.fileKey}</span>
              </span>
            ) : (
              'Configure Figma'
            )}
          </Button>
        </div>
      )}

      {isOpen && (
        alwaysOpen ? (
          /* Inline form — no modal overlay */
          <div>
            {isConnected && (
              <p className="text-sm text-green-600 mb-4">
                Connected to {config.fileKey}
              </p>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Personal Access Token
                </label>
                <Input
                  type="password"
                  value={config.token}
                  onChange={(e) => handleTokenChange(e.target.value)}
                  placeholder="figd_xxxx..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Generate at figma.com &rarr; Account Settings &rarr; Personal access tokens
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Figma File URL
                </label>
                <Input
                  type="text"
                  value={config.fileUrl}
                  onChange={(e) => handleFileUrlChange(e.target.value)}
                  placeholder="https://www.figma.com/design/ABC123/..."
                />
                {config.fileKey && (
                  <p className="text-xs text-gray-500 mt-1">
                    File key: <code className="bg-gray-100 px-1 rounded">{config.fileKey}</code>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={loading || !config.token}
                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                >
                  {loading ? 'Testing...' : 'Test Connection'}
                </Button>

                {testStatus === 'ok' && (
                  <span className="text-sm text-green-600 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span>
                    {testMessage}
                  </span>
                )}
                {testStatus === 'error' && (
                  <span className="text-sm text-red-600">{testMessage}</span>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center mt-6">
              <div>
                {isConnected && (
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200"
                    title="Completely disconnect and clear all Figma settings"
                  >
                    Reset Connection
                  </Button>
                )}
              </div>
              <div className="space-x-2">
                <Button
                  onClick={handleSave}
                  disabled={!canSave}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Modal overlay */
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Figma Configuration</h3>
                  {isConnected && (
                    <p className="text-sm text-green-600 mt-1">
                      Connected to {config.fileKey}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  className="text-gray-500 hover:text-gray-700"
                >
                  x
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Personal Access Token
                  </label>
                  <Input
                    type="password"
                    value={config.token}
                    onChange={(e) => handleTokenChange(e.target.value)}
                    placeholder="figd_xxxx..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Generate at figma.com &rarr; Account Settings &rarr; Personal access tokens
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Figma File URL
                  </label>
                  <Input
                    type="text"
                    value={config.fileUrl}
                    onChange={(e) => handleFileUrlChange(e.target.value)}
                    placeholder="https://www.figma.com/design/ABC123/..."
                  />
                  {config.fileKey && (
                    <p className="text-xs text-gray-500 mt-1">
                      File key: <code className="bg-gray-100 px-1 rounded">{config.fileKey}</code>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={loading || !config.token}
                    className="text-blue-600 border-blue-300 hover:bg-blue-50"
                  >
                    {loading ? 'Testing...' : 'Test Connection'}
                  </Button>

                  {testStatus === 'ok' && (
                    <span className="text-sm text-green-600 flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span>
                      {testMessage}
                    </span>
                  )}
                  {testStatus === 'error' && (
                    <span className="text-sm text-red-600">{testMessage}</span>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center mt-6">
                <div>
                  {isConnected && (
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200"
                      title="Completely disconnect and clear all Figma settings"
                    >
                      Reset Connection
                    </Button>
                  )}
                </div>
                <div className="space-x-2">
                  <Button
                    variant="ghost"
                    onClick={handleCancel}
                    className="text-gray-600 hover:text-gray-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={!canSave}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
