// src/app/diagram-generator/page.tsx
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Wand2, GitGraph, BrainCircuit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateDiagramAction } from '@/app/actions';
import type { GenerateDiagramMermaidInput } from '@/ai/flows/generate-diagram-mermaid';
import MermaidDiagram from '@/components/mermaid-diagram';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

const diagramTypes: GenerateDiagramMermaidInput['diagramTypeHint'][] = [
  'flowchart',
  'sequenceDiagram',
  'classDiagram',
  'stateDiagram',
  'erDiagram',
  'gantt',
  'pie',
  'mindmap',
  'other'
];

export default function DiagramGeneratorPage() {
  const [description, setDescription] = useState('');
  const [diagramType, setDiagramType] = useState<GenerateDiagramMermaidInput['diagramTypeHint']>('flowchart');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerateDiagram = async () => {
    if (!description.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please provide a description for the diagram.' });
      return;
    }
    setIsGenerating(true);
    setGeneratedCode(null);

    try {
      const result = await generateDiagramAction({
        description: description,
        diagramTypeHint: diagramType,
      });

      if ('error' in result) {
        throw new Error(result.error);
      }

      setGeneratedCode(result.mermaidCode);
      toast({ title: 'Diagram Generated', description: 'Mermaid code created successfully.' });

    } catch (error) {
      console.error("Diagram generation failed:", error);
      toast({ variant: 'destructive', title: 'Generation Failed', description: error instanceof Error ? error.message : 'Could not generate diagram code.' });
      setGeneratedCode(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveDiagram = () => {
    if (!generatedCode) {
        toast({ variant: 'destructive', title: 'Nothing to save', description: 'Generate a diagram first.' });
        return;
    }
    // Placeholder for save functionality (e.g., save to local storage, project, or download)
    console.log("Saving diagram:", generatedCode);
    toast({ title: 'Diagram Saved (Placeholder)', description: 'Save functionality to be implemented.' });
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GitGraph className="h-7 w-7 text-primary" />
            <CardTitle className="text-2xl md:text-3xl font-bold text-primary text-glow-primary">
              AI Diagram Generator
            </CardTitle>
          </div>
          <CardDescription className="text-sm md:text-base">
            Describe the diagram you want to create, and the AI will generate it using Mermaid syntax.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 items-start">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="diagram-description" className="text-base font-medium">
                Diagram Description
              </Label>
              <Textarea
                id="diagram-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., 'A flowchart for user login process including email/password input, validation, and success/failure paths.'
Or 'Sequence diagram showing API call from client to server, then to database, and back.'
Or 'Class diagram for an e-commerce system with User, Product, and Order classes.'"
                className="min-h-[120px] md:min-h-[150px] text-sm md:text-base focus-visible:glow-primary"
                rows={5}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="diagram-type" className="text-base font-medium">Diagram Type (Hint)</Label>
              <Select
                value={diagramType}
                onValueChange={(value: string) => setDiagramType(value as GenerateDiagramMermaidInput['diagramTypeHint'])}
              >
                <SelectTrigger id="diagram-type" className="h-10 md:h-11 text-sm md:text-base">
                  <SelectValue placeholder="Select type hint" />
                </SelectTrigger>
                <SelectContent>
                  {diagramTypes.map((type) => (
                    <SelectItem key={type} value={type} className="text-sm md:text-base">
                      {type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
               <p className="text-xs text-muted-foreground">Helps AI choose the best diagram format.</p>
            </div>
          </div>

          <Button onClick={handleGenerateDiagram} disabled={isGenerating} className="w-full md:w-auto hover:glow-primary focus-visible:glow-primary text-sm md:text-base py-2.5 md:py-3">
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 md:h-5 md:w-5 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4 md:h-5 md:w-5" />}
            {isGenerating ? 'Generating Diagram...' : 'Generate with AI'}
          </Button>

          {generatedCode !== null && (
            <div className="mt-6 md:mt-8 pt-6 border-t">
              <h3 className="text-xl md:text-2xl font-semibold mb-3 md:mb-4 text-primary">Generated Diagram Preview</h3>
              <ScrollArea className="max-h-[500px] md:max-h-[600px] w-full border rounded-lg p-2 md:p-4 bg-card">
                <MermaidDiagram chart={generatedCode} id="diagram-generator-preview" />
              </ScrollArea>
              <details className="mt-3 text-xs md:text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-primary">
                  Show Mermaid Code
                </summary>
                <ScrollArea className="max-h-48 mt-1">
                <pre className="mt-1 p-2 md:p-3 bg-muted rounded-md text-muted-foreground overflow-x-auto text-[10px] md:text-xs">
                  <code>{generatedCode}</code>
                </pre>
                </ScrollArea>
              </details>
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t pt-4 md:pt-6">
            {generatedCode && (
                 <Button variant="outline" onClick={handleSaveDiagram} className="text-sm md:text-base">
                    Save Diagram (Placeholder)
                 </Button>
            )}
        </CardFooter>
      </Card>
    </div>
  );
}
