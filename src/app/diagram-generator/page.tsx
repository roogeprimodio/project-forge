// src/app/diagram-generator/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Wand2, GitGraph, BrainCircuit, ZoomIn, ZoomOut, RotateCcw, Edit3, Save, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateDiagramAction } from '@/app/actions';
import type { GenerateDiagramMermaidInput } from '@/ai/flows/generate-diagram-mermaid';
import MermaidDiagram from '@/components/mermaid-diagram';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Slider } from '@/components/ui/slider';

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

  const [zoomLevel, setZoomLevel] = useState(1);
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [editableCode, setEditableCode] = useState('');

  useEffect(() => {
    if (generatedCode) {
      setEditableCode(generatedCode);
    }
  }, [generatedCode]);

  const handleGenerateDiagram = async () => {
    if (!description.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please provide a description for the diagram.' });
      return;
    }
    setIsGenerating(true);
    setGeneratedCode(null); // Clear previous diagram
    setEditableCode('');   // Clear editable code
    setZoomLevel(1);       // Reset zoom

    try {
      const result = await generateDiagramAction({
        description: description,
        diagramTypeHint: diagramType,
      });

      if ('error' in result) {
        throw new Error(result.error);
      }

      setGeneratedCode(result.mermaidCode);
      setEditableCode(result.mermaidCode); // Initialize editable code
      toast({ title: 'Diagram Generated', description: 'Mermaid code created successfully.' });

    } catch (error) {
      console.error("Diagram generation failed:", error);
      toast({ variant: 'destructive', title: 'Generation Failed', description: error instanceof Error ? error.message : 'Could not generate diagram code.' });
      setGeneratedCode(null);
      setEditableCode('');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveDiagram = () => {
    if (!generatedCode) {
        toast({ variant: 'destructive', title: 'Nothing to save', description: 'Generate a diagram first.' });
        return;
    }
    // Placeholder for save functionality
    console.log("Saving diagram:", generatedCode);
    toast({ title: 'Diagram Saved (Placeholder)', description: 'Save functionality to be implemented.' });
  };

  const handleUpdateDiagramFromEdit = () => {
    if (editableCode.trim()) {
      setGeneratedCode(editableCode);
      toast({ title: 'Diagram Updated', description: 'Diagram preview updated with your code.' });
    } else {
      toast({ variant: 'destructive', title: 'Empty Code', description: 'Cannot render an empty diagram.'});
    }
    setIsEditingCode(false);
  };

  const handleCopyCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode)
        .then(() => toast({ title: 'Code Copied!', description: 'Mermaid code copied to clipboard.' }))
        .catch(err => toast({ variant: 'destructive', title: 'Copy Failed', description: 'Could not copy code.' }));
    }
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
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 md:mb-4 gap-2">
                <h3 className="text-xl md:text-2xl font-semibold text-primary">Generated Diagram Preview</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => setZoomLevel(prev => Math.max(0.2, prev - 0.2))} title="Zoom Out"> <ZoomOut className="mr-1 h-4 w-4" /> <span className="hidden sm:inline">Out</span> </Button>
                  <Slider
                    value={[zoomLevel]}
                    min={0.2}
                    max={3}
                    step={0.1}
                    onValueChange={(value) => setZoomLevel(value[0])}
                    className="w-24 sm:w-32"
                    aria-label="Zoom slider"
                  />
                  <Button variant="outline" size="sm" onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.2))} title="Zoom In"> <ZoomIn className="mr-1 h-4 w-4" /> <span className="hidden sm:inline">In</span> </Button>
                  <Button variant="outline" size="sm" onClick={() => setZoomLevel(1)} title="Reset Zoom"> <RotateCcw className="mr-1 h-4 w-4" /> <span className="hidden sm:inline">Reset</span> </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsEditingCode(true)} title="Edit Code"> <Edit3 className="mr-1 h-4 w-4" /> <span className="hidden sm:inline">Edit</span> </Button>
                  <Button variant="outline" size="sm" onClick={handleCopyCode} title="Copy Code"> <Copy className="mr-1 h-4 w-4" /> <span className="hidden sm:inline">Copy</span> </Button>
                </div>
              </div>
              <ScrollArea className="h-[400px] sm:h-[500px] md:h-[600px] w-full border rounded-lg bg-card overflow-auto">
                 {/* This inner div handles the zooming transformation */}
                <div
                  style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left', width: `${100/zoomLevel}%`, height: `${100/zoomLevel}%` }}
                  className="transition-transform duration-200 ease-in-out p-2 md:p-4" // Added padding to allow space for zoom
                >
                  <MermaidDiagram chart={generatedCode} id="diagram-generator-preview" />
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground mt-2">Use mouse wheel or trackpad to scroll within the preview area. Use zoom buttons for scaling.</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t pt-4 md:pt-6">
            {generatedCode && (
                 <Button variant="outline" onClick={handleSaveDiagram} className="text-sm md:text-base">
                    <Save className="mr-2 h-4 w-4" /> Save Diagram (Placeholder)
                 </Button>
            )}
        </CardFooter>
      </Card>

      {/* Edit Code Dialog */}
      <Dialog open={isEditingCode} onOpenChange={setIsEditingCode}>
        <DialogContent className="sm:max-w-[700px] md:max-w-[800px] lg:max-w-[900px] h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Mermaid Code</DialogTitle>
            <DialogDescription>
              Modify the Mermaid code below and click "Update Diagram" to see changes.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 flex-grow">
            <Textarea
              value={editableCode}
              onChange={(e) => setEditableCode(e.target.value)}
              placeholder="Enter Mermaid diagram code here..."
              className="w-full h-full min-h-[300px] font-mono text-xs sm:text-sm resize-none focus-visible:glow-primary"
            />
          </div>
          <DialogFooter className="mt-auto pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="button" onClick={handleUpdateDiagramFromEdit} className="hover:glow-primary focus-visible:glow-primary">
              <Edit3 className="mr-2 h-4 w-4"/> Update Diagram
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
