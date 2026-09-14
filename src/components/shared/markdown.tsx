"use client";

import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

// Lightweight markdown renderer for trade notes (thesis, post-note, lessons).
// Supports bold, italic, lists, code, links — keeps formatting readable in Persian RTL.
export function Markdown({ children, className }: { children: string; className?: string }) {
  if (!children?.trim()) return null;
  return (
    <div dir="rtl" className={cn("prose-sm leading-relaxed text-sm", className)}>
      <ReactMarkdown
        components={{
          // Headings
          h1: ({ children }) => <h3 className="mb-1 mt-2 text-base font-bold">{children}</h3>,
          h2: ({ children }) => <h4 className="mb-1 mt-2 text-sm font-bold">{children}</h4>,
          h3: ({ children }) => <h5 className="mb-1 mt-1 text-sm font-semibold">{children}</h5>,
          // Bold
          strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
          // Italic
          em: ({ children }) => <em className="italic text-muted-foreground">{children}</em>,
          // Lists
          ul: ({ children }) => <ul className="mb-2 mr-4 list-disc space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="mb-2 mr-4 list-decimal space-y-0.5">{children}</ol>,
          li: ({ children }) => <li className="text-sm">{children}</li>,
          // Code
          code: ({ children }) => (
            <code dir="ltr" className="rounded bg-muted/60 px-1 py-0.5 font-mono text-xs text-gold">
              {children}
            </code>
          ),
          // Links
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-gold underline hover:opacity-80">
              {children}
            </a>
          ),
          // Blockquote
          blockquote: ({ children }) => (
            <blockquote className="border-r-2 border-gold/40 bg-gold/5 py-1 pr-3 text-sm text-muted-foreground">
              {children}
            </blockquote>
          ),
          // Paragraph
          p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
          // Horizontal rule
          hr: () => <hr className="my-2 border-border/60" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
