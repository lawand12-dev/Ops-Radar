"use client";

import * as React from "react";

import { Button } from "<npm>/components/ui/button";

export function Showcase() {
  return (
    <main className="min-h-screen bg-bg text-fg p-12 space-y-12">
      <header>
        <p className="text-label text-fg-subtle">Dev only</p>
        <h1 className="text-h1 font-serif">Primitives</h1>
        <p className="text-body-lg text-fg-muted max-w-prose mt-2">
          Visual sandbox for every primitive in both themes. The toggle below
          flips the <code>data-theme</code> attribute on <code>&lt;html&gt;</code> directly,
          letting you see each component in light and dark without changing
          routes. Refreshing the page re-applies the route-based theme.
        </p>
      </header>

      <ThemeToggle />
      <ButtonSection />

      {/* Sections will be added by Tasks 9–22 (Input, Card, Badge, Metric, Table, etc.) */}
    </main>
  );
}

function ThemeToggle() {
  return (
    <div className="flex gap-2 text-body-sm">
      <button
        type="button"
        onClick={() =>
          document.documentElement.setAttribute("data-theme", "light")
        }
        className="px-3 py-1 border border-border rounded"
      >
        Force light
      </button>
      <button
        type="button"
        onClick={() =>
          document.documentElement.setAttribute("data-theme", "dark")
        }
        className="px-3 py-1 border border-border rounded"
      >
        Force dark
      </button>
    </div>
  );
}

function ButtonSection() {
  return (
    <section>
      <p className="text-label text-fg-subtle mb-3">Button</p>
      <div className="space-y-3">
        <div className="flex gap-3 flex-wrap">
          <Button>Default</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="flex gap-3 flex-wrap items-center">
          <Button size="xs">XS</Button>
          <Button size="sm">SM</Button>
          <Button size="default">Default</Button>
          <Button size="lg">LG</Button>
          <Button size="icon" aria-label="Icon"><span>×</span></Button>
        </div>
      </div>
    </section>
  );
}
