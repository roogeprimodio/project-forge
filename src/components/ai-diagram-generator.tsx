// src/components/ai-diagram-generator.tsx
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateDiagramAction } from '@/app/actions'; // Import the server action
import type { GenerateDiagramMermaidInput } from '@/ai/flows/generate-diagram-mermaid';
import MermaidDiagram from './mermaid-diagram'; // Import the diagram renderer

interface AiDiagramGeneratorProps {
  onDiagramGenerated: (mermaidCode: string) => void; // Callback to pass generated code up
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

const AiDiagramGenerator: React.FC<AiDiagramGeneratorProps> = ({ onDiagramGenerated }) => {
  const [description, setDescription] = useState('');
  const [diagramType, setDiagramType] = useState<GenerateDiagramMermaidInput['diagramTypeHint']>('flowchart');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please provide a description for the diagram.' });
      return;
    }
    setIsGenerating(true);
    setGeneratedCode(null); // Clear previous diagram

    try {
      const result = await generateDiagramAction({
        description: description,
        diagramTypeHint: diagramType,
      });

      if ('error' in result) {
        throw new Error(result.error);
      }

      setGeneratedCode(result.mermaidCode);
      onDiagramGenerated(result.mermaidCode); // Pass code up
      toast({ title: 'Diagram Generated', description: 'Mermaid code created successfully.' });

    } catch (error) {
      console.error("Diagram generation failed:", error);
      toast({ variant: 'destructive', title: 'Generation Failed', description: error instanceof Error ? error.message : 'Could not generate diagram code.' });
      setGeneratedCode(null); // Clear code on error
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="diagram-description">Diagram Description</Label>
          <Textarea
            id="diagram-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the diagram you want (e.g., 'Flowchart for user signup', 'Sequence diagram of API login', 'Class diagram for User and Order')..."
            className="min-h-[100px]"
            rows={4}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="diagram-type">Diagram Type (Hint)</Label>
          <Select
             value={diagramType}
             // The type assertion is needed because Radix Select's onValueChange provides a string
             onValueChange={(value: string) => setDiagramType(value as GenerateDiagramMermaidInput['diagramTypeHint'])}
          >
            <SelectTrigger id="diagram-type">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {diagramTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {/* Simple capitalization for display */}
                  {type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button onClick={handleGenerate} disabled={isGenerating} className="hover:glow-primary focus-visible:glow-primary">
        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
        {isGenerating ? 'Generating Diagram...' : 'Generate Diagram with AI'}
      </Button>

      {/* Render the generated diagram */}
      {generatedCode !== null && (
        <div className="mt-6">
          <h4 className="text-lg font-semibold mb-2">Generated Diagram Preview:</h4>
          <MermaidDiagram chart={generatedCode} />
           {/* Optionally show the code */}
           <details className="mt-2 text-xs">
             <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Show Mermaid Code</summary>
             <pre className="mt-1 p-2 bg-muted rounded-md text-muted-foreground overflow-x-auto">
               <code>{generatedCode}</code>
             </pre>
           </details>
        </div>
      )}
    </div>
  );
};

export default AiDiagramGenerator;
