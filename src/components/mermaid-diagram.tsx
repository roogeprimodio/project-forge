// src/components/mermaid-diagram.tsx
"use client";

import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Info } from 'lucide-react'; 
import { useTheme } from "next-themes"; 

interface MermaidDiagramProps {
  chart: string; 
  id?: string; 
  className?: string;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart, id, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null); 
  const { resolvedTheme } = useTheme(); 
  const diagramId = React.useMemo(() => id || `mermaid-diagram-${Math.random().toString(36).substring(7)}`, [id]);

  useEffect(() => {
    let isMounted = true;
    const container = containerRef.current;

    if (container && chart) {
      setIsLoading(true);
      setError(null);
      setErrorDetails(null);

      // Check if the provided chart code is already an error message from our AI flow
      if (chart.trim().startsWith("graph TD\nError[") || chart.trim().startsWith("flowchart TD\nError[")) {
        if (isMounted) {
          // Display the AI-generated error directly as an informational message
          setError("AI indicated an issue with the diagram request:");
          setErrorDetails(chart); // Show the raw error diagram code
          setIsLoading(false);
        }
        return; // Don't try to render it with Mermaid
      }

      mermaid.initialize({
        startOnLoad: false,
        theme: resolvedTheme === 'dark' ? 'dark' : 'default',
        securityLevel: 'loose', // More permissive for AI-generated code
        // logLevel: 'debug', 
      });

      const renderDiagram = async () => {
        try {
          const sanitizedChart = chart.trim(); 

          if (!container) return;
          container.innerHTML = ''; // Clear previous content

          const knownTypes = ['flowchart', 'graph', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'gantt', 'pie', 'mindmap', 'stateDiagram-v2', 'journey'];
          if (!knownTypes.some(type => sanitizedChart.toLowerCase().startsWith(type))) {
               throw new Error(`Diagram code must start with a valid type declaration (e.g., 'flowchart TD'). Received:\n${sanitizedChart.substring(0, 50)}...`);
           }

          const { svg } = await mermaid.render(diagramId, sanitizedChart);

          if (isMounted && container) {
            container.innerHTML = svg; 
            const svgElement = container.querySelector('svg');
            if (svgElement) {
              svgElement.style.maxWidth = '100%';
              svgElement.style.height = 'auto';
            }
          }
        } catch (err: any) {
          console.error("Mermaid rendering error:", err);
          if (isMounted) {
            let errorMessage = "Failed to render diagram. Check Mermaid syntax.";
            if (err.str) { 
                errorMessage = `Parse error: ${err.str}`;
            } else if (err.message) {
                errorMessage = err.message;
            }
            setError(errorMessage);
            setErrorDetails(`Problematic Code:\n\`\`\`mermaid\n${chart.substring(0, 200)}${chart.length > 200 ? '...' : ''}\n\`\`\``);
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      };

      const timer = setTimeout(renderDiagram, 50);
      return () => clearTimeout(timer);

    } else if (!chart && container) {
      container.innerHTML = '<div class="flex flex-col items-center justify-center h-full text-muted-foreground p-4"><Info className="w-8 h-8 mb-2" /><p>No diagram code provided.</p></div>';
      setIsLoading(false);
      setError(null);
      setErrorDetails(null);
    }

    return () => {
      isMounted = false;
    };
  }, [chart, diagramId, resolvedTheme]);

  return (
    <div className={cn("mermaid-container relative p-2 border rounded-md bg-muted/20 min-h-[150px] overflow-hidden", className)}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
          <Skeleton className="w-[95%] h-[90%]" />
        </div>
      )}

      {error && !isLoading && (
        <div className={cn(
          "absolute inset-0 flex flex-col items-center justify-center text-xs p-2 z-10",
          errorDetails && errorDetails.startsWith("graph TD\nError[") ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" : "bg-destructive/10 text-destructive"
        )}>
          {errorDetails && errorDetails.startsWith("graph TD\nError[") ? <Info className="w-6 h-6 mb-1" /> : <AlertTriangle className="w-6 h-6 mb-1" />}
          <p className="font-semibold text-center text-sm mb-1">{error}</p>
          {errorDetails && (
             <details className={cn("text-[10px] w-full max-w-full", errorDetails.startsWith("graph TD\nError[") ? "text-amber-600 dark:text-amber-500" : "text-destructive/80")}>
               <summary className="cursor-pointer text-center hover:underline">Show Details/Code</summary>
               <pre className={cn("mt-1 p-1 rounded-sm text-left overflow-x-auto max-h-24", errorDetails.startsWith("graph TD\nError[") ? "bg-amber-500/5" : "bg-destructive/5")}>
                 <code>{errorDetails}</code>
               </pre>
             </details>
           )}
        </div>
      )}

      <div
        ref={containerRef}
        id={`container-${diagramId}`}
        className={cn(
            'transition-opacity duration-300 w-full h-full', 
            (isLoading || (error && !(errorDetails && errorDetails.startsWith("graph TD\nError[")))) ? 'opacity-20' : 'opacity-100' 
        )}
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }} 
      >
        {!isLoading && !error && !containerRef.current?.hasChildNodes() && (
            <div className="text-muted-foreground text-sm italic">Rendering diagram...</div>
        )}
      </div>
    </div>
  );
};

export default MermaidDiagram;
