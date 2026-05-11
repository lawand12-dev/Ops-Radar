"use client";

import * as React from "react";

import { Button } from "<npm>/components/ui/button";
import { Input } from "<npm>/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from "<npm>/components/ui/card";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "<npm>/components/ui/dialog";

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
      <InputSection />
      <CardSection />
      <DialogSection />

      {/* Sections will be added by Tasks 12–22 (Badge, Metric, Table, etc.) */}
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

function InputSection() {
  return (
    <section>
      <p className="text-label text-fg-subtle mb-3">Input</p>
      <div className="space-y-3 max-w-sm">
        <Input placeholder="founders@agency.co" />
        <Input placeholder="With aria-invalid state" aria-invalid />
        <Input placeholder="Disabled" disabled />
        <Input type="number" placeholder="Number type, e.g. 2431" />
      </div>
    </section>
  );
}

function CardSection() {
  return (
    <section>
      <p className="text-label text-fg-subtle mb-3">Card</p>
      <div className="grid grid-cols-2 gap-4 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>invoice-reminders</CardTitle>
            <CardDescription>Sends overdue invoice reminders via Gmail.</CardDescription>
            <CardAction>
              <Button size="xs" variant="ghost">…</Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-body-sm text-fg-muted">Last run 2 min ago · 412 runs / 24h</p>
          </CardContent>
          <CardFooter>
            <Button size="sm" variant="outline">Open</Button>
          </CardFooter>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle>Compact card</CardTitle>
            <CardDescription>Size=sm uses 4-unit padding instead of 6.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-body-sm text-fg-muted">Density propagates through subcomponents.</p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function DialogSection() {
  return (
    <section>
      <p className="text-label text-fg-subtle mb-3">Dialog</p>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">Open dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm action</DialogTitle>
            <DialogDescription>
              This is how a modal looks in the new system. Surface, border, shadow, serif title, fade + zoom on open.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
