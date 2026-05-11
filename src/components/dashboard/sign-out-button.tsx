'use client';

import { LogOut } from 'lucide-react';

export function SignOutButton() {
  return (
    <form action="/api/auth/signout" method="post" className="w-full">
      <button
        type="submit"
        className="flex w-full cursor-pointer items-center gap-2.5 rounded-[var(--radius)] border border-[var(--color-border)] bg-transparent px-3 py-2.5 text-left text-[13px] font-medium text-[var(--color-fg)] transition-colors hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-sunken)]"
      >
        <LogOut size={14} className="text-[var(--color-fg-muted)]" />
        <span>Sign out</span>
      </button>
    </form>
  );
}
