// src/app/ai-tools/concept-explainer/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, BookOpen, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { explainConceptAction } from '@/app/actions';
import type { ExplainConceptInput, ExplainConceptOutput } from '@/types/project';
import { AiConceptExplainer } from '@/components/ai-concept-explainer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocalStorage } from '@/hooks/use-local-storage'; // Import useLocalStorage

export default function AiConceptExplainerPage() {
  const [conceptInput, setConceptInput] = useState('');
  const [complexityLevel, setComplexityLevel] = useState<ExplainConceptInput['complexityLevel']>('simple');
  const [maxSlides, setMaxSlides] = useState<number>(5);
  
  // Use useLocalStorage for explanationResult
  const [explanationResult, setExplanationResult] = useLocalStorage<ExplainConceptOutput | null>('lastConceptExplanation', null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  // Effect to potentially open modal if there's a stored explanation from a previous session
  // This might not be desired UX, but demonstrates local storage loading.
  // Typically, user would still initiate an action.
  useEffect(() => {
    if (explanationResult && explanationResult.slides.length > 0 && !isGenerating) {
      // setIsModalOpen(true); // Decide if you want to auto-open on load
    }
  }, [explanationResult, isGenerating]);


  const handleExplainConcept = async () => {
    if (!conceptInput.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a concept to explain.' });
      return;
    }
    setIsGenerating(true);
    // Do not clear explanationResult immediately if you want to show the old one while loading
    // setExplanationResult(null); // Clears previous result from local storage and state before new fetch
    try {
      const result = await explainConceptAction({
        concept: conceptInput,
        complexityLevel: complexityLevel,
        maxSlides: maxSlides,
      });

      if (result && 'error' in result) {
        throw new Error(result.error);
      }
      setExplanationResult(result as ExplainConceptOutput); // This will save to local storage
      setIsModalOpen(true);
    } catch (error) {
      console.error("Concept explanation failed:", error);
      toast({ variant: 'destructive', title: 'Explanation Failed', description: error instanceof Error ? error.message : 'Could not explain the concept.' });
      setExplanationResult({ conceptTitle: conceptInput, slides: [{ title: "Error", content: `Failed to explain "${conceptInput}".`}] });
      setIsModalOpen(true); 
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateFromModal = () => {
    if(conceptInput) {
        handleExplainConcept();
    } else if (explanationResult?.conceptTitle) {
        // If no current input, but there was a previous explanation, re-explain that.
        setConceptInput(explanationResult.conceptTitle); // Set input to previous concept
        handleExplainConcept();
    } else {
        toast({ variant: 'destructive', title: 'Cannot Regenerate', description: 'No concept to regenerate. Please enter a concept.'});
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="max-w-2xl mx-auto shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" />
            <CardTitle className="text-2xl md:text-3xl font-bold text-primary text-glow-primary">
              AI Concept Explainer
            </CardTitle>
          </div>
          <CardDescription className="text-sm md:text-base">
            Enter a concept, term, or phrase, and the AI will break it down into easy-to-understand slides with visuals.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="concept-input" className="text-base font-medium">
              Concept to Explain
            </Label>
            <Input
              id="concept-input"
              value={conceptInput}
              onChange={(e) => setConceptInput(e.target.value)}
              placeholder="e.g., 'Machine Learning', 'Quantum Entanglement', 'Photosynthesis'"
              className="h-10 md:h-11 text-sm md:text-base focus-visible:glow-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="complexity-select">Complexity Level</Label>
                <Select value={complexityLevel} onValueChange={(value: ExplainConceptInput['complexityLevel']) => setComplexityLevel(value)}>
                    <SelectTrigger id="complexity-select" className="h-10 md:h-11">
                        <SelectValue placeholder="Select complexity" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="simple">Simple</SelectItem>
                        <SelectItem value="detailed">Detailed</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="max-slides-input">Max Slides (1-10)</Label>
                <Input
                    id="max-slides-input"
                    type="number"
                    value={maxSlides}
                    onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if(val >= 1 && val <=10) setMaxSlides(val);
                        else if (e.target.value === "") setMaxSlides(1);
                    }}
                    min="1"
                    max="10"
                    className="h-10 md:h-11"
                />
            </div>
          </div>

          <Button onClick={handleExplainConcept} disabled={isGenerating} className="w-full md:w-auto hover:glow-primary focus-visible:glow-primary text-sm md:text-base py-2.5 md:py-3">
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 md:h-5 md:w-5 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4 md:h-5 md:w-5" />}
            {isGenerating ? 'Explaining...' : 'Explain Concept'}
          </Button>
        </CardContent>
        <CardFooter>
            <p className="text-xs text-muted-foreground">AI explanations are for informational purposes and may require verification. Images are AI-generated.</p>
        </CardFooter>
      </Card>

      <AiConceptExplainer
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        explanation={explanationResult}
        isLoading={isGenerating}
        onRegenerate={handleRegenerateFromModal}
      />
    </div>
  );
}
