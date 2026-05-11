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
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "<npm>/components/ui/accordion";
import { Badge } from "<npm>/components/ui/badge";
import { Label } from "<npm>/components/ui/label";
import { Textarea } from "<npm>/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from "<npm>/components/ui/select";
import { Checkbox } from "<npm>/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "<npm>/components/ui/radio-group";
import { Switch } from "<npm>/components/ui/switch";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "<npm>/components/ui/tooltip";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "<npm>/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from "<npm>/components/ui/dropdown-menu";
import { toast } from "<npm>/components/ui/toast";
import { Skeleton } from "<npm>/components/ui/skeleton";
import { Progress } from "<npm>/components/ui/progress";
import { StatusDot, type Status } from "<npm>/components/ui/status-dot";
import { Metric } from "<npm>/components/ui/metric";
import { Table, THead, TR, TH, TD } from "<npm>/components/ui/data-table";

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
      <AccordionSection />
      <BadgeSection />
      <LabelTextareaSection />
      <SelectSection />
      <CheckboxRadioSwitchSection />
      <TooltipTabsDropdownSection />
      <ToastSection />
      <SkeletonProgressStatusSection />
      <MetricSection />
      <TableSection />

      {/* Tasks 14–22 complete */}
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

function AccordionSection() {
  return (
    <section>
      <p className="text-label text-fg-subtle mb-3">Accordion</p>
      <Accordion type="single" collapsible className="max-w-2xl">
        <AccordionItem value="a">
          <AccordionTrigger>What does OpsRadar audit?</AccordionTrigger>
          <AccordionContent>
            <p>
              Every workflow you already run — manually or partially automated.
              We map them to ROI categories and surface the highest-leverage
              automations first.
            </p>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="b">
          <AccordionTrigger>How long does the audit take?</AccordionTrigger>
          <AccordionContent>
            <p>About 8 minutes if you know your tools and headcount.</p>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="c">
          <AccordionTrigger>What happens after the audit?</AccordionTrigger>
          <AccordionContent>
            <p>
              You receive a tailored report with a build queue. Top-priority
              automations can be deployed within a week.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
}

function BadgeSection() {
  return (
    <section>
      <p className="text-label text-fg-subtle mb-3">Badge</p>
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap items-center">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="ghost">Ghost</Badge>
          <Badge variant="link">Link</Badge>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Badge variant="success" dot>Running</Badge>
          <Badge variant="warn" dot>Degraded</Badge>
          <Badge variant="destructive" dot>Failed</Badge>
          <Badge variant="accent" dot>New</Badge>
          <Badge variant="secondary" dot>Idle</Badge>
        </div>
      </div>
    </section>
  );
}

function LabelTextareaSection() {
  return (
    <section>
      <p className="text-label text-fg-subtle mb-3">Label + Textarea</p>
      <div className="space-y-3 max-w-sm">
        <div className="space-y-1.5">
          <Label htmlFor="ds-textarea-1">Build request</Label>
          <Textarea
            id="ds-textarea-1"
            placeholder="Describe the workflow you want automated..."
            rows={4}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ds-textarea-2">Disabled</Label>
          <Textarea id="ds-textarea-2" placeholder="Disabled" disabled />
        </div>
      </div>
    </section>
  );
}

function SelectSection() {
  return (
    <section>
      <p className="text-label text-fg-subtle mb-3">Select</p>
      <div className="max-w-sm">
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Pick a workflow tool…" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Automation</SelectLabel>
              <SelectItem value="n8n">n8n</SelectItem>
              <SelectItem value="make">Make</SelectItem>
              <SelectItem value="zapier">Zapier</SelectItem>
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>AI</SelectLabel>
              <SelectItem value="claude">Claude</SelectItem>
              <SelectItem value="gpt">GPT-4o</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </section>
  );
}

function CheckboxRadioSwitchSection() {
  return (
    <section>
      <p className="text-label text-fg-subtle mb-3">Checkbox · Radio · Switch</p>
      <div className="flex gap-12 flex-wrap">
        <div className="space-y-2">
          <Label className="text-caption text-fg-subtle">Checkbox</Label>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox id="ds-cb-1" />
              <Label htmlFor="ds-cb-1">Unchecked</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="ds-cb-2" defaultChecked />
              <Label htmlFor="ds-cb-2">Checked</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="ds-cb-3" disabled />
              <Label htmlFor="ds-cb-3">Disabled</Label>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-caption text-fg-subtle">Radio</Label>
          <RadioGroup defaultValue="b">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="a" id="ds-r-a" />
              <Label htmlFor="ds-r-a">Option A</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="b" id="ds-r-b" />
              <Label htmlFor="ds-r-b">Option B</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="c" id="ds-r-c" />
              <Label htmlFor="ds-r-c">Option C</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label className="text-caption text-fg-subtle">Switch</Label>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Switch id="ds-sw-1" />
              <Label htmlFor="ds-sw-1">Off</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="ds-sw-2" defaultChecked />
              <Label htmlFor="ds-sw-2">On</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="ds-sw-3" disabled />
              <Label htmlFor="ds-sw-3">Disabled</Label>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TooltipTabsDropdownSection() {
  return (
    <section className="space-y-8">
      <div>
        <p className="text-label text-fg-subtle mb-3">Tooltip</p>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Hover me</Button>
          </TooltipTrigger>
          <TooltipContent>Workflow last ran 2 minutes ago</TooltipContent>
        </Tooltip>
      </div>

      <div>
        <p className="text-label text-fg-subtle mb-3">Tabs</p>
        <Tabs defaultValue="overview" className="max-w-2xl">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="runs">Runs</TabsTrigger>
            <TabsTrigger value="errors">Errors</TabsTrigger>
            <TabsTrigger value="config">Config</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <p className="text-body-sm text-fg-muted">Overview content — health, last run, ROI delta.</p>
          </TabsContent>
          <TabsContent value="runs">
            <p className="text-body-sm text-fg-muted">Recent runs — timing, output, status.</p>
          </TabsContent>
          <TabsContent value="errors">
            <p className="text-body-sm text-fg-muted">Errors — last 7 days.</p>
          </TabsContent>
          <TabsContent value="config">
            <p className="text-body-sm text-fg-muted">Config — schedule, env vars, integrations.</p>
          </TabsContent>
        </Tabs>
      </div>

      <div>
        <p className="text-label text-fg-subtle mb-3">DropdownMenu</p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Actions</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Workflow</DropdownMenuLabel>
            <DropdownMenuItem>Edit<DropdownMenuShortcut>⌘E</DropdownMenuShortcut></DropdownMenuItem>
            <DropdownMenuItem>Duplicate<DropdownMenuShortcut>⌘D</DropdownMenuShortcut></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Disable</DropdownMenuItem>
            <DropdownMenuItem className="text-[var(--color-danger)]">Delete<DropdownMenuShortcut>⌫</DropdownMenuShortcut></DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </section>
  );
}

function ToastSection() {
  return (
    <section>
      <p className="text-label text-fg-subtle mb-3">Toast</p>
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" onClick={() => toast("Workflow saved")}>Default</Button>
        <Button variant="outline" onClick={() => toast.success("Workflow saved", { description: "lead-router-v2 deployed to production." })}>Success</Button>
        <Button variant="outline" onClick={() => toast.error("Connection lost", { description: "Could not reach n8n at api.n8n.cloud." })}>Error</Button>
        <Button variant="outline" onClick={() => toast.warning("Approaching rate limit", { description: "9 of 10 OpenAI requests used this minute." })}>Warn</Button>
        <Button variant="outline" onClick={() => toast.info("Audit ready", { description: "Your report is in the inbox." })}>Info</Button>
      </div>
    </section>
  );
}

function SkeletonProgressStatusSection() {
  const statuses: Status[] = ["running", "degraded", "failed", "idle", "info"];
  return (
    <section className="space-y-8">
      <div>
        <p className="text-label text-fg-subtle mb-3">Skeleton</p>
        <div className="space-y-2 max-w-md">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>

      <div>
        <p className="text-label text-fg-subtle mb-3">Progress</p>
        <div className="space-y-3 max-w-md">
          <Progress value={20} />
          <Progress value={66} />
          <Progress value={94} />
        </div>
      </div>

      <div>
        <p className="text-label text-fg-subtle mb-3">StatusDot</p>
        <div className="flex gap-4 flex-wrap">
          {statuses.map((s) => (
            <span key={s} className="inline-flex items-center gap-2 text-body-sm text-fg">
              <StatusDot status={s} /> {s}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function MetricSection() {
  return (
    <section>
      <p className="text-label text-fg-subtle mb-3">Metric</p>
      <div className="grid grid-cols-3 gap-8 max-w-2xl">
        <Metric label="Hours reclaimed / mo" value="2,431" delta={{ value: "+18%", trend: "up" }} />
        <Metric label="Workflows running" value="87" delta={{ value: "+6", trend: "up" }} />
        <Metric label="ROI to date" value="$184,200" />
        <Metric label="Avg run time" value="412ms" delta={{ value: "−14ms", trend: "down" }} />
        <Metric label="Active integrations" value="12" delta={{ value: "0", trend: "flat" }} />
        <Metric label="Failed runs (7d)" value="3" delta={{ value: "+1", trend: "down" }} />
      </div>
    </section>
  );
}

function TableSection() {
  return (
    <section>
      <p className="text-label text-fg-subtle mb-3">Data table</p>
      <Table density="medium" className="max-w-3xl">
        <THead>
          <TR>
            <TH>Workflow</TH>
            <TH>Runs (24h)</TH>
            <TH>Status</TH>
            <TH>Last run</TH>
          </TR>
        </THead>
        <tbody>
          <TR>
            <TD>invoice-reminders</TD>
            <TD>412</TD>
            <TD><Badge variant="success" dot>Running</Badge></TD>
            <TD>2 min ago</TD>
          </TR>
          <TR>
            <TD>lead-router-v2</TD>
            <TD>87</TD>
            <TD><Badge variant="success" dot>Running</Badge></TD>
            <TD>14 min ago</TD>
          </TR>
          <TR>
            <TD>slack-recap-daily</TD>
            <TD>3</TD>
            <TD><Badge variant="warn" dot>Degraded</Badge></TD>
            <TD>1 hr ago</TD>
          </TR>
          <TR>
            <TD>onboarding-emails</TD>
            <TD>54</TD>
            <TD><Badge variant="success" dot>Running</Badge></TD>
            <TD>4 min ago</TD>
          </TR>
        </tbody>
      </Table>
    </section>
  );
}
