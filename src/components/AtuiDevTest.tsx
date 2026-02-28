'use client';

import React, { useEffect } from 'react';
// CSS imported via relative path to bypass the package's restrictive `exports` field
import '../../node_modules/@alliedtelesis-labs-nz/atui-components-stencil/dist/atui-components-stencil/atui-components-stencil.css';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'at-button': React.HTMLAttributes<HTMLElement> & {
        variant?: string;
        disabled?: boolean;
        size?: string;
      };
    }
  }
}

export default function AtuiDevTest() {
  useEffect(() => {
    import('@alliedtelesis-labs-nz/atui-components-stencil/loader').then(({ defineCustomElements }) => {
      defineCustomElements(window);
    });
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">ATUI Dev Test Sandbox</h1>
      <p className="mb-6 text-gray-600">
        This page is a spike to confirm ATUI Stencil web components work in Next.js 13.5.6 App Router.
        It is intentionally kept in the codebase as a component sandbox for Phase 1 reference.
      </p>
      <div className="flex gap-4 flex-wrap">
        <at-button>Default Button</at-button>
        <at-button variant="primary">Primary Button</at-button>
      </div>
    </div>
  );
}
