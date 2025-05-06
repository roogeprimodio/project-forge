// src/components/combined-section-preview.tsx
"use client";

import React from 'react';
import type { HierarchicalProjectSection } from '@/types/project';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import MermaidDiagram from './mermaid-diagram';
import { marked } from 'marked';

interface CombinedSectionPreviewProps {
  section: HierarchicalProjectSection;
  projectTitle: string;
}

const renderSectionRecursively = (
  section: HierarchicalProjectSection,
  projectTitle: string,
  level: number = 0,
  numbering: string = ''
): React.ReactNode => {
  const isDiagram = section.name.toLowerCase().startsWith("diagram:") || section.name.toLowerCase().startsWith("figure:");
  const headingLevel = Math.min(6, level + 1); // h1, h2, h3, etc.
  const HeadingTag = `h${headingLevel}` as keyof JSX.IntrinsicElements;

  const titleText = `${numbering} ${section.name}`;

  return (
    <div key={section.id} className={cn(level > 0 && "ml-4 mt-4")}>
      <HeadingTag className={cn(
        "font-semibold text-foreground mb-2",
        level === 0 && "text-2xl border-b pb-2", // Main section title
        level === 1 && "text-xl",               // Sub-section title
        level >= 2 && "text-lg"                 // Sub-sub-section title
      )}>
        {titleText}
      </HeadingTag>

      {isDiagram && section.content ? (
        <div className="my-4 p-2 border rounded-md bg-muted/30">
            <h4 className="text-sm font-medium text-muted-foreground mb-1 italic">Diagram:</h4>
            <MermaidDiagram chart={section.content} id={`preview-diagram-${section.id}`} />
        </div>
      ) : section.content ? (
        <div
          className="prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: marked.parse(section.content) }}
        />
      ) : (
        !isDiagram && (!section.subSections || section.subSections.length === 0) && (
            <p className="italic text-muted-foreground text-sm my-2">[Content for "{section.name}" not yet generated or section is a container for sub-sections below.]</p>
        )
      )}

      {section.subSections && section.subSections.length > 0 && (
        <div className={cn("mt-2", level > 0 && "border-l pl-4 border-muted/50")}>
          {section.subSections.map((sub, index) =>
            renderSectionRecursively(sub, projectTitle, level + 1, `${numbering}.${index + 1}`)
          )}
        </div>
      )}
    </div>
  );
};

export const CombinedSectionPreview: React.FC<CombinedSectionPreviewProps> = ({ section, projectTitle }) => {
  // Find the top-level numbering for the current main section
  // This requires access to the full project.sections array, which is not directly available here.
  // For simplicity, we'll start numbering from 1 for the preview within this component.
  // A more accurate numbering would require passing the section's index or full path.

  return (
    <Card className="shadow-lg w-full h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="text-xl md:text-2xl text-primary text-glow-primary">
          Preview: {section.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden"> {/* Ensure CardContent can grow and handle overflow */}
        <ScrollArea className="h-full pr-1"> {/* Make ScrollArea take full height of CardContent */}
          <div
            className={cn(
              "bg-white dark:bg-neutral-900 shadow-2xl rounded-sm mx-auto",
              "p-4 sm:p-8 md:p-12", // Responsive padding
              "w-full max-w-[210mm] min-h-[297mm] md:min-h-[calc(var(--a4-height-multiplier,1.414)*var(--a4-width,210mm))]", // A4 aspect ratio for larger screens
              "aspect-[210/297]" // Maintain A4 aspect ratio
            )}
            style={{
              // For smaller screens, allow width to be 100% of parent and height to auto-adjust based on aspect ratio
              // On larger screens, max-width will cap it.
              boxSizing: 'border-box',
            }}
          >
            {renderSectionRecursively(section, projectTitle, 0, "1")}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
