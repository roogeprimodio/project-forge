// src/app/canva/page.tsx
"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Paintbrush, Save, Download, Wand2, StickyNote as StickyNoteIcon, Undo, Redo, Palette, PlusCircle, Trash2, Edit3 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';

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
    sections: ["Central Idea", "Branches", "Sub-branches", "Keywords", "Connections"],
  },
  {
    value: 'user_journey_map',
    label: 'User Journey Canvas',
    description: 'Maps the complete journey a user takes while interacting with a product or service.',
    sections: ["Touchpoints", "Actions", "Emotions", "Pain Points", "Opportunities"],
  },
  {
    value: 'stakeholder_map',
    label: 'Stakeholder Mapping Canvas',
    description: 'Used to identify and categorize project stakeholders based on their influence and interest.',
    sections: ["High Influence - High Interest", "High Influence - Low Interest", "Low Influence - High Interest", "Low Influence - Low Interest"],
  },
];

// Interface for sticky note data
interface StickyNoteData {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string; // Tailwind background color class e.g., 'bg-yellow-200'
  width: number;
  height: number;
  isEditing?: boolean; // Flag for inline editing
}

// Sticky Note Component
const StickyNote = React.memo(({
    note,
    onDragStart,
    onTouchStart, // Add touch start handler prop
    onContextMenu,
    onTextChange,
    onDoubleClick,
    onBlur,
}: {
    note: StickyNoteData;
    onDragStart: (e: React.MouseEvent<HTMLDivElement>, id: string) => void;
    onTouchStart: (e: React.TouchEvent<HTMLDivElement>, id: string) => void; // Add touch start handler prop
    onContextMenu: (e: React.MouseEvent<HTMLDivElement>, id: string) => void;
    onTextChange: (id: string, text: string) => void;
    onDoubleClick: (id: string) => void; // For initiating edit
    onBlur: (id: string) => void; // For finishing edit
}) => {
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (note.isEditing && textAreaRef.current) {
            textAreaRef.current.focus();
            textAreaRef.current.select();
        }
    }, [note.isEditing]);

    return (
        <div
            className={cn(
                `absolute p-2 shadow-md rounded text-sm text-black cursor-grab active:cursor-grabbing border border-gray-400/50 flex flex-col touch-none`, // Added touch-none
                note.color
            )}
            style={{
                left: `${note.x}px`,
                top: `${note.y}px`,
                width: `${note.width}px`,
                height: `${note.height}px`,
                cursor: note.isEditing ? 'text' : 'grab', // Change cursor when editing
            }}
            onMouseDown={(e) => !note.isEditing && onDragStart(e, note.id)} // Only drag if not editing
            onTouchStart={(e) => !note.isEditing && onTouchStart(e, note.id)} // Add touch start handler
            onContextMenu={(e) => onContextMenu(e, note.id)}
            onDoubleClick={(e) => {
                e.stopPropagation(); // Prevent drag start on double click
                onDoubleClick(note.id);
            }}
        >
            {note.isEditing ? (
                <textarea
                    ref={textAreaRef}
                    className="w-full h-full bg-transparent border-none resize-none outline-none text-xs focus:ring-1 focus:ring-blue-500 rounded"
                    value={note.text}
                    onChange={(e) => onTextChange(note.id, e.target.value)}
                    onBlur={() => onBlur(note.id)}
                    onMouseDown={(e) => e.stopPropagation()} // Prevent drag when clicking textarea
                    onTouchStart={(e) => e.stopPropagation()} // Prevent drag when touching textarea
                />
            ) : (
                 // Display text, handle overflow
                 <div className="w-full h-full overflow-hidden whitespace-pre-wrap text-xs break-words">
                    {note.text || 'Double-click to edit...'}
                 </div>
            )}
        </div>
    );
});
StickyNote.displayName = 'StickyNote'; // Add display name


// Placeholder for Canvas Backgrounds - Updated with new types and sections
const CanvasBackground = ({ type, notes, onDragStart, onTouchStart, onContextMenu, onNoteTextChange, onNoteDoubleClick, onNoteBlur }: {
    type: CanvasType;
    notes: StickyNoteData[];
    onDragStart: (e: React.MouseEvent<HTMLDivElement>, id: string) => void;
    onTouchStart: (e: React.TouchEvent<HTMLDivElement>, id: string) => void; // Add touch handler
    onContextMenu: (e: React.MouseEvent<HTMLDivElement>, id: string) => void;
    onNoteTextChange: (id: string, text: string) => void;
    onNoteDoubleClick: (id: string) => void;
    onNoteBlur: (id: string) => void;
}) => {
    const currentTemplate = canvasTemplates.find(t => t.value === type);

    const getGridStyle = (): React.CSSProperties => {
        switch (type) {
            case 'aeiou_canvas':
                return { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gridTemplateRows: 'auto auto', height: 'auto', minHeight: '400px', gap: '8px' };
            case 'empathy_map':
                return { display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'auto auto auto auto', height: 'auto', minHeight: '500px', gap: '8px' };
            case 'ideation_canvas':
                 return { display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'auto auto auto', height: 'auto', minHeight: '400px', gap: '8px' };
            case 'product_development_canvas':
                return { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: 'auto auto', height: 'auto', minHeight: '400px', gap: '8px' };
            case 'mind_map':
                return { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }; // Placeholder
            case 'user_journey_map':
                 return { display: 'grid', gridTemplateColumns: `repeat(${currentTemplate?.sections?.length || 1}, 1fr)`, gridTemplateRows: 'auto', height: 'auto', minHeight: '300px', gap: '8px' };
            case 'stakeholder_map':
                return { display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', height: '400px', gap: '8px' };
            default:
                return { minHeight: '400px' }; // Ensure minimum height for 'none'
        }
    };

    const getZones = (): { name: string | null; gridSpan?: number }[] => {
         if (!currentTemplate || type === 'none' || type === 'mind_map') return []; // No zones for 'none' or 'mind_map'

         // Special handling for layouts
        if (type === 'aeiou_canvas') {
            const sections = currentTemplate.sections || [];
            return [
                { name: sections[0] || null, gridSpan: 2 }, { name: sections[1] || null, gridSpan: 2 }, { name: sections[4] || null, gridSpan: 2 },
                { name: sections[2] || null, gridSpan: 3 }, { name: sections[3] || null, gridSpan: 3 },
            ];
        }
        if (type === 'empathy_map') {
            const sections = currentTemplate.sections || [];
            return [
                { name: sections[0] || null }, { name: sections[2] || null }, // Says, Does
                { name: sections[1] || null }, { name: sections[3] || null }, // Thinks, Feels
                { name: sections[4] || null }, { name: sections[5] || null }, // Pain Points, Gains
            ];
        }
        if (type === 'ideation_canvas') {
             const sections = currentTemplate.sections || [];
             return [
                { name: sections[0] || null }, { name: sections[1] || null },
                { name: sections[2] || null }, { name: sections[3] || null },
                { name: sections[4] || null, gridSpan: 2 },
             ];
         }
         // Default: Use sections directly
         return (currentTemplate.sections || []).map(name => ({ name }));
    };


    if (type === 'none') {
        return (
             <div className="relative w-full border-2 border-dashed border-border rounded-lg p-4 bg-muted/10 min-h-[400px] overflow-auto flex items-center justify-center">
                <p className="text-muted-foreground">Select a canvas template from the dropdown.</p>
                {/* Render notes even when no template is selected */}
                {notes.map(note => (
                   <StickyNote
                        key={note.id}
                        note={note}
                        onDragStart={onDragStart}
                        onTouchStart={onTouchStart} // Pass touch handler
                        onContextMenu={onContextMenu}
                        onTextChange={onNoteTextChange}
                        onDoubleClick={onNoteDoubleClick}
                        onBlur={onNoteBlur}
                   />
                ))}
            </div>
        );
    }

    const zones = getZones();

    return (
        <div className="relative w-full border-2 border-dashed border-border rounded-lg p-4 bg-muted/10 min-h-[400px] overflow-auto">
             {/* Only show title/desc if not mind map */}
             {type !== 'mind_map' && (
                 <>
                    <h3 className="text-center font-semibold text-lg mb-2 text-primary">{currentTemplate?.label}</h3>
                    <p className="text-center text-sm text-muted-foreground mb-4">{currentTemplate?.description}</p>
                 </>
             )}
             {/* Render grid layout only if not mind map */}
             {type !== 'mind_map' ? (
                 <div className="grid" style={getGridStyle()}>
                     {zones.map((zone, index) => (
                         <div
                            key={`${zone.name}-${index}`}
                            className={`border border-border/50 p-2 flex items-start justify-center text-xs font-medium text-muted-foreground bg-background min-h-[100px] rounded ${zone.name ? '' : 'invisible'}`}
                            style={{ gridColumn: zone.gridSpan ? `span ${zone.gridSpan}` : 'span 1' }}
                         >
                             {zone.name}
                         </div>
                     ))}
                 </div>
             ) : (
                // Specific placeholder for Mind Map
                <div style={getGridStyle()}>
                     <div className="border border-border/50 p-2 rounded bg-background text-center">
                        <p className="text-xs font-medium text-muted-foreground">Central Idea</p>
                     </div>
                     {/* Add visual cues for branches later */}
                </div>
             )}

             {/* Render Sticky Notes */}
             {notes.map(note => (
                <StickyNote
                    key={note.id}
                    note={note}
                    onDragStart={onDragStart}
                    onTouchStart={onTouchStart} // Pass touch handler
                    onContextMenu={onContextMenu}
                    onTextChange={onNoteTextChange}
                    onDoubleClick={onNoteDoubleClick}
                    onBlur={onNoteBlur}
                />
             ))}

            <p className="text-xs text-muted-foreground absolute bottom-2 right-2">(Canvas Area - Drag & Drop Sticky Notes Here)</p>
        </div>
    );
};


export default function CanvaPage() {
  const [selectedCanvas, setSelectedCanvas] = useState<CanvasType>('none');
  const [notes, setNotes] = useState<StickyNoteData[]>([]); // Store sticky notes
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; noteId: string } | null>(null);
  const [currentNoteColor, setCurrentNoteColor] = useState('bg-yellow-200'); // Default color for new notes
  const canvasRef = useRef<HTMLDivElement>(null);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref for long press timeout

  // Placeholder Project/Common Info (Replace with actual data fetching if linked to a project)
  const commonHeaderInfo = {
    instituteName: "L. D. College of Engineering, Ahmedabad",
    projectTitle: "My Awesome Project",
    teamId: "Team007",
    teamMembers: [ {name: "Alex Doe", enrollment: "123456789"} ],
    subject: "Design Engineering - 1A",
    semester: "5",
    branch: "Computer Engineering",
    guideName: "Prof. Guide"
  };

  const handleSave = () => { console.log('Save clicked', notes); /* Implement save logic */ };
  const handleExport = () => { console.log('Export clicked'); /* Implement export logic */ };
  const handleAiSuggest = () => { console.log('AI Suggest clicked'); /* Implement AI suggestion logic */ };

  // Add a new sticky note
  const handleAddNote = () => {
    const canvasBounds = canvasRef.current?.getBoundingClientRect();
    const newNote: StickyNoteData = {
      id: uuidv4(),
      x: canvasBounds ? (canvasBounds.width / 2) - 50 : 50, // Center horizontally initially or fallback
      y: canvasBounds ? (canvasBounds.height / 2) - 50 : 50, // Center vertically initially or fallback
      text: '',
      color: currentNoteColor, // Use current selected color
      width: 96, // Default width (w-24)
      height: 96, // Default height (h-24)
    };
    setNotes(prevNotes => [...prevNotes, newNote]);
  };

   // --- Drag and Drop Logic (Mouse) ---
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>, id: string) => {
    e.preventDefault(); // Prevent default browser drag behavior
    const noteElement = e.currentTarget;
    const startX = e.clientX;
    const startY = e.clientY;
    const noteX = noteElement.offsetLeft;
    const noteY = noteElement.offsetTop;

    setDraggingNoteId(id);
    setDragOffset({ x: startX - noteX, y: startY - noteY });
  };

  // --- Drag and Drop Logic (Touch with Long Press) ---
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>, id: string) => {
    // Don't prevent default here initially, allow potential scroll
    const noteElement = e.currentTarget;
    const touch = e.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;
    const noteX = noteElement.offsetLeft;
    const noteY = noteElement.offsetTop;

    // Set a timeout for long press (e.g., 500ms)
    longPressTimeoutRef.current = setTimeout(() => {
        // If timeout finishes, initiate drag
        setDraggingNoteId(id);
        setDragOffset({ x: startX - noteX, y: startY - noteY });
        // Optionally, provide haptic feedback here if possible
        longPressTimeoutRef.current = null; // Clear the ref
        // Prevent scrolling *after* long press detected
        // This might need refinement depending on exact desired behavior
    }, 500); // 500ms for long press
  };

   // --- Universal Move Handler (Mouse & Touch) ---
   const handlePointerMove = useCallback((clientX: number, clientY: number) => {
       if (!draggingNoteId || !canvasRef.current) return;

       const canvasBounds = canvasRef.current.getBoundingClientRect();
       let newX = clientX - dragOffset.x - canvasBounds.left + canvasRef.current.scrollLeft;
       let newY = clientY - dragOffset.y - canvasBounds.top + canvasRef.current.scrollTop;

       // Optional: Keep note within canvas bounds (adjust as needed)
       // const noteWidth = notes.find(n => n.id === draggingNoteId)?.width || 96;
       // const noteHeight = notes.find(n => n.id === draggingNoteId)?.height || 96;
       // newX = Math.max(0, Math.min(newX, canvasRef.current.scrollWidth - noteWidth));
       // newY = Math.max(0, Math.min(newY, canvasRef.current.scrollHeight - noteHeight));

       setNotes(prevNotes =>
         prevNotes.map(note =>
           note.id === draggingNoteId ? { ...note, x: newX, y: newY } : note
         )
       );
   }, [draggingNoteId, dragOffset]);


   // Handle mouse move for dragging
   const handleMouseMove = useCallback((e: MouseEvent) => {
       handlePointerMove(e.clientX, e.clientY);
   }, [handlePointerMove]);

   // Handle touch move for dragging (only if dragging started)
    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (!draggingNoteId) return; // Only move if dragging is active
        // Prevent scroll while dragging
        e.preventDefault();
        const touch = e.touches[0];
        handlePointerMove(touch.clientX, touch.clientY);
    }, [draggingNoteId, handlePointerMove]);


  // --- Universal Up Handler (Mouse & Touch) ---
  const handlePointerUp = useCallback(() => {
      // Clear long press timeout if it exists (user lifted finger before long press duration)
      if (longPressTimeoutRef.current) {
          clearTimeout(longPressTimeoutRef.current);
          longPressTimeoutRef.current = null;
      }
      // Stop dragging
      if (draggingNoteId) {
          setDraggingNoteId(null);
      }
  }, [draggingNoteId]); // Depend on draggingNoteId

    // Stop dragging (Mouse)
   const handleMouseUp = useCallback(() => {
       handlePointerUp();
   }, [handlePointerUp]);

   // Stop dragging (Touch)
   const handleTouchEnd = useCallback(() => {
       handlePointerUp();
   }, [handlePointerUp]);

  // Add mouse/touch move and up listeners to the window
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false }); // Use passive: false to allow preventDefault
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd); // Handle cancel event too

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
      // Clear timeout on unmount
      if (longPressTimeoutRef.current) {
          clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);


  // Handle right-click context menu
  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>, id: string) => {
    e.preventDefault();
    // Don't show context menu while dragging
    if (draggingNoteId) return;
    setContextMenu({ x: e.clientX, y: e.clientY, noteId: id });
  };

  // Close context menu
  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  // Delete a note
  const handleDeleteNote = (id: string) => {
    setNotes(prevNotes => prevNotes.filter(note => note.id !== id));
    handleCloseContextMenu();
  };

  // Change note color from context menu
  const handleChangeNoteColor = (id: string, color: string) => {
     setNotes(prevNotes =>
       prevNotes.map(note =>
         note.id === id ? { ...note, color: color } : note
       )
     );
     handleCloseContextMenu();
   };

   // Handle text change in sticky note textarea
  const handleNoteTextChange = (id: string, text: string) => {
    setNotes(prevNotes =>
      prevNotes.map(note =>
        note.id === id ? { ...note, text: text } : note
      )
    );
  };

   // Set editing flag on double click
   const handleNoteDoubleClick = (id: string) => {
     // Don't allow edit if dragging was just active
     if (draggingNoteId) return;
     setNotes(prevNotes =>
       prevNotes.map(note =>
         note.id === id ? { ...note, isEditing: true } : { ...note, isEditing: false } // Start editing this note, stop others
       )
     );
   };

   // Unset editing flag on blur
    const handleNoteBlur = (id: string) => {
      setNotes(prevNotes =>
        prevNotes.map(note =>
          note.id === id ? { ...note, isEditing: false } : note
        )
      );
    };

  // Change color for new notes
  const handleChangeNewNoteColor = (color: string) => {
    setCurrentNoteColor(color);
  };


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
                 {canvasTemplates.find(t => t.value === selectedCanvas)?.label || 'Canvas Editor'}
              </h1>
               <p className="text-xs text-muted-foreground truncate leading-tight">
                   {commonHeaderInfo.projectTitle} - {commonHeaderInfo.subject}
               </p>
          </div>

          {/* Canvas Type Selector */}
          <Select
            value={selectedCanvas}
            onValueChange={(value: CanvasType) => setSelectedCanvas(value)}
          >
            <SelectTrigger className="w-[250px] ml-auto">
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
        <ScrollArea className="flex-1 bg-muted/20" viewportRef={canvasRef} > {/* Assign ref here */}
           {/* Container for positioning and interactions */}
           <div
               className="relative w-full h-full p-4 md:p-6" // Add padding for spacing from edges
               onClick={handleCloseContextMenu} // Close context menu on canvas click
            >
             <CanvasBackground
                type={selectedCanvas}
                notes={notes}
                onDragStart={handleDragStart}
                onTouchStart={handleTouchStart} // Pass touch handler
                onContextMenu={handleContextMenu}
                onNoteTextChange={handleNoteTextChange}
                onNoteDoubleClick={handleNoteDoubleClick}
                onNoteBlur={handleNoteBlur}
              />
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
            <label className="text-sm font-medium">New Note Color</label>
            <div className="flex gap-2">
                {/* Map through available colors */}
                {['bg-yellow-200', 'bg-pink-200', 'bg-blue-200', 'bg-green-200'].map(colorClass => (
                    <Button
                        key={colorClass}
                        size="icon"
                        className={`h-8 w-8 border border-gray-400/50 ${colorClass} hover:opacity-80 ${currentNoteColor === colorClass ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                        onClick={() => handleChangeNewNoteColor(colorClass)}
                        aria-label={`Set new note color to ${colorClass.split('-')[1]}`}
                    />
                 ))}
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
         <p className="text-xs text-muted-foreground text-center mt-2">Tip: Double-click a note to edit text. Right-click for options (or long-press on mobile - coming soon!).</p>
      </aside>

      {/* Context Menu */}
      {contextMenu && (
          <DropdownMenu open={!!contextMenu} onOpenChange={(open) => !open && handleCloseContextMenu()}>
               <DropdownMenuTrigger
                    style={{ position: 'absolute', left: contextMenu.x, top: contextMenu.y, width: 0, height: 0 }}
                    aria-hidden="true" // Hide trigger visually and from accessibility tree
                />
               <DropdownMenuContent align="start" className="w-40">
                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleNoteDoubleClick(contextMenu.noteId); handleCloseContextMenu(); }}>
                        <Edit3 className="mr-2 h-4 w-4" /> Edit Text
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleChangeNoteColor(contextMenu.noteId, 'bg-yellow-200'); }}>
                        <div className="w-3 h-3 rounded-full bg-yellow-200 mr-2 border border-gray-400/50"></div> Yellow
                    </DropdownMenuItem>
                     <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleChangeNoteColor(contextMenu.noteId, 'bg-pink-200'); }}>
                        <div className="w-3 h-3 rounded-full bg-pink-200 mr-2 border border-gray-400/50"></div> Pink
                    </DropdownMenuItem>
                     <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleChangeNoteColor(contextMenu.noteId, 'bg-blue-200'); }}>
                         <div className="w-3 h-3 rounded-full bg-blue-200 mr-2 border border-gray-400/50"></div> Blue
                    </DropdownMenuItem>
                     <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleChangeNoteColor(contextMenu.noteId, 'bg-green-200'); }}>
                         <div className="w-3 h-3 rounded-full bg-green-200 mr-2 border border-gray-400/50"></div> Green
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onSelect={(e) => { e.preventDefault(); handleDeleteNote(contextMenu.noteId); }}
                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Note
                    </DropdownMenuItem>
               </DropdownMenuContent>
          </DropdownMenu>
       )}

    </div>
  );
}

// Function to display common header info on the canvas itself (optional)
// Not currently used, but kept for potential future implementation
const renderCommonInfoOnCanvas = (info: typeof commonHeaderInfo) => (
     <div className="absolute top-4 left-4 bg-background/80 p-2 rounded shadow text-xs max-w-xs pointer-events-none">
        <p><strong>Institute:</strong> {info.instituteName}</p>
        <p><strong>Project:</strong> {info.projectTitle}</p>
        <p><strong>Team ID:</strong> {info.teamId}</p>
         <p><strong>Subject:</strong> {info.subject}</p>
         <p><strong>Branch:</strong> {info.branch}</p>
         <p><strong>Semester:</strong> {info.semester}</p>
     </div>
);
