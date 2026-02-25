'use client';

import { forwardRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mdComponents: Components = {
  h1: ({ children }) => <h1 className="text-2xl font-bold text-[#111827] mb-4 mt-2 border-b border-[#E5E7EB] pb-2">{children}</h1>,
  h2: ({ children }) => <h2 className="text-xl font-semibold text-[#111827] mb-3 mt-6">{children}</h2>,
  h3: ({ children }) => <h3 className="text-base font-semibold text-[#374151] mb-2 mt-4">{children}</h3>,
  h4: ({ children }) => <h4 className="text-sm font-semibold text-[#374151] mb-1 mt-3">{children}</h4>,
  p: ({ children }) => <p className="text-sm text-[#374151] mb-3 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="list-disc ml-5 mb-3 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal ml-5 mb-3 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="text-sm text-[#374151] leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-[#111827]">{children}</strong>,
  em: ({ children }) => <em className="italic text-[#6B7280]">{children}</em>,
  hr: () => <hr className="my-4 border-[#E5E7EB]" />,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-teal-300 pl-4 text-[#6B7280] italic my-3">{children}</blockquote>
  ),
  pre: ({ children }) => (
    <pre className="bg-gray-100 rounded-lg p-4 overflow-x-auto my-3 text-xs font-mono text-[#374151]">{children}</pre>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  code: ({ className, children }: any) => {
    if (className) {
      // Code block (inside <pre>)
      return <code className="font-mono text-xs text-[#374151]">{children}</code>;
    }
    // Inline code
    return (
      <code className="bg-gray-100 rounded px-1.5 py-0.5 text-xs font-mono text-[#374151]">{children}</code>
    );
  },
  table: ({ children }) => (
    <div className="overflow-x-auto my-3">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  th: ({ children }: any) => (
    <th className="border border-[#E5E7EB] px-3 py-2 text-left text-xs font-semibold text-[#374151] uppercase tracking-wider">
      {children}
    </th>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  td: ({ children }: any) => (
    <td className="border border-[#E5E7EB] px-3 py-2 text-sm text-[#374151]">{children}</td>
  ),
};

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer = forwardRef<HTMLDivElement, MarkdownRendererProps>(
  ({ content, className = '' }, ref) => (
    <div ref={ref} className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {content}
      </ReactMarkdown>
    </div>
  )
);

MarkdownRenderer.displayName = 'MarkdownRenderer';
