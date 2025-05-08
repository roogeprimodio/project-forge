'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight, Lightbulb, Loader2, X } from 'lucide-react';
import type { ExplanationSlide, ExplainConceptOutput } from '@/types/project';
import MarkdownPreview from './markdown-preview'; // Re-use for rendering slide content
import MermaidDiagram from './mermaid-diagram';
import { cn } from '@/lib/utils';

interface AiConceptExplainerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  explanation: ExplainConceptOutput | null;
  isLoading: boolean;
  onRegenerate?: () => void; // Optional: if regeneration is needed from within the modal
}

export const AiConceptExplainer: React.FC<AiConceptExplainerProps> = ({
  isOpen,
  onOpenChange,
  explanation,
  isLoading,
  onRegenerate,
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  React.useEffect(() => {
    // Reset to first slide when explanation changes or modal opens/closes
    setCurrentSlideIndex(0);
  }, [explanation, isOpen]);

  if (!isOpen) {
    return null;
  }

  const slides = explanation?.slides || [];
  const currentSlide = slides[currentSlideIndex];

  const goToNextSlide = () => {
    setCurrentSlideIndex((prevIndex) => Math.min(prevIndex + 1, slides.length - 1));
  };

  const goToPreviousSlide = () => {
    setCurrentSlideIndex((prevIndex) => Math.max(prevIndex - 1, 0));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl h-[80vh] sm:h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-4 sm:p-6 border-b flex-shrink-0">
          <DialogTitle className="text-lg sm:text-xl md:text-2xl text-primary">
            {isLoading ? 'Generating Explanation...' : `AI Explanation: ${explanation?.conceptTitle || 'Concept'}`}
          </DialogTitle>
          {!isLoading && explanation && (
            <DialogDescription className="text-xs sm:text-sm">
              Explore the concept step-by-step. Use the arrows to navigate.
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex-grow overflow-hidden p-4 sm:p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Loader2 className="w-12 h-12 sm:w-16 sm:w-16 animate-spin text-primary mb-4" />
              <p className="text-sm sm:text-base">AI is thinking... Please wait.</p>
            </div>
          ) : !explanation || slides.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Lightbulb className="w-12 h-12 sm:w-16 sm:w-16 opacity-50 mb-4" />
              <p className="text-sm sm:text-base">No explanation available or AI failed to generate content.</p>
              {onRegenerate && (
                <Button onClick={onRegenerate} variant="outline" className="mt-4">
                  Try Again
                </Button>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col gap-3 sm:gap-4">
              {currentSlide.title && (
                <h3 className="text-md sm:text-lg font-semibold text-primary border-b pb-1 sm:pb-2">
                  {currentSlide.title}
                </h3>
              )}
              <ScrollArea className="flex-1 bg-muted/20 p-3 sm:p-4 rounded-md">
                <MarkdownPreview content={currentSlide.content} />
                {currentSlide.mermaidDiagram && (
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
                    <h4 className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 sm:mb-2">Diagram:</h4>
                    <MermaidDiagram chart={currentSlide.mermaidDiagram} id={`explainer-diag-${currentSlideIndex}`} />
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </div>

        {!isLoading && slides.length > 0 && (
          <DialogFooter className="p-4 sm:p-6 border-t flex-shrink-0 flex flex-row justify-between items-center w-full">
            <div className="text-xs sm:text-sm text-muted-foreground">
              Slide {currentSlideIndex + 1} of {slides.length}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={goToPreviousSlide}
                disabled={currentSlideIndex === 0}
                size="sm"
                className="h-8 sm:h-9"
              >
                <ChevronLeft className="mr-1 h-4 w-4" /> Previous
              </Button>
              <Button
                variant="default"
                onClick={goToNextSlide}
                disabled={currentSlideIndex === slides.length - 1}
                size="sm"
                 className="h-8 sm:h-9"
              >
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </DialogFooter>
        )}
         <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 h-7 w-7 sm:h-8 sm:w-8"
            aria-label="Close"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
      </DialogContent>
    </Dialog>
  );
};
