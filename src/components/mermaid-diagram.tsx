// src/components/mermaid-diagram.tsx
"use client";

import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Info } from 'lucide-react'; // Added Info icon
import { useTheme } from "next-themes"; // Import useTheme

interface MermaidDiagramProps {
  chart: string; // The Mermaid code
  id?: string; // Optional unique ID for the diagram
  className?: string;
}

// Initialize Mermaid once (consider moving to a layout or provider if used widely)
// mermaid.initialize({ startOnLoad: false }); // We'll render manually

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart, id, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null); // Store details like code snippet
  const { resolvedTheme } = useTheme(); // Get the current theme (light/dark)
  const diagramId = React.useMemo(() => id || `mermaid-diagram-${Math.random().toString(36).substring(7)}`, [id]);

  useEffect(() => {
    let isMounted = true;
    const container = containerRef.current;

    if (container && chart) {
      setIsLoading(true);
      setError(null);
      setErrorDetails(null);

      // Re-initialize or update theme config before rendering
      mermaid.initialize({
        startOnLoad: false,
        theme: resolvedTheme === 'dark' ? 'dark' : 'default',
        securityLevel: 'loose', // Allows more flexibility, consider security
        // logLevel: 'debug', // Useful for complex debugging
      });

      const renderDiagram = async () => {
        try {
          // Basic sanitization (keep simple for now, avoid over-complication)
          const sanitizedChart = chart.trim(); // Just trim whitespace initially

           // Clear previous content before rendering
          if (container) {
            container.innerHTML = '';
          }


          // Validate basic structure (e.g., starts with a known type)
          const knownTypes = ['flowchart', 'graph', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'gantt', 'pie', 'mindmap'];
           if (!knownTypes.some(type => sanitizedChart.toLowerCase().startsWith(type))) {
               throw new Error(`Diagram code must start with a valid type declaration (e.g., 'flowchart TD', 'sequenceDiagram'). Received:\n${sanitizedChart.substring(0, 50)}...`);
           }


          // Attempt to render
          const { svg } = await mermaid.render(diagramId, sanitizedChart);

          if (isMounted && container) {
            container.innerHTML = svg; // Render the SVG
            // Post-render adjustments (scaling)
            const svgElement = container.querySelector('svg');
            if (svgElement) {
              svgElement.style.maxWidth = '100%';
              svgElement.style.height = 'auto';
            }
          }
        } catch (err: any) {
          console.error("Mermaid rendering error:", err);
          if (isMounted) {
            // Try to extract a meaningful message
            let errorMessage = "Failed to render diagram. Check Mermaid syntax.";
            if (err.str) { // Mermaid often includes the problematic string in err.str
                errorMessage = `Parse error: ${err.str}`;
            } else if (err.message) {
                errorMessage = err.message;
            }
            setError(errorMessage);

             // Include the problematic code snippet in details
             setErrorDetails(`Problematic Code (around error location):\n\`\`\`mermaid\n${chart.substring(0, 200)}${chart.length > 200 ? '...' : ''}\n\`\`\``);
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      };

      // Delay rendering slightly to ensure theme is applied
      const timer = setTimeout(renderDiagram, 50);
      return () => clearTimeout(timer);


    } else if (!chart && container) {
      // Handle empty chart string
      container.innerHTML = '<div class="flex flex-col items-center justify-center h-full text-muted-foreground p-4"><Info className="w-8 h-8 mb-2" /><p>No diagram code provided.</p></div>';
      setIsLoading(false);
      setError(null);
      setErrorDetails(null);
    }

    return () => {
      isMounted = false;
    };
    // Rerun effect if chart code, ID, or theme changes
  }, [chart, diagramId, resolvedTheme]);

  return (
    <div className={cn("mermaid-container relative p-2 border rounded-md bg-muted/20 min-h-[150px] overflow-hidden", className)}>
       {/* Loading Skeleton */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
          <Skeleton className="w-[95%] h-[90%]" />
        </div>
      )}

      {/* Error Display */}
      {error && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-destructive text-xs p-2 z-10 bg-destructive/10">
          <AlertTriangle className="w-6 h-6 mb-1" />
          <p className="font-semibold text-center text-sm mb-1">Diagram Error</p>
          <p className="text-center break-words max-h-20 overflow-y-auto px-2 text-[10px] leading-tight mb-1">{error}</p>
           {errorDetails && (
             <details className="text-[10px] text-destructive/80 w-full max-w-full">
               <summary className="cursor-pointer text-center hover:underline">Show Details</summary>
               <pre className="mt-1 p-1 bg-destructive/5 rounded-sm text-left overflow-x-auto max-h-24">
                 <code>{errorDetails}</code>
               </pre>
             </details>
           )}
        </div>
      )}

      {/* Mermaid Render Container (always present, opacity handles visibility) */}
      <div
        ref={containerRef}
        id={`container-${diagramId}`}
        className={cn(
            'transition-opacity duration-300 w-full h-full', // Ensure container takes space
            (isLoading || error) ? 'opacity-20' : 'opacity-100' // Dim if loading or error
        )}
        // Add placeholder content if container is empty and no error/loading
        // This prevents layout collapse
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }} // Center placeholder
      >
        {/* Placeholder content when no diagram, error, or loading */}
        {!isLoading && !error && !containerRef.current?.hasChildNodes() && (
            <div className="text-muted-foreground text-sm italic">Rendering diagram...</div>
        )}
      </div>
    </div>
  );
};

export default MermaidDiagram;
