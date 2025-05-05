// src/components/markdown-preview.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { marked } from 'marked';
import mermaid from 'mermaid';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import MermaidDiagram from './mermaid-diagram'; // Assuming MermaidDiagram component exists

interface MarkdownPreviewProps {
  content: string;
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = React.memo(({ content }) => {
  const [renderedHtml, setRenderedHtml] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true); // Mark as client-side
  }, []);

  useEffect(() => {
    if (isClient && content) {
      // Ensure marked runs only on the client after mount
      try {
          // Basic sanitization for security (consider a more robust library if needed)
          const sanitizedContent = content
              .replace(/<script.*?>.*?<\/script>/gi, '') // Remove script tags
              .replace(/javascript:/gi, ''); // Remove javascript: links

          setRenderedHtml(marked.parse(sanitizedContent));

          // Re-initialize Mermaid for diagrams within the preview
          mermaid.initialize({ startOnLoad: false }); // Don't auto-render globally
          setTimeout(() => { // Allow DOM to update
            try {
              mermaid.run({ nodes: document.querySelectorAll(`.markdown-preview-container .mermaid`) });
            } catch (mermaidError) {
              console.error("Mermaid rendering error in preview:", mermaidError);
            }
          }, 100); // Adjust delay if needed
      } catch (error) {
          console.error("Error parsing Markdown:", error);
          setRenderedHtml("<p class='text-destructive'>Error rendering preview.</p>");
      }
    } else {
      setRenderedHtml(''); // Clear if no content or on server
    }
  }, [content, isClient]); // Re-render when content changes on the client

  if (!isClient) {
    // Render nothing or a placeholder on the server/during hydration
    return <div className="prose prose-sm dark:prose-invert max-w-none p-4 border rounded min-h-[400px] bg-muted/20 flex items-center justify-center"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground"/></div>;
  }

  return (
    <div className="markdown-preview-container"> {/* Add a container class */}
      <div
        className="prose prose-sm dark:prose-invert max-w-none p-4 border rounded min-h-[400px] bg-muted/20" // Added background for contrast
        dangerouslySetInnerHTML={{ __html: renderedHtml || '<p class="italic text-muted-foreground">Nothing to preview yet.</p>' }}
      />
      {/* Explicitly render Mermaid diagrams *outside* dangerouslySetInnerHTML for better control */}
       {/* This part might be redundant if mermaid.run() works reliably inside the effect */}
       {/* Consider keeping it as a fallback or if mermaid.run has issues */}
      {/*
      <div className="space-y-4 mt-4 p-4 border rounded bg-muted/20">
        {content?.match(/```mermaid\n([\s\S]*?)\n```/g)?.map((block, index) => {
          const code = block.replace(/```mermaid\n/, '').replace(/\n```/, '');
          return (
            <div key={`diagram-preview-explicit-${index}`} className="my-4">
              <MermaidDiagram chart={code} />
            </div>
          );
        })}
      </div>
      */}
    </div>
  );
});
MarkdownPreview.displayName = 'MarkdownPreview';

export default MarkdownPreview;
