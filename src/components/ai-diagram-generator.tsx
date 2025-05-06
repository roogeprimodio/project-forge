// src/components/ai-diagram-generator.tsx
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Wand2, BrainCircuit } from 'lucide-react'; // Added BrainCircuit
import { useToast } from '@/hooks/use-toast';
import { generateDiagramAction } from '@/app/actions';
import type { GenerateDiagramMermaidInput } from '@/ai/flows/generate-diagram-mermaid';
import MermaidDiagram from './mermaid-diagram';
import { ScrollArea } from '@/components/ui/scroll-area'; // Added ScrollArea

interface AiDiagramGeneratorProps {
  onDiagramGenerated?: (mermaidCode: string) => void; // Make optional if used in standalone page
  initialDescription?: string;
  initialType?: GenerateDiagramMermaidInput['diagramTypeHint'];
}

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

const AiDiagramGenerator: React.FC<AiDiagramGeneratorProps> = ({
  onDiagramGenerated,
  initialDescription = '',
  initialType = 'flowchart'
}) => {
  const [description, setDescription] = useState(initialDescription);
  const [diagramType, setDiagramType] = useState<GenerateDiagramMermaidInput['diagramTypeHint']>(initialType);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
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
      if (onDiagramGenerated) { // Call callback only if provided
        onDiagramGenerated(result.mermaidCode);
      }
      toast({ title: 'Diagram Generated', description: 'Mermaid code created successfully.' });

    } catch (error) {
      console.error("Diagram generation failed:", error);
      toast({ variant: 'destructive', title: 'Generation Failed', description: error instanceof Error ? error.message : 'Could not generate diagram code.' });
      setGeneratedCode(null);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="diagram-description-ai" className="text-sm font-medium">
            Diagram Description
          </Label>
          <Textarea
            id="diagram-description-ai"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., 'Flowchart for user signup', 'Sequence diagram of API login', 'Class diagram for User and Order'. Be specific for better results."
            className="min-h-[100px] md:min-h-[120px] text-sm"
            rows={4}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="diagram-type-ai" className="text-sm font-medium">
            Diagram Type (Hint)
          </Label>
          <Select
             value={diagramType}
             onValueChange={(value: string) => setDiagramType(value as GenerateDiagramMermaidInput['diagramTypeHint'])}
          >
            <SelectTrigger id="diagram-type-ai" className="h-10 text-sm">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {diagramTypes.map((type) => (
                <SelectItem key={type} value={type} className="text-sm">
                  {type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button onClick={handleGenerate} disabled={isGenerating} className="w-full sm:w-auto hover:glow-primary focus-visible:glow-primary text-sm py-2.5">
        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
        {isGenerating ? 'Generating Diagram...' : 'Generate Diagram with AI'}
      </Button>

      {generatedCode !== null && (
        <div className="mt-6 pt-4 border-t">
          <h4 className="text-lg font-semibold mb-2 text-primary">Generated Diagram Preview:</h4>
          <ScrollArea className="max-h-[400px] md:max-h-[500px] w-full border rounded-lg p-2 bg-card">
            <MermaidDiagram chart={generatedCode} id="ai-diagram-preview" />
          </ScrollArea>
           <details className="mt-2 text-xs">
             <summary className="cursor-pointer text-muted-foreground hover:text-primary">Show Mermaid Code</summary>
             <ScrollArea className="max-h-32 mt-1">
                <pre className="p-2 bg-muted rounded-md text-muted-foreground overflow-x-auto text-[10px]">
                    <code>{generatedCode}</code>
                </pre>
             </ScrollArea>
           </details>
        </div>
      )}
    </div>
  );
};

export default AiDiagramGenerator;
