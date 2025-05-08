// src/app/ai-tools/concept-explainer/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, BookOpen, Wand2, RotateCcw, Eye, Trash2, Archive } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { explainConceptAction } from '@/app/actions';
import type { ExplainConceptInput, ExplainConceptOutput } from '@/types/project';
import { AiConceptExplainer } from '@/components/ai-concept-explainer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from "@/components/ui/alert-dialog";

export default function AiConceptExplainerPage() {
  const [conceptInput, setConceptInput] = useState('');
  const [complexityLevel, setComplexityLevel] = useState<ExplainConceptInput['complexityLevel']>('simple');
  
  const [explanationResult, setExplanationResult] = useLocalStorage<ExplainConceptOutput | null>('lastConceptExplanation', null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const [currentModalContent, setCurrentModalContent] = useState<ExplainConceptOutput | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);


  const handleExplainConcept = async (conceptToExplain: string) => {
    if (!conceptToExplain.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a concept to explain.' });
      return;
    }
    setIsGenerating(true);
    setCurrentModalContent(null); // Clear current modal content
    try {
      const result = await explainConceptAction({
        concept: conceptToExplain,
        complexityLevel: complexityLevel,
      });

      if (result && 'error' in result) {
        throw new Error(result.error);
      }
      const outputResult = result as ExplainConceptOutput;
      setExplanationResult(outputResult); // Save to local storage
      setCurrentModalContent(outputResult); // Set for current modal view
      setIsModalOpen(true);
    } catch (error) {
      console.error("Concept explanation failed:", error);
      toast({ variant: 'destructive', title: 'Explanation Failed', description: error instanceof Error ? error.message : 'Could not explain the concept.' });
      const errorOutput = { conceptTitle: conceptToExplain, slides: [{ title: "Error", content: `Failed to explain "${conceptToExplain}".`}] };
      setCurrentModalContent(errorOutput); 
      setExplanationResult(errorOutput); // Optionally store error state too or clear
      setIsModalOpen(true); 
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateFromModal = () => {
    let conceptForRegeneration = conceptInput.trim(); 
    if (!conceptForRegeneration && currentModalContent?.conceptTitle) {
        conceptForRegeneration = currentModalContent.conceptTitle; 
        setConceptInput(conceptForRegeneration); 
    }

    if (conceptForRegeneration) {
        handleExplainConcept(conceptForRegeneration);
    } else {
        toast({ variant: 'destructive', title: 'Cannot Regenerate', description: 'No concept to regenerate. Please enter a concept.'});
    }
  };

  const handleViewStoredExplanation = () => {
    if (explanationResult) {
      setCurrentModalContent(explanationResult);
      setIsModalOpen(true);
    } else {
      toast({ title: "No Stored Explanation", description: "There is no previously explained concept stored." });
    }
  };

  const handleDeleteStoredExplanation = () => {
    setExplanationResult(null); // Clears from localStorage
    toast({ title: "Stored Explanation Deleted", description: "The previously explained concept has been removed from history." });
    setShowDeleteConfirm(false); // Close confirmation dialog
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
          
          <Button onClick={() => handleExplainConcept(conceptInput)} disabled={isGenerating} className="w-full md:w-auto hover:glow-primary focus-visible:glow-primary text-sm md:text-base py-2.5 md:py-3">
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 md:h-5 md:w-5 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4 md:h-5 md:w-5" />}
            {isGenerating ? 'Explaining...' : 'Explain Concept'}
          </Button>
        </CardContent>
        <CardFooter>
            <p className="text-xs text-muted-foreground">AI explanations are for informational purposes and may require verification. Images are AI-generated.</p>
        </CardFooter>
      </Card>

      {explanationResult && (
        <Card className="max-w-2xl mx-auto shadow-lg mt-8">
          <CardHeader>
             <div className="flex items-center gap-2">
                <Archive className="h-6 w-6 text-primary/80" />
                <CardTitle className="text-xl font-semibold text-primary">
                  Last Explained: {explanationResult.conceptTitle}
                </CardTitle>
            </div>
            <CardDescription className="text-sm">
              You can view or delete this stored explanation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Optionally, show a snippet of the explanation or number of slides */}
            <p className="text-sm text-muted-foreground">
              {explanationResult.slides.length > 0 
                ? `This explanation has ${explanationResult.slides.length} slide(s).`
                : "This explanation seems to be empty or an error occurred."}
            </p>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleViewStoredExplanation} size="sm">
              <Eye className="mr-2 h-4 w-4" /> View Explanation
            </Button>
             <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete from History
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action will permanently delete the stored explanation for "{explanationResult.conceptTitle}" from your local history. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteStoredExplanation}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </Card>
      )}

      <AiConceptExplainer
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        explanation={currentModalContent} // Pass current modal content here
        isLoading={isGenerating} // This reflects the initial generation
        onRegenerate={handleRegenerateFromModal}
      />
    </div>
  );
}