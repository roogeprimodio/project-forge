// src/components/markdown-preview.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { marked } from 'marked';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import MermaidDiagram from './mermaid-diagram'; // Import the MermaidDiagram component

interface MarkdownPreviewProps {
  content: string;
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = React.memo(({ content }) => {
  const [renderedHtml, setRenderedHtml] = useState('');
  const [diagrams, setDiagrams] = useState<{ code: string; id: string }[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true); // Mark as client-side
  }, []);

  useEffect(() => {
    if (isClient && content) {
      try {
        // Basic sanitization
        const sanitizedContent = content
            .replace(/<script.*?>.*?<\/script>/gi, '')
            .replace(/javascript:/gi, '');

        // Extract Mermaid blocks and replace them with placeholders
        const tempDiagrams: { code: string; id: string }[] = [];
        const placeholderPrefix = 'mermaid-placeholder-';
        let index = 0;
        const contentWithoutDiagrams = sanitizedContent.replace(
          /```mermaid\n([\s\S]*?)\n```/g,
          (match, code) => {
            const id = `${placeholderPrefix}${index++}`;
            tempDiagrams.push({ code: code.trim(), id });
            return `<div id="${id}" class="mermaid-render-placeholder my-4"></div>`; // Placeholder div
          }
        );

        setRenderedHtml(marked.parse(contentWithoutDiagrams));
        setDiagrams(tempDiagrams);

      } catch (error) {
          console.error("Error parsing Markdown:", error);
          setRenderedHtml("<p class='text-destructive'>Error rendering preview.</p>");
          setDiagrams([]);
      }
    } else {
      setRenderedHtml(''); // Clear if no content or on server
      setDiagrams([]);
    }
  }, [content, isClient]);

  // Effect to render diagrams into placeholders after HTML is rendered
  useEffect(() => {
    if (isClient && diagrams.length > 0) {
        // Give the DOM a moment to update with the placeholders
        const timeoutId = setTimeout(() => {
            diagrams.forEach(diagram => {
                const placeholder = document.getElementById(diagram.id);
                // While we use the MermaidDiagram component below,
                // this logic shows how you *could* render directly if needed.
                // For this implementation, we rely on the component rendering below.
                // if (placeholder) {
                //    // Logic to render using mermaid.render could go here
                // }
            });
        }, 100); // Adjust delay if necessary
         return () => clearTimeout(timeoutId);
    }
  }, [diagrams, isClient, renderedHtml]); // Rerun when diagrams or renderedHtml changes


  if (!isClient) {
    // Server/hydration placeholder
    return <div className="prose prose-sm dark:prose-invert max-w-none p-4 border rounded min-h-[400px] bg-muted/20 flex items-center justify-center"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground"/></div>;
  }

  return (
    <div className="markdown-preview-container space-y-4"> {/* Add space between elements */}
      {/* Render the HTML part (without diagrams initially) */}
      <div
        className="prose prose-sm dark:prose-invert max-w-none p-4 border rounded bg-muted/20"
        dangerouslySetInnerHTML={{ __html: renderedHtml || '<p class="italic text-muted-foreground">Nothing to preview yet.</p>' }}
      />

      {/* Explicitly render Mermaid diagrams using the component */}
      {diagrams.map((diagram) => (
        <div key={diagram.id} className="mermaid-diagram-wrapper p-4 border rounded bg-muted/30">
           <h4 className="text-xs font-semibold text-muted-foreground mb-2">Diagram Preview:</h4>
           <MermaidDiagram chart={diagram.code} id={`preview-${diagram.id}`} />
           <details className="mt-2 text-xs">
               <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Show Code</summary>
               <pre className="mt-1 p-2 bg-muted rounded-md text-muted-foreground overflow-x-auto max-h-32">
                 <code>{diagram.code}</code>
               </pre>
           </details>
        </div>
      ))}
    </div>
  );
});
MarkdownPreview.displayName = 'MarkdownPreview';

export default MarkdownPreview;
