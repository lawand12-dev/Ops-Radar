'use client';

import { useState } from 'react';

const TABS = ['Claude Desktop', 'cURL', 'ChatGPT'] as const;
type Tab = (typeof TABS)[number];

export function McpTokenView({ token, mcpUrl }: { token: string; mcpUrl: string }) {
  const [tab, setTab] = useState<Tab>('Claude Desktop');
  const [revealed, setRevealed] = useState(false);

  const display = revealed ? token : maskToken(token);

  const snippets: Record<Tab, string> = {
    'Claude Desktop': JSON.stringify(
      {
        mcpServers: {
          opsradar: {
            transport: 'http',
            url: mcpUrl,
            headers: { Authorization: `Bearer ${token}` },
          },
        },
      },
      null,
      2,
    ),
    cURL: [
      `# List tools`,
      `curl -X POST ${mcpUrl} \\`,
      `  -H 'Content-Type: application/json' \\`,
      `  -H 'Authorization: Bearer ${token}' \\`,
      `  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`,
      ``,
      `# Call a tool`,
      `curl -X POST ${mcpUrl} \\`,
      `  -H 'Content-Type: application/json' \\`,
      `  -H 'Authorization: Bearer ${token}' \\`,
      `  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"opsradar.search_kb","arguments":{"query":"paid media margin benchmark"}}}'`,
    ].join('\n'),
    ChatGPT: `mcp_server:\n  name: opsradar\n  url: ${mcpUrl}\n  auth:\n    type: bearer\n    token: ${token}\n# (requires GPT-5 Apps SDK or a ChatGPT MCP-compatible client)`,
  };

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Your MCP token</h2>

      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate text-xs font-mono bg-muted/40 px-3 py-2 rounded">
            {display}
          </code>
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            className="text-xs px-3 py-2 rounded border border-border hover:bg-muted/40 transition"
          >
            {revealed ? 'Hide' : 'Reveal'}
          </button>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(token);
              alert('Token copied to clipboard');
            }}
            className="text-xs px-3 py-2 rounded border border-border hover:bg-muted/40 transition"
          >
            Copy
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Treat this like a password. Anyone with this token can read your OpsRadar data + propose
          actions on your behalf (HITL-gated for writes).
        </p>
      </div>

      <h3 className="text-sm font-medium pt-2">Install</h3>
      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm border-b-2 -mb-px transition ${
              tab === t
                ? 'border-foreground font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <pre className="rounded-lg border border-border bg-muted/20 p-4 overflow-x-auto text-xs leading-relaxed">
        {snippets[tab]}
      </pre>

      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(snippets[tab]);
          alert(`${tab} snippet copied to clipboard`);
        }}
        className="text-xs px-3 py-2 rounded border border-border hover:bg-muted/40 transition"
      >
        Copy snippet
      </button>

      {tab === 'Claude Desktop' && (
        <p className="text-xs text-muted-foreground">
          Paste into <code className="text-xs">~/Library/Application Support/Claude/claude_desktop_config.json</code> (Mac)
          or <code className="text-xs">%APPDATA%\Claude\claude_desktop_config.json</code> (Windows), then restart
          Claude Desktop.
        </p>
      )}
    </section>
  );
}

function maskToken(token: string): string {
  if (token.length <= 16) return '••••••••';
  return `${token.slice(0, 8)}${'•'.repeat(40)}${token.slice(-8)}`;
}
