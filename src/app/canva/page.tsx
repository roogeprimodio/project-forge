// src/app/canva/page.tsx
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Added for potential use in sidebar
import { ScrollArea } from '@/components/ui/scroll-area';
import { Paintbrush, Save, Download, Wand2, StickyNote, Undo, Redo, Palette, PlusCircle } from 'lucide-react';

// Define Canvas Types
type CanvasType = 'aeiou' | 'empathy' | 'ideation' | 'product_dev' | 'none';

const canvasTemplates: { value: CanvasType; label: string }[] = [
  { value: 'aeiou', label: 'AEIOU Canvas' },
  { value: 'empathy', label: 'Empathy Canvas' },
  { value: 'ideation', label: 'Ideation Canvas' },
  { value: 'product_dev', label: 'Product Development Canvas' },
];

// Simple Placeholder Sticky Note Component
const StickyNotePlaceholder = ({ color = 'bg-yellow-200', text = 'Edit me...' }: { color?: string; text?: string }) => (
    <div className={`absolute w-24 h-24 ${color} p-2 shadow-md rounded text-sm text-black cursor-grab active:cursor-grabbing border border-gray-400/50`}>
        <textarea
            className="w-full h-full bg-transparent border-none resize-none outline-none text-xs"
            defaultValue={text}
        />
    </div>
);

// Placeholder for Canvas Backgrounds
const CanvasBackground = ({ type }: { type: CanvasType }) => {
    const getGridStyle = () => {
        switch (type) {
            case 'aeiou':
                return { gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr', height: '400px' };
            case 'empathy':
                return { gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr 1fr', height: '600px' };
            case 'ideation':
                return { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', height: '400px' };
            case 'product_dev': // Assuming a simple 2x2 grid for placeholder
                return { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', height: '400px' };
            default:
                return {};
        }
    };

    const getZones = () => {
        switch (type) {
            case 'aeiou':
                return ['Activities', 'Environments', 'Users', 'Interactions', 'Objects', '']; // Empty for 3x2 grid
            case 'empathy':
                return ['SAY', 'DO', '', 'THINK', 'FEEL', '', 'Pain', 'Gain', '']; // 3x3 layout
            case 'ideation':
                return ['People', 'Activities', 'Situations / Contexts', 'Props / Tools']; // 2x2 layout
            case 'product_dev':
                 return ['Features', 'User Needs', 'Metrics', 'Risks']; // 2x2 Placeholder
            default:
                return [];
        }
    };

    if (type === 'none') {
        return <p className="text-muted-foreground">Select a canvas template from the dropdown.</p>;
    }

    return (
        <div className="relative w-full border-2 border-dashed border-border rounded-lg p-4 bg-muted/10 min-h-[400px] overflow-auto">
             <h3 className="text-center font-semibold text-lg mb-4 text-primary">{canvasTemplates.find(t => t.value === type)?.label}</h3>
             <div className="grid gap-2" style={getGridStyle()}>
                {getZones().map((zone, index) => (
                     <div key={index} className={`border border-border/50 p-2 flex items-center justify-center text-xs text-muted-foreground bg-background ${zone ? '' : 'invisible'}`}>
                        {zone}
                    </div>
                ))}
             </div>
             {/* Placeholder sticky notes - Implement drag/drop later */}
             {type !== 'none' && (
                <>
                    <StickyNotePlaceholder color="bg-yellow-200" text="Example Note 1..." />
                    <StickyNotePlaceholder color="bg-pink-200" text="Another idea..." />
                </>
             )}
            <p className="text-xs text-muted-foreground absolute bottom-2 right-2">(Canvas Area - Drag & Drop Sticky Notes Here - Placeholder)</p>
        </div>
    );
};


export default function CanvaPage() {
  const [selectedCanvas, setSelectedCanvas] = useState<CanvasType>('none');
  // Add state for notes, positions, colors etc. later

  const handleSave = () => { console.log('Save clicked'); /* Implement save logic */ };
  const handleExport = () => { console.log('Export clicked'); /* Implement export logic */ };
  const handleAiSuggest = () => { console.log('AI Suggest clicked'); /* Implement AI suggestion logic */ };
  const handleAddNote = () => { console.log('Add Note clicked'); /* Implement add note logic */ };
  const handleChangeColor = (color: string) => { console.log('Change Color to:', color); /* Implement color change */ };
  const handleUndo = () => { console.log('Undo clicked'); /* Implement undo */ };
  const handleRedo = () => { console.log('Redo clicked'); /* Implement redo */ };

  return (
    <div className="flex h-[calc(100vh-var(--header-height,60px))]"> {/* Full height minus header */}
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
         {/* Header */}
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-4 lg:px-6 flex-shrink-0">
          <Paintbrush className="h-5 w-5 text-primary" />
          <h1 className="flex-1 text-lg font-semibold md:text-xl text-primary truncate text-glow-primary">
             Canvas Editor
          </h1>
          <Select
            value={selectedCanvas}
            onValueChange={(value: CanvasType) => setSelectedCanvas(value)}
          >
            <SelectTrigger className="w-[200px] ml-auto">
              <SelectValue placeholder="Select Canvas Type" />
            </SelectTrigger>
            <SelectContent>
              {canvasTemplates.map((template) => (
                <SelectItem key={template.value} value={template.value}>
                  {template.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleSave}><Save className="mr-2 h-4 w-4" /> Save</Button>
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="mr-2 h-4 w-4" /> Export</Button>
          <Button variant="outline" size="sm" onClick={handleAiSuggest} className="hover:glow-accent focus-visible:glow-accent">
            <Wand2 className="mr-2 h-4 w-4" /> AI Suggest
          </Button>
        </header>

        {/* Canvas Area */}
        <ScrollArea className="flex-1 p-4 md:p-6 bg-muted/20"> {/* Make canvas area scrollable */}
           {/* TODO: Add InteractiveViewer or similar for zoom/pan */}
           <div className="relative w-full h-full"> {/* Container for positioning */}
             <CanvasBackground type={selectedCanvas} />
           </div>
        </ScrollArea>
      </div>

      {/* Sidebar */}
      <aside className="w-64 border-l bg-card p-4 flex flex-col gap-4 flex-shrink-0 overflow-y-auto">
        <h3 className="text-lg font-semibold text-primary">Tools</h3>
        <Button onClick={handleAddNote} className="w-full justify-start hover:glow-primary">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Sticky Note
        </Button>

        <div className="space-y-2">
            <label className="text-sm font-medium">Note Color</label>
            <div className="flex gap-2">
                <Button size="icon" className="h-8 w-8 bg-yellow-200 hover:bg-yellow-300 border border-gray-400/50" onClick={() => handleChangeColor('yellow')} aria-label="Set color to yellow"></Button>
                <Button size="icon" className="h-8 w-8 bg-pink-200 hover:bg-pink-300 border border-gray-400/50" onClick={() => handleChangeColor('pink')} aria-label="Set color to pink"></Button>
                <Button size="icon" className="h-8 w-8 bg-blue-200 hover:bg-blue-300 border border-gray-400/50" onClick={() => handleChangeColor('blue')} aria-label="Set color to blue"></Button>
                <Button size="icon" className="h-8 w-8 bg-green-200 hover:bg-green-300 border border-gray-400/50" onClick={() => handleChangeColor('green')} aria-label="Set color to green"></Button>
                 {/* Add custom color picker later */}
                 <Button size="icon" variant="outline" className="h-8 w-8" title="More colors (coming soon)"><Palette className="h-4 w-4" /></Button>
            </div>
        </div>

        <div className="flex gap-2 mt-auto"> {/* Place undo/redo at bottom */}
            <Button variant="outline" size="icon" onClick={handleUndo} aria-label="Undo">
                <Undo className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleRedo} aria-label="Redo">
                <Redo className="h-4 w-4" />
            </Button>
        </div>
         <p className="text-xs text-muted-foreground text-center mt-2">Note: Full canvas functionality (drag, zoom, AI) is pending implementation.</p>
      </aside>
    </div>
  );
}
