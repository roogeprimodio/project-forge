// src/app/canva/page.tsx
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Added for potential use in sidebar
import { ScrollArea } from '@/components/ui/scroll-area';
import { Paintbrush, Save, Download, Wand2, StickyNote, Undo, Redo, Palette, PlusCircle } from 'lucide-react';

// Define Canvas Types - Updated based on JSON IDs
type CanvasType =
  | 'aeiou_canvas'
  | 'empathy_map'
  | 'ideation_canvas'
  | 'product_development_canvas'
  | 'mind_map'
  | 'user_journey_map'
  | 'stakeholder_map'
  | 'none';

// Updated canvasTemplates list based on JSON
const canvasTemplates: { value: CanvasType; label: string; description?: string, sections?: string[] }[] = [
  {
    value: 'aeiou_canvas',
    label: 'AEIOU Canvas',
    description: 'Used for observational research to categorize insights into Activities, Environments, Interactions, Objects, and Users.',
    sections: ['Activities', 'Environments', 'Interactions', 'Objects', 'Users'],
  },
  {
    value: 'empathy_map',
    label: 'Empathy Mapping Canvas',
    description: 'Used to understand users by mapping what they say, think, do, and feel.',
    sections: ['Says', 'Thinks', 'Does', 'Feels', 'Pain Points', 'Gains'],
  },
  {
    value: 'ideation_canvas',
    label: 'Ideation Canvas',
    description: 'Used to brainstorm and organize ideas based on user\'s needs, problems, and possible solutions.',
    sections: ['People', 'Activities', 'Situations/Context', 'Props', 'Possible Solutions'],
  },
  {
    value: 'product_development_canvas',
    label: 'Product Development Canvas',
    description: 'Used to plan and describe the development process of a product idea.',
    sections: ["Purpose", "People", "Product Experience", "Product Functions", "Product Features", "Components", "Customer Revalidation", "Resources"],
  },
  {
    value: 'mind_map',
    label: 'Mind Mapping Canvas',
    description: 'Visual way to capture related ideas and concepts starting from a central theme.',
    sections: ["Central Idea", "Branches", "Sub-branches", "Keywords", "Connections"], // Updated sections for mind map
  },
  {
    value: 'user_journey_map',
    label: 'User Journey Canvas',
    description: 'Maps the complete journey a user takes while interacting with a product or service.',
    sections: ["Touchpoints", "Actions", "Emotions", "Pain Points", "Opportunities"], // Updated sections for user journey
  },
  {
    value: 'stakeholder_map',
    label: 'Stakeholder Mapping Canvas',
    description: 'Used to identify and categorize project stakeholders based on their influence and interest.',
    sections: ["High Influence - High Interest", "High Influence - Low Interest", "Low Influence - High Interest", "Low Influence - Low Interest"],
  },
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

// Placeholder for Canvas Backgrounds - Updated with new types and sections
const CanvasBackground = ({ type }: { type: CanvasType }) => {
    const currentTemplate = canvasTemplates.find(t => t.value === type);

    const getGridStyle = (): React.CSSProperties => {
        // Provide basic grid layouts as placeholders
        switch (type) {
            case 'aeiou_canvas':
                // 3 columns top, 2 columns bottom
                return { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gridTemplateRows: 'auto auto', height: 'auto', minHeight: '400px', gap: '8px' };
            case 'empathy_map':
                 // 2x3 grid + pain/gain row
                return { display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'auto auto auto auto', height: 'auto', minHeight: '500px', gap: '8px' };
            case 'ideation_canvas':
                // 2x2 grid + solutions row
                 return { display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'auto auto auto', height: 'auto', minHeight: '400px', gap: '8px' };
            case 'product_development_canvas':
                 // Complex, maybe 4x2 grid
                return { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: 'auto auto', height: 'auto', minHeight: '400px', gap: '8px' };
            case 'mind_map':
                // Freeform, placeholder for central idea
                return { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' };
            case 'user_journey_map':
                // Linear flow, columns per phase/touchpoint
                 return { display: 'grid', gridTemplateColumns: `repeat(${currentTemplate?.sections?.length || 1}, 1fr)`, gridTemplateRows: 'auto', height: 'auto', minHeight: '300px', gap: '8px' };
            case 'stakeholder_map':
                // 2x2 grid
                return { display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', height: '400px', gap: '8px' };
            default:
                return {};
        }
    };

    const getZones = (): { name: string | null; gridSpan?: number }[] => {
         if (!currentTemplate) return [];

         // Special handling for AEIOU layout (3 top, 2 bottom)
        if (type === 'aeiou_canvas') {
            const sections = currentTemplate.sections || [];
            return [
                { name: sections[0] || null, gridSpan: 2 }, // Activities
                { name: sections[1] || null, gridSpan: 2 }, // Environments
                { name: sections[4] || null, gridSpan: 2 }, // Users (Moved to top row)
                { name: sections[2] || null, gridSpan: 3 }, // Interactions
                { name: sections[3] || null, gridSpan: 3 }, // Objects
            ];
        }
        // Special handling for Empathy Map layout
        if (type === 'empathy_map') {
            const sections = currentTemplate.sections || [];
            // Arrange Says/Thinks, Does/Feels, Pain/Gain
            return [
                { name: sections[0] || null }, { name: sections[2] || null }, // Says, Does
                { name: sections[1] || null }, { name: sections[3] || null }, // Thinks, Feels
                { name: sections[4] || null }, { name: sections[5] || null }, // Pain Points, Gains
            ];
        }
        // Special handling for Ideation Map layout
        if (type === 'ideation_canvas') {
             const sections = currentTemplate.sections || [];
             // Arrange People/Activities, Situations/Props, Solutions spanning bottom
             return [
                { name: sections[0] || null }, { name: sections[1] || null }, // People, Activities
                { name: sections[2] || null }, { name: sections[3] || null }, // Situations/Context, Props
                { name: sections[4] || null, gridSpan: 2 }, // Possible Solutions (span 2 cols)
             ];
         }
         // Default: Use sections directly, assuming single column span
         return (currentTemplate.sections || []).map(name => ({ name }));
    };


    if (type === 'none') {
        return <p className="text-muted-foreground">Select a canvas template from the dropdown.</p>;
    }

    const zones = getZones();

    return (
        <div className="relative w-full border-2 border-dashed border-border rounded-lg p-4 bg-muted/10 min-h-[400px] overflow-auto">
             <h3 className="text-center font-semibold text-lg mb-4 text-primary">{currentTemplate?.label}</h3>
             <p className="text-center text-sm text-muted-foreground mb-6">{currentTemplate?.description}</p>
             <div className="grid" style={getGridStyle()}>
                 {/* Render zones based on layout */}
                 {zones.map((zone, index) => (
                     <div
                        key={`${zone.name}-${index}`}
                        className={`border border-border/50 p-2 flex items-start justify-center text-xs font-medium text-muted-foreground bg-background min-h-[100px] ${zone.name ? '' : 'invisible'}`}
                        style={{ gridColumn: zone.gridSpan ? `span ${zone.gridSpan}` : 'span 1' }} // Apply grid span
                     >
                         {zone.name}
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

  // Placeholder Project/Common Info (Replace with actual data fetching if linked to a project)
  const commonHeaderInfo = {
    instituteName: "L. D. College of Engineering, Ahmedabad",
    projectTitle: "My Awesome Project", // Placeholder
    teamId: "Team007", // Placeholder
    teamMembers: [ {name: "Alex Doe", enrollment: "123456789"} ], // Placeholder
    subject: "Design Engineering - 1A",
    semester: "5", // Placeholder
    branch: "Computer Engineering", // Placeholder
    guideName: "Prof. Guide" // Placeholder
  };


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
          <div className="flex-1 flex flex-col justify-center">
              <h1 className="text-base font-semibold text-primary truncate text-glow-primary leading-tight">
                 Canvas Editor
              </h1>
               {/* Display Project Title and Subject */}
               <p className="text-xs text-muted-foreground truncate leading-tight">
                   {commonHeaderInfo.projectTitle} - {commonHeaderInfo.subject}
               </p>
          </div>

          {/* Rest of the header items */}
          <Select
            value={selectedCanvas}
            onValueChange={(value: CanvasType) => setSelectedCanvas(value)}
          >
            <SelectTrigger className="w-[250px] ml-auto"> {/* Increased width slightly */}
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

// Function to display common header info on the canvas itself (optional)
// This would need to be called within CanvasBackground or similar
const renderCommonInfoOnCanvas = (info: typeof commonHeaderInfo) => (
     <div className="absolute top-4 left-4 bg-background/80 p-2 rounded shadow text-xs max-w-xs pointer-events-none">
        <p><strong>Institute:</strong> {info.instituteName}</p>
        <p><strong>Project:</strong> {info.projectTitle}</p>
        <p><strong>Team ID:</strong> {info.teamId}</p>
         <p><strong>Subject:</strong> {info.subject}</p>
         <p><strong>Branch:</strong> {info.branch}</p>
         <p><strong>Semester:</strong> {info.semester}</p>
        {/* Add more fields as needed */}
     </div>
);
