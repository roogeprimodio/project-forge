'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight, Lightbulb, Loader2, X, Image as ImageIconLucide, Video, Zap } from 'lucide-react';
import type { ExplanationSlide, ExplainConceptOutput } from '@/types/project';
import MarkdownPreview from './markdown-preview';
import MermaidDiagram from './mermaid-diagram';
import { cn } from '@/lib/utils';
import { generateImageForSlideAction } from '@/app/actions'; // Import the new action
import { useToast } from '@/hooks/use-toast';

interface AiConceptExplainerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  explanation: ExplainConceptOutput | null;
  isLoading: boolean;
  onRegenerate?: () => void;
}

interface SlideWithImageState extends ExplanationSlide {
  isImageLoading?: boolean;
  imageError?: string | null;
}

export const AiConceptExplainer: React.FC<AiConceptExplainerProps> = ({
  isOpen,
  onOpenChange,
  explanation,
  isLoading,
  onRegenerate,
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [slidesWithImageState, setSlidesWithImageState] = useState<SlideWithImageState[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    setCurrentSlideIndex(0);
    if (explanation && explanation.slides) {
      setSlidesWithImageState(explanation.slides.map(slide => ({ ...slide, isImageLoading: false, imageError: null })));
    } else {
      setSlidesWithImageState([]);
    }
  }, [explanation, isOpen]);

  useEffect(() => {
    const currentFullSlide = slidesWithImageState[currentSlideIndex];
    if (currentFullSlide && currentFullSlide.imagePromptForGeneration && !currentFullSlide.generatedImageUrl && !currentFullSlide.isImageLoading && !currentFullSlide.imageError) {
      handleGenerateImageForSlide(currentSlideIndex, currentFullSlide.imagePromptForGeneration);
    }
  }, [currentSlideIndex, slidesWithImageState]); // Added slidesWithImageState to dependencies

  const handleGenerateImageForSlide = async (slideIndex: number, prompt: string) => {
    setSlidesWithImageState(prevSlides =>
      prevSlides.map((s, i) => (i === slideIndex ? { ...s, isImageLoading: true, imageError: null } : s))
    );

    try {
      const result = await generateImageForSlideAction({ prompt });
      if (result.error) {
        throw new Error(result.error);
      }
      if (result.generatedImageUrl) {
        setSlidesWithImageState(prevSlides =>
          prevSlides.map((s, i) => (i === slideIndex ? { ...s, generatedImageUrl: result.generatedImageUrl, isImageLoading: false } : s))
        );
        toast({ title: "Image Generated", description: `Image for slide "${slidesWithImageState[slideIndex]?.title || slideIndex + 1}" created.`});
      } else {
           throw new Error("AI did not return an image URL.");
      }
    } catch (error) {
      console.error("Image generation for slide failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Could not generate image.";
      setSlidesWithImageState(prevSlides =>
        prevSlides.map((s, i) => (i === slideIndex ? { ...s, isImageLoading: false, imageError: errorMessage } : s))
      );
      toast({ variant: "destructive", title: "Image Generation Failed", description: errorMessage });
    }
  };


  if (!isOpen) {
    return null;
  }

  const currentSlide = slidesWithImageState[currentSlideIndex];

  const goToNextSlide = () => {
    setCurrentSlideIndex((prevIndex) => Math.min(prevIndex + 1, slidesWithImageState.length - 1));
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
          ) : !explanation || slidesWithImageState.length === 0 || !currentSlide ? (
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

                {currentSlide.isImageLoading && (
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                    <p className="text-sm text-muted-foreground mt-2">Generating image...</p>
                  </div>
                )}

                {currentSlide.imageError && (
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t text-center text-destructive">
                    <p className="text-sm">Error generating image: {currentSlide.imageError}</p>
                  </div>
                )}
                
                {currentSlide.generatedImageUrl && !currentSlide.isImageLoading && (
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
                    <h4 className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 sm:mb-2">Generated Image:</h4>
                    <div className="relative w-full aspect-video rounded-md overflow-hidden border bg-background">
                       <Image src={currentSlide.generatedImageUrl} alt={`AI generated image for ${currentSlide.title || 'slide'}`} layout="fill" objectFit="contain" />
                    </div>
                  </div>
                )}

                {currentSlide.videoPlaceholderText && (
                    <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t flex items-start gap-2 text-muted-foreground">
                        <Video className="w-5 h-5 mt-0.5 text-primary flex-shrink-0"/>
                        <div>
                            <h4 className="text-xs sm:text-sm font-medium">Video Suggestion:</h4>
                            <p className="text-xs italic">{currentSlide.videoPlaceholderText}</p>
                        </div>
                    </div>
                )}

                {currentSlide.interactiveElementPlaceholderText && (
                    <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t flex items-start gap-2 text-muted-foreground">
                        <Zap className="w-5 h-5 mt-0.5 text-primary flex-shrink-0"/>
                        <div>
                            <h4 className="text-xs sm:text-sm font-medium">Interactive Suggestion:</h4>
                            <p className="text-xs italic">{currentSlide.interactiveElementPlaceholderText}</p>
                        </div>
                    </div>
                )}

              </ScrollArea>
            </div>
          )}
        </div>

        {!isLoading && slidesWithImageState.length > 0 && (
          <DialogFooter className="p-4 sm:p-6 border-t flex-shrink-0 flex flex-row justify-between items-center w-full">
            <div className="text-xs sm:text-sm text-muted-foreground">
              Slide {currentSlideIndex + 1} of {slidesWithImageState.length}
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
                disabled={currentSlideIndex === slidesWithImageState.length - 1}
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
