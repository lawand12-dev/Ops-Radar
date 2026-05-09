'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '<npm>/components/ui/dialog';
import { Button } from '<npm>/components/ui/button';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: () => void;
};

export function ConnectHubSpotModal({ open, onOpenChange, onConnected }: Props) {
  const [accessToken, setAccessToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/integrations/hubspot', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ access_token: accessToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Connection failed');
        return;
      }
      onConnected();
      onOpenChange(false);
      setAccessToken('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect HubSpot</DialogTitle>
        </DialogHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
          <p style={{ fontSize: 13, color: '#4A6280', lineHeight: 1.5 }}>
            Paste a HubSpot <strong>Service Key</strong> (recommended) or Private App access token with
            read access to <em>Deals</em> and <em>Contacts</em>. Create one in{' '}
            <strong>HubSpot Settings → Integrations</strong>.
          </p>
          <input
            type="password"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="paste your HubSpot key here"
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid rgba(0,194,255,0.2)',
              background: '#0F1923',
              color: '#E0F0FF',
              fontSize: 13,
              fontFamily: 'monospace',
            }}
            disabled={submitting}
          />
          {error && (
            <div style={{ fontSize: 12, color: '#FF4D4D' }}>{error}</div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={submitting || accessToken.length < 8}>
              {submitting ? 'Connecting…' : 'Connect'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
