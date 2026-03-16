'use client';

import { useState } from 'react';

export function TokenGeneratorDocs() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left"
      >
        <h3 className="text-lg font-medium text-blue-900">
          📖 W3C Design Token Generator Guide
        </h3>
        <span className="text-blue-600">
          {isOpen ? '−' : '+'}
        </span>
      </button>

      {isOpen && (
        <div className="mt-4 space-y-4 text-sm text-blue-800">
          <div>
            <h4 className="font-medium mb-2">🎯 How to Use</h4>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Create token groups (e.g., "colors", "typography", "spacing")</li>
              <li>Fill in the token path using dot notation (e.g., "color.brand.primary")</li>
              <li>Select the appropriate W3C token type</li>
              <li>Enter the value in the correct format for the type</li>
              <li>Add optional description and attributes</li>
              <li>Export as JSON, push to GitHub, or export to Figma</li>
            </ol>
          </div>

          <div>
            <h4 className="font-medium mb-2">📏 Token Types & Value Formats</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <p><strong>color:</strong> #ff0000, rgb(255,0,0), hsl(0,100%,50%)</p>
                <p><strong>dimension:</strong> 16px, 1rem, 8pt</p>
                <p><strong>fontFamily:</strong> ["Arial", "sans-serif"]</p>
                <p><strong>fontWeight:</strong> 400, "normal", "bold"</p>
                <p><strong>duration:</strong> 200ms, 0.2s</p>
                <p><strong>cubicBezier:</strong> [0.25, 0.1, 0.25, 1]</p>
                <p><strong>number:</strong> 1.5, 24, 0.8</p>
              </div>
              <div>
                <p><strong>strokeStyle:</strong> {"{"}"width": "2px", "dashArray": ["5px", "5px"]{"}"}</p>
                <p><strong>border:</strong> {"{"}"width": "1px", "style": "solid", "color": "#000"{"}"}</p>
                <p><strong>shadow:</strong> {"{"}"offsetX": "0px", "offsetY": "4px", "blur": "8px"{"}"}</p>
                <p><strong>gradient:</strong> {"{"}"type": "linear", "stops": [...]{"}"}</p>
                <p><strong>typography:</strong> {"{"}"fontFamily": [...], "fontSize": "16px"{"}"}</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">🔧 Export Options</h4>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>JSON Download:</strong> W3C compliant token file for local use</li>
              <li><strong>GitHub:</strong> Push directly to a repository (requires Personal Access Token)</li>
              <li><strong>Figma:</strong> Export as variables to a Figma file (requires API token)</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2">💡 Tips</h4>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Use semantic paths like "color.semantic.success" for better organization</li>
              <li>Add descriptions for better documentation</li>
              <li>Use attributes for metadata like "category", "deprecated", etc.</li>
              <li>Complex values like objects should be entered as valid JSON</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}