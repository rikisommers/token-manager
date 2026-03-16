'use client';

import { Button } from '@/components/ui/button';

export default function AtuiDevTest() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Component Sandbox</h1>
      <p className="mb-6 text-gray-600">
        This page is a dev sandbox for testing shadcn/ui components in Next.js App Router.
        It replaced the previous ATUI Stencil web components spike.
      </p>
      <div className="flex gap-4 flex-wrap">
        <Button variant="outline">Default Button</Button>
        <Button variant="default">Primary Button</Button>
      </div>
    </div>
  );
}
