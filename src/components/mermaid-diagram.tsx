// src/components/mermaid-diagram.tsx
"use client";

import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';

interface MermaidDiagramProps {
  chart: string; // The Mermaid code
  id?: string; // Optional unique ID for the diagram
  className?: string;
}

// Initialize Mermaid once (consider moving to a layout or provider if used widely)
// mermaid.initialize({ startOnLoad: false }); // We'll render manually

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart, id, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const diagramId = React.useMemo(() => id || `mermaid-diagram-${Math.random().toString(36).substring(7)}`, [id]);

  useEffect(() => {
    let isMounted = true;
    const container = containerRef.current;

    if (container && chart) {
      setIsLoading(true);
      setError(null);

      // Ensure Mermaid is initialized (can be redundant if initialized globally)
      mermaid.initialize({
          startOnLoad: false,
          theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default', // Basic theme detection
          securityLevel: 'loose', // Adjust as needed, 'loose' allows more flexibility but consider security implications
          //logLevel: 'debug', // For debugging
       });

      const renderDiagram = async () => {
        try {
          // Sanitize chart slightly (basic) - more robust sanitization might be needed
          const sanitizedChart = chart
            .replace(/<script.*?>.*?<\/script>/gi, '') // Remove script tags
            .replace(/onerror\s*=/gi, ''); // Remove onerror attributes

          const { svg } = await mermaid.render(diagramId, sanitizedChart);

          if (isMounted && container) {
            container.innerHTML = svg; // Render the SVG
             // Post-render adjustments if needed (e.g., scaling)
             const svgElement = container.querySelector('svg');
             if (svgElement) {
                svgElement.style.maxWidth = '100%';
                svgElement.style.height = 'auto'; // Maintain aspect ratio
             }
          }
        } catch (err: any) {
          console.error("Mermaid rendering error:", err);
          if (isMounted) {
            setError(err.message || "Failed to render diagram. Check Mermaid syntax.");
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      };

      renderDiagram();

    } else if (!chart && container) {
       // Handle empty chart string
       container.innerHTML = ''; // Clear container
       setIsLoading(false);
       setError(null);
    }

    return () => {
      isMounted = false;
      // Optional cleanup if Mermaid adds specific listeners or elements you want removed
    };
  }, [chart, diagramId]); // Rerun effect if chart code or ID changes

  return (
    <div className={cn("mermaid-container relative p-4 border rounded-md bg-muted/20 min-h-[150px]", className)}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
            <Skeleton className="w-full h-full" />
        </div>
       )}
      {error && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-destructive text-sm p-4">
          <AlertTriangle className="w-8 h-8 mb-2" />
          <p className="font-semibold">Diagram Error</p>
          <p className="text-center break-words">{error}</p>
        </div>
      )}
      {/* Container where Mermaid will render the SVG */}
       <div ref={containerRef} id={`container-${diagramId}`} className={cn(isLoading || error ? 'opacity-0' : 'opacity-100 transition-opacity duration-300')} />
    </div>
  );
};

export default MermaidDiagram;
