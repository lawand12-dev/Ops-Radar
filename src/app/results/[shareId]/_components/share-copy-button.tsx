'use client';

import { useState } from 'react';

export function ShareCopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-[13px] font-medium text-white/70 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white"
    >
      {copied ? (
        <>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 3H11.5C12.0523 3 12.5 3.44772 12.5 4V11C12.5 11.5523 12.0523 12 11.5 12H5C4.44772 12 4 11.5523 4 11V9.5M9 3V4.5C9 5.05228 8.55228 5.5 8 5.5H3.5C2.94772 5.5 2.5 5.05228 2.5 4.5V4C2.5 3.44772 2.94772 3 3.5 3H9Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Copy link
        </>
      )}
    </button>
  );
}
