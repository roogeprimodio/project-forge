// src/app/ai-tools/concept-explainer/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, BookOpen, Wand2, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { explainConceptAction } from '@/app/actions';
import type { ExplainConceptInput, ExplainConceptOutput } from '@/types/project';
import { AiConceptExplainer } from '@/components/ai-concept-explainer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocalStorage } from '@/hooks/use-local-storage';

export default function AiConceptExplainerPage() {
  const [conceptInput, setConceptInput] = useState('');
  const [complexityLevel, setComplexityLevel] = useState<ExplainConceptInput['complexityLevel']>('simple');
  // maxSlides state removed
  
  const [explanationResult, setExplanationResult] = useLocalStorage<ExplainConceptOutput | null>('lastConceptExplanation', null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  // Effect to potentially open modal if there's a stored explanation from a previous session
  useEffect(() => {
    if (explanationResult && explanationResult.slides.length > 0 && !isGenerating && explanationResult.conceptTitle === conceptInput) {
       // Only auto-open if the current input matches the stored concept, preventing opening unrelated old explanations.
      // setIsModalOpen(true); // User can decide if this UX is desired
    }
  }, [explanationResult, isGenerating, conceptInput]);


  const handleExplainConcept = async (conceptToExplain: string) => {
    if (!conceptToExplain.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a concept to explain.' });
      return;
    }
    setIsGenerating(true);
    // Optional: Clear previous result if you want to start fresh before new fetch
    // setExplanationResult(null); 
    try {
      const result = await explainConceptAction({
        concept: conceptToExplain,
        complexityLevel: complexityLevel,
        // maxSlides removed from input
      });

      if (result && 'error' in result) {
        throw new Error(result.error);
      }
      setExplanationResult(result as ExplainConceptOutput);
      setIsModalOpen(true);
    } catch (error) {
      console.error("Concept explanation failed:", error);
      toast({ variant: 'destructive', title: 'Explanation Failed', description: error instanceof Error ? error.message : 'Could not explain the concept.' });
      setExplanationResult({ conceptTitle: conceptToExplain, slides: [{ title: "Error", content: `Failed to explain "${conceptToExplain}".`}] });
      setIsModalOpen(true); 
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateFromModal = () => {
    let conceptForRegeneration = conceptInput.trim(); // Prioritize current input
    if (!conceptForRegeneration && explanationResult?.conceptTitle) {
        conceptForRegeneration = explanationResult.conceptTitle; // Fallback to last explained concept
        setConceptInput(conceptForRegeneration); // Update input field if using fallback
    }

    if (conceptForRegeneration) {
        handleExplainConcept(conceptForRegeneration);
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
              onKeyDown={(e) => { if (e.key === 'Enter') handleExplainConcept(conceptInput); }}
            />
          </div>

          <div className="space-y-2"> {/* Changed from grid to simple stack as maxSlides is removed */}
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
          {/* Max Slides input removed */}

          <Button onClick={() => handleExplainConcept(conceptInput)} disabled={isGenerating} className="w-full md:w-auto hover:glow-primary focus-visible:glow-primary text-sm md:text-base py-2.5 md:py-3">
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
