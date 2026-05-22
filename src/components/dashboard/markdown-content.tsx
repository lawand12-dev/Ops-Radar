// src/components/dashboard/markdown-content.tsx
//
// Shared markdown renderer for assistant messages, living briefs,
// pattern descriptions — anywhere an LLM emits text that may include
// headings, bold, lists, code, or tables.
//
// Uses react-markdown + remark-gfm for tables / strikethrough / task
// lists / autolinks. Components are styled inline so this works without
// requiring a global @apply prose theme.

'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

const COMPONENTS: Components = {
  h1: ({ children, ...rest }) => (
    <h1 className="text-base font-semibold mt-3 mb-1 text-[var(--color-fg)]" {...rest}>
      {children}
    </h1>
  ),
  h2: ({ children, ...rest }) => (
    <h2 className="text-[14.5px] font-semibold mt-3 mb-1 text-[var(--color-fg)]" {...rest}>
      {children}
    </h2>
  ),
  h3: ({ children, ...rest }) => (
    <h3 className="text-[13.5px] font-medium mt-2 mb-1 text-[var(--color-fg)]" {...rest}>
      {children}
    </h3>
  ),
  p: ({ children, ...rest }) => (
    <p className="my-1.5" {...rest}>
      {children}
    </p>
  ),
  ul: ({ children, ...rest }) => (
    <ul className="list-disc pl-5 my-1.5 space-y-0.5" {...rest}>
      {children}
    </ul>
  ),
  ol: ({ children, ...rest }) => (
    <ol className="list-decimal pl-5 my-1.5 space-y-0.5" {...rest}>
      {children}
    </ol>
  ),
  li: ({ children, ...rest }) => <li {...rest}>{children}</li>,
  strong: ({ children, ...rest }) => (
    <strong className="font-semibold text-[var(--color-fg)]" {...rest}>
      {children}
    </strong>
  ),
  em: ({ children, ...rest }) => (
    <em className="italic" {...rest}>
      {children}
    </em>
  ),
  code: ({ children, className, ...rest }) => {
    // Inline code vs fenced code block — react-markdown gives className
    // like "language-foo" for fenced blocks, nothing for inline
    const isBlock = !!className;
    if (isBlock) {
      return (
        <code className="block rounded-[var(--radius)] bg-[var(--color-surface-sunken)] border border-[var(--color-border)] px-3 py-2 my-2 text-[12px] font-mono overflow-x-auto" {...rest}>
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-[var(--color-surface-sunken)] px-1 py-0.5 text-[12px] font-mono" {...rest}>
        {children}
      </code>
    );
  },
  pre: ({ children, ...rest }) => (
    <pre className="my-2" {...rest}>
      {children}
    </pre>
  ),
  blockquote: ({ children, ...rest }) => (
    <blockquote className="border-l-2 border-[var(--color-primary)] pl-3 my-2 italic text-[var(--color-fg-muted)]" {...rest}>
      {children}
    </blockquote>
  ),
  a: ({ children, href, ...rest }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[var(--color-primary)] underline underline-offset-2 hover:opacity-80"
      {...rest}
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-3 border-[var(--color-border)]" />,
  table: ({ children, ...rest }) => (
    <div className="my-2 overflow-x-auto">
      <table className="text-[12px] border-collapse w-full" {...rest}>
        {children}
      </table>
    </div>
  ),
  th: ({ children, ...rest }) => (
    <th className="text-left font-medium px-2 py-1 border border-[var(--color-border)] bg-[var(--color-surface-sunken)]" {...rest}>
      {children}
    </th>
  ),
  td: ({ children, ...rest }) => (
    <td className="px-2 py-1 border border-[var(--color-border)] align-top" {...rest}>
      {children}
    </td>
  ),
};

export function MarkdownContent({ children, className = '' }: { children: string; className?: string }) {
  return (
    <div className={`coo-md text-[13px] leading-[1.6] text-[var(--color-fg)] ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
