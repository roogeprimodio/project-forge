// src/app/canva/page.tsx
"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Paintbrush, Save, Download, Wand2, StickyNote as StickyNoteIcon, Undo, Redo, Palette, PlusCircle, Trash2, Edit3, Square, ArrowRightLeft, Projector } from 'lucide-react'; // Added Projector
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"; // Import Dialog components
import AiDiagramGenerator from '@/components/ai-diagram-generator'; // Import the AI Diagram Generator
import MermaidDiagram from '@/components/mermaid-diagram'; // Import the Mermaid Renderer

// Define Canvas Types
type CanvasType =
  | 'aeiou_canvas'
  | 'empathy_map'
  | 'ideation_canvas'
  | 'product_development_canvas'
  | 'mind_map'
  | 'user_journey_map'
  | 'stakeholder_map'
  | 'none';

// Updated canvasTemplates list
const canvasTemplates: { value: CanvasType; label: string; description?: string, sections?: string[] }[] = [
  { value: 'aeiou_canvas', label: 'AEIOU Canvas', description: 'Categorize insights into Activities, Environments, Interactions, Objects, and Users.', sections: ['Activities', 'Environments', 'Interactions', 'Objects', 'Users'], },
  { value: 'empathy_map', label: 'Empathy Mapping Canvas', description: 'Understand users by mapping what they say, think, do, and feel.', sections: ['Says', 'Thinks', 'Does', 'Feels', 'Pain Points', 'Gains'], },
  { value: 'ideation_canvas', label: 'Ideation Canvas', description: 'Brainstorm ideas based on user needs, problems, and solutions.', sections: ['People', 'Activities', 'Situations/Context', 'Props', 'Possible Solutions'], },
  { value: 'product_development_canvas', label: 'Product Development Canvas', description: 'Plan product development process.', sections: ["Purpose", "People", "Product Experience", "Product Functions", "Product Features", "Components", "Customer Revalidation", "Resources"], },
  { value: 'mind_map', label: 'Mind Mapping Canvas', description: 'Visually capture related ideas.', sections: ["Central Idea", "Branches", "Sub-branches", "Keywords", "Connections"], },
  { value: 'user_journey_map', label: 'User Journey Canvas', description: 'Map user interactions with a product/service.', sections: ["Touchpoints", "Actions", "Emotions", "Pain Points", "Opportunities"], },
  { value: 'stakeholder_map', label: 'Stakeholder Mapping Canvas', description: 'Identify and categorize project stakeholders.', sections: ["High Influence - High Interest", "High Influence - Low Interest", "Low Influence - High Interest", "Low Influence - Low Interest"], },
];

// Interface for sticky note data
interface StickyNoteData {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  width: number;
  height: number;
  isEditing?: boolean;
  isDiagram?: boolean; // Flag to indicate if this note holds a diagram
  diagramCode?: string; // Store Mermaid code if it's a diagram note
}

// Available Colors
const STICKY_NOTE_COLORS = ['bg-yellow-200', 'bg-pink-200', 'bg-blue-200', 'bg-green-200', 'bg-purple-200', 'bg-orange-200'];


// Sticky Note Component
const StickyNote = React.memo(({
    note,
    isDragging,
    isSelected,
    onDragStart,
    onTouchStart,
    onContextMenu,
    onTextChange,
    onDoubleClick,
    onBlur,
    onClick,
}: {
    note: StickyNoteData;
    isDragging: boolean;
    isSelected: boolean;
    onDragStart: (e: React.MouseEvent<HTMLDivElement>, id: string) => void;
    onTouchStart: (e: React.TouchEvent<HTMLDivElement>, id: string) => void;
    onContextMenu: (e: React.MouseEvent<HTMLDivElement>, id: string) => void;
    onTextChange: (text: string) => void;
    onDoubleClick: (id: string) => void;
    onBlur: (id: string) => void;
    onClick: (id: string) => void;
}) => {
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (note.isEditing && !note.isDiagram && textAreaRef.current) { // Only focus text area if not a diagram
            textAreaRef.current.focus();
            textAreaRef.current.select();
        }
    }, [note.isEditing, note.isDiagram]);

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (note.isEditing || isDragging) return;
        onClick(note.id);
    };

    const handleBlur = () => { onBlur(note.id); };

    return (
        <div
            className={cn(
                `absolute p-2 shadow-md rounded text-sm text-black cursor-grab active:cursor-grabbing border border-gray-400/50 flex flex-col touch-none overflow-hidden`,
                note.color,
                isDragging && 'ring-2 ring-blue-500 ring-offset-2 scale-105 shadow-xl cursor-grabbing z-50 opacity-80',
                isSelected && !isDragging && 'ring-2 ring-primary ring-offset-1 z-10',
                note.isEditing && !note.isDiagram && 'cursor-text z-20 ring-2 ring-blue-500 ring-offset-1' // Ring only if editing text
            )}
            style={{
                left: `${note.x}px`,
                top: `${note.y}px`,
                width: `${note.width}px`,
                height: `${note.height}px`,
            }}
            onMouseDown={(e) => !note.isEditing && onDragStart(e, note.id)}
            onTouchStart={(e) => !note.isEditing && onTouchStart(e, note.id)}
            onContextMenu={(e) => !note.isEditing && onContextMenu(e, note.id)}
            onDoubleClick={(e) => { if (!isDragging) onDoubleClick(note.id); }}
            onClick={handleClick}
        >
            {note.isDiagram && note.diagramCode ? (
                // Render Mermaid diagram if it's a diagram note
                <div className="w-full h-full overflow-auto bg-white p-1 rounded-sm"> {/* Added bg-white for contrast */}
                   <MermaidDiagram chart={note.diagramCode} id={`note-${note.id}`} className="min-h-[50px]"/> {/* Ensure min-height */}
                </div>
            ) : note.isEditing ? (
                <textarea
                    ref={textAreaRef}
                    className="w-full h-full bg-transparent border-none resize-none outline-none text-xs focus:ring-0"
                    value={note.text}
                    onChange={(e) => onTextChange(e.target.value)}
                    onBlur={handleBlur}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                />
            ) : (
                 <div className="w-full h-full overflow-hidden whitespace-pre-wrap text-xs break-words pointer-events-none">
                    {note.text || <span className="text-muted-foreground italic">Edit...</span>}
                 </div>
            )}
        </div>
    );
});
StickyNote.displayName = 'StickyNote';


// Canvas Background Component
const CanvasBackground = ({
    type,
    notes,
    draggingNoteId,
    selectedNoteId,
    onDragStart,
    onTouchStart,
    onContextMenu,
    onNoteTextChange,
    onNoteDoubleClick,
    onNoteBlur,
    onNoteClick,
}: {
    type: CanvasType;
    notes: StickyNoteData[];
    draggingNoteId: string | null;
    selectedNoteId: string | null;
    onDragStart: (e: React.MouseEvent<HTMLDivElement>, id: string) => void;
    onTouchStart: (e: React.TouchEvent<HTMLDivElement>, id: string) => void;
    onContextMenu: (e: React.MouseEvent<HTMLDivElement>, id: string) => void;
    onNoteTextChange: (id: string, text: string) => void;
    onNoteDoubleClick: (id: string) => void;
    onNoteBlur: (id: string) => void;
    onNoteClick: (id: string) => void;
}) => {
    const currentTemplate = canvasTemplates.find(t => t.value === type);

    const getGridStyle = (): React.CSSProperties => { /* ... (keep existing grid style logic) ... */
         switch (type) {
            case 'aeiou_canvas': return { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gridTemplateRows: 'auto auto', height: 'auto', minHeight: '400px', gap: '8px' };
            case 'empathy_map': return { display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'auto auto auto auto', height: 'auto', minHeight: '500px', gap: '8px' };
            case 'ideation_canvas': return { display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'auto auto auto', height: 'auto', minHeight: '400px', gap: '8px' };
            case 'product_development_canvas': return { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: 'auto auto', height: 'auto', minHeight: '400px', gap: '8px' };
            case 'mind_map': return { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }; // Placeholder
            case 'user_journey_map': return { display: 'grid', gridTemplateColumns: `repeat(${currentTemplate?.sections?.length || 1}, 1fr)`, gridTemplateRows: 'auto', height: 'auto', minHeight: '300px', gap: '8px' };
            case 'stakeholder_map': return { display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', height: '400px', gap: '8px' };
            default: return { minHeight: '400px' };
        }
    };

    const getZones = (): { name: string | null; gridSpan?: number }[] => { /* ... (keep existing zone logic) ... */
        if (!currentTemplate || type === 'none' || type === 'mind_map') return [];
        if (type === 'aeiou_canvas') { const s = currentTemplate.sections || []; return [ { name: s[0] || null, gridSpan: 2 }, { name: s[1] || null, gridSpan: 2 }, { name: s[4] || null, gridSpan: 2 }, { name: s[2] || null, gridSpan: 3 }, { name: s[3] || null, gridSpan: 3 }, ]; }
        if (type === 'empathy_map') { const s = currentTemplate.sections || []; return [ { name: s[0] || null }, { name: s[2] || null }, { name: s[1] || null }, { name: s[3] || null }, { name: s[4] || null }, { name: s[5] || null }, ]; }
        if (type === 'ideation_canvas') { const s = currentTemplate.sections || []; return [ { name: s[0] || null }, { name: s[1] || null }, { name: s[2] || null }, { name: s[3] || null }, { name: s[4] || null, gridSpan: 2 }, ]; }
        return (currentTemplate.sections || []).map(name => ({ name }));
    };

    if (type === 'none') { /* ... (keep existing 'none' type rendering logic) ... */
         return (
             <div className="relative w-full border-2 border-dashed border-border rounded-lg p-4 bg-muted/10 min-h-[400px] overflow-auto flex items-center justify-center">
                <p className="text-muted-foreground">Select a canvas template from the dropdown.</p>
                {notes.map(note => ( <StickyNote key={note.id} note={note} isDragging={note.id === draggingNoteId} isSelected={note.id === selectedNoteId} onDragStart={onDragStart} onTouchStart={onTouchStart} onContextMenu={onContextMenu} onTextChange={(text) => onNoteTextChange(note.id, text)} onDoubleClick={onNoteDoubleClick} onBlur={onNoteBlur} onClick={onNoteClick} /> ))}
            </div>
        );
    }

    const zones = getZones();

    return (
        <div className="relative w-full border-2 border-dashed border-border rounded-lg p-4 bg-muted/10 min-h-[400px] overflow-auto">
            {type !== 'mind_map' && ( <> <h3 className="text-center font-semibold text-lg mb-2 text-primary">{currentTemplate?.label}</h3> <p className="text-center text-sm text-muted-foreground mb-4">{currentTemplate?.description}</p> </> )}
            {type !== 'mind_map' ? ( <div className="grid" style={getGridStyle()}> {zones.map((zone, index) => ( <div key={`${zone.name}-${index}`} className={`border border-border/50 p-2 flex items-start justify-center text-xs font-medium text-muted-foreground bg-background min-h-[100px] rounded ${zone.name ? '' : 'invisible'}`} style={{ gridColumn: zone.gridSpan ? `span ${zone.gridSpan}` : 'span 1' }} > {zone.name} </div> ))} </div> ) : ( <div style={getGridStyle()}> <div className="border border-border/50 p-2 rounded bg-background text-center"> <p className="text-xs font-medium text-muted-foreground">Central Idea</p> </div> </div> )}
            {notes.map(note => ( <StickyNote key={note.id} note={note} isDragging={note.id === draggingNoteId} isSelected={note.id === selectedNoteId} onDragStart={onDragStart} onTouchStart={onTouchStart} onContextMenu={onContextMenu} onTextChange={(text) => onNoteTextChange(note.id, text)} onDoubleClick={onNoteDoubleClick} onBlur={onNoteBlur} onClick={onNoteClick} /> ))}
            <p className="text-xs text-muted-foreground absolute bottom-2 right-2">(Canvas Area)</p>
        </div>
    );
};


export default function CanvaPage() {
  const [selectedCanvas, setSelectedCanvas] = useState<CanvasType>('none');
  const [notes, setNotes] = useState<StickyNoteData[]>([]);
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; noteId: string } | null>(null);
  const [currentNoteColor, setCurrentNoteColor] = useState('bg-yellow-200');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [editWidth, setEditWidth] = useState('');
  const [editHeight, setEditHeight] = useState('');
  const [editText, setEditText] = useState('');
  const [isDiagramDialogOpen, setIsDiagramDialogOpen] = useState(false); // State for Diagram Generator Dialog

  const canvasRef = useRef<HTMLDivElement>(null);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isDraggingRef = useRef(false);
  const pointerDownTimeRef = useRef<number>(0);

  // Placeholder Project/Common Info
  const commonHeaderInfo = { instituteName: "L. D. College of Engineering, Ahmedabad", projectTitle: "My Awesome Project", teamId: "Team007", teamMembers: [ {name: "Alex Doe", enrollment: "123456789"} ], subject: "Design Engineering - 1A", semester: "5", branch: "Computer Engineering", guideName: "Prof. Guide" };

  // Update sidebar edit fields
  useEffect(() => {
    const selected = notes.find(n => n.id === selectedNoteId);
    if (selected && !selected.isDiagram) { // Only populate text/size if not a diagram
        setEditWidth(String(selected.width));
        setEditHeight(String(selected.height));
        setEditText(selected.text);
    } else if (selected && selected.isDiagram) {
         // For diagrams, maybe just show size and a placeholder for text
         setEditWidth(String(selected.width));
         setEditHeight(String(selected.height));
         setEditText('[Diagram Content]'); // Placeholder
    } else {
      setEditWidth('');
      setEditHeight('');
      setEditText('');
    }
  }, [selectedNoteId, notes]);


  const handleSave = () => { console.log('Save clicked', notes); };
  const handleExport = () => { console.log('Export clicked'); };
  const handleAiSuggest = () => { console.log('AI Suggest clicked'); };

  // Add a new sticky note
  const handleAddNote = () => {
    const canvasBounds = canvasRef.current?.getBoundingClientRect();
    const newNote: StickyNoteData = {
      id: uuidv4(),
       x: canvasBounds ? (canvasBounds.width / 2) - 50 + (canvasRef.current?.scrollLeft || 0) : 50,
       y: canvasBounds ? (canvasBounds.height / 2) - 50 + (canvasRef.current?.scrollTop || 0) : 50,
      text: '', color: currentNoteColor, width: 96, height: 96, isDiagram: false
    };
    setNotes(prevNotes => [...prevNotes, newNote]);
    setSelectedNoteId(newNote.id);
    startEditingNote(newNote.id);
  };

  // Add a new diagram note (opens dialog)
  const handleAddDiagramNote = () => {
      setIsDiagramDialogOpen(true);
  };

  // Callback when diagram is generated from the dialog
  const handleDiagramGenerated = (mermaidCode: string) => {
      const canvasBounds = canvasRef.current?.getBoundingClientRect();
      const newNote: StickyNoteData = {
          id: uuidv4(),
          x: canvasBounds ? (canvasBounds.width / 2) - 100 + (canvasRef.current?.scrollLeft || 0) : 50, // Larger default size
          y: canvasBounds ? (canvasBounds.height / 2) - 75 + (canvasRef.current?.scrollTop || 0) : 50,
          text: '[Diagram]', // Placeholder text
          color: 'bg-white', // Default white background for diagrams
          width: 240, // Default width for diagrams
          height: 180, // Default height
          isDiagram: true,
          diagramCode: mermaidCode,
      };
      setNotes(prevNotes => [...prevNotes, newNote]);
      setSelectedNoteId(newNote.id);
      setIsDiagramDialogOpen(false); // Close the dialog
  };


  const startEditingNote = (id: string) => {
     const note = notes.find(n => n.id === id);
     if (note?.isDiagram) return; // Don't allow text editing for diagram notes

     setNotes(prevNotes =>
       prevNotes.map(n => n.id === id ? { ...n, isEditing: true } : { ...n, isEditing: false })
     );
     setSelectedNoteId(id);
  };

   // --- Drag and Drop Logic ---
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>, id: string) => { /* ... (keep existing logic) ... */
     if (e.button !== 0) return; e.preventDefault(); e.stopPropagation(); pointerDownTimeRef.current = Date.now(); isDraggingRef.current = false; const noteElement = e.currentTarget; const startX = e.clientX; const startY = e.clientY; const noteRect = noteElement.getBoundingClientRect(); const offsetX = startX - noteRect.left; const offsetY = startY - noteRect.top; setDraggingNoteId(id); setDragOffset({ x: offsetX, y: offsetY }); setSelectedNoteId(id);
  };
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>, id: string) => { /* ... (keep existing logic) ... */
     e.stopPropagation(); pointerDownTimeRef.current = Date.now(); isDraggingRef.current = false; const noteElement = e.currentTarget; const touch = e.touches[0]; const startX = touch.clientX; const startY = touch.clientY; const noteRect = noteElement.getBoundingClientRect(); const offsetX = startX - noteRect.left; const offsetY = startY - noteRect.top; if (longPressTimeoutRef.current) { clearTimeout(longPressTimeoutRef.current); } longPressTimeoutRef.current = setTimeout(() => { setDraggingNoteId(id); setDragOffset({ x: offsetX, y: offsetY }); isDraggingRef.current = true; navigator.vibrate?.(50); setSelectedNoteId(id); document.body.classList.add('dragging-touch'); longPressTimeoutRef.current = null; }, 200);
  };
   const handlePointerMove = useCallback((clientX: number, clientY: number) => { /* ... (keep existing logic) ... */
      if (!draggingNoteId || !canvasRef.current) return; if (longPressTimeoutRef.current) { clearTimeout(longPressTimeoutRef.current); longPressTimeoutRef.current = null; } if (!isDraggingRef.current) { isDraggingRef.current = true; document.body.classList.add('dragging-touch'); } const canvasBounds = canvasRef.current.getBoundingClientRect(); const newCanvasX = clientX - canvasBounds.left - dragOffset.x + canvasRef.current.scrollLeft; const newCanvasY = clientY - canvasBounds.top - dragOffset.y + canvasRef.current.scrollTop; setNotes(prevNotes => prevNotes.map(note => note.id === draggingNoteId ? { ...note, x: newCanvasX, y: newCanvasY } : note ) );
   }, [draggingNoteId, dragOffset]);
   const handleMouseMove = useCallback((e: MouseEvent) => { /* ... (keep existing logic) ... */
        if (draggingNoteId) { e.preventDefault(); handlePointerMove(e.clientX, e.clientY); }
   }, [draggingNoteId, handlePointerMove]);
    const handleTouchMove = useCallback((e: TouchEvent) => { /* ... (keep existing logic) ... */
       if (!draggingNoteId) { if (longPressTimeoutRef.current) { clearTimeout(longPressTimeoutRef.current); longPressTimeoutRef.current = null; } return; } if (isDraggingRef.current) { e.preventDefault(); } const touch = e.touches[0]; handlePointerMove(touch.clientX, touch.clientY);
    }, [draggingNoteId, handlePointerMove]);

    const handleCloseContextMenu = () => { setContextMenu(null); };

    const handleNoteClick = useCallback((id: string) => { /* ... (keep existing logic) ... */
       const note = notes.find(n => n.id === id); if (!isDraggingRef.current && !note?.isEditing) { setSelectedNoteId(id); handleCloseContextMenu(); }
    }, [notes, handleCloseContextMenu]);

    const handlePointerUp = useCallback((e: Event) => { /* ... (keep existing logic) ... */
        const upTime = Date.now(); const pressDuration = upTime - pointerDownTimeRef.current; if (longPressTimeoutRef.current) { clearTimeout(longPressTimeoutRef.current); longPressTimeoutRef.current = null; if (pressDuration < 200 && draggingNoteId) { handleNoteClick(draggingNoteId); } } const wasDragging = isDraggingRef.current; if (draggingNoteId) { setDraggingNoteId(null); } isDraggingRef.current = false; pointerDownTimeRef.current = 0; document.body.classList.remove('dragging-touch');
    }, [draggingNoteId, handleNoteClick]); // Added handleNoteClick

   const handleMouseUp = useCallback((e: MouseEvent) => { handlePointerUp(e); }, [handlePointerUp]);
   const handleTouchEnd = useCallback((e: TouchEvent) => { handlePointerUp(e); }, [handlePointerUp]);

  // Add/Remove window listeners
  useEffect(() => { /* ... (keep existing logic) ... */
    window.addEventListener('mousemove', handleMouseMove, { capture: true }); window.addEventListener('mouseup', handleMouseUp, { capture: true }); window.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true }); window.addEventListener('touchend', handleTouchEnd, { capture: true }); window.addEventListener('touchcancel', handleTouchEnd, { capture: true }); return () => { window.removeEventListener('mousemove', handleMouseMove, { capture: true }); window.removeEventListener('mouseup', handleMouseUp, { capture: true }); window.removeEventListener('touchmove', handleTouchMove, { capture: true }); window.removeEventListener('touchend', handleTouchEnd, { capture: true }); window.removeEventListener('touchcancel', handleTouchEnd, { capture: true }); if (longPressTimeoutRef.current) { clearTimeout(longPressTimeoutRef.current); } document.body.classList.remove('dragging-touch'); };
  }, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);


  // Handle context menu
  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>, id: string) => { /* ... (keep existing logic) ... */
    e.preventDefault(); e.stopPropagation(); const note = notes.find(n => n.id === id); if (!isDraggingRef.current && !note?.isEditing) { setContextMenu({ x: e.clientX, y: e.clientY, noteId: id }); setSelectedNoteId(id); }
  };

  // Close context menu & deselect
  const handleCloseContextMenuAndDeselect = useCallback((e?: React.MouseEvent<HTMLDivElement>) => { /* ... (keep existing logic) ... */
     if (e) { const target = e.target as Element; if (target.closest('.absolute[style^="left"]')) { return; } } setContextMenu(null); setSelectedNoteId(null);
  }, []);


  // Delete a note
  const handleDeleteNote = (id: string) => { /* ... (keep existing logic) ... */
    setNotes(prevNotes => prevNotes.filter(note => note.id !== id)); if (selectedNoteId === id) { setSelectedNoteId(null); } handleCloseContextMenu();
  };

  // Change note color
  const handleChangeNoteColor = (id: string, color: string) => { /* ... (keep existing logic) ... */
     const note = notes.find(n => n.id === id);
     if (note?.isDiagram) return; // Don't change color for diagram notes
     setNotes(prevNotes => prevNotes.map(n => n.id === id ? { ...n, color: color } : n ) ); handleCloseContextMenu();
   };

   // Handle text change
  const handleNoteTextChange = (id: string, text: string) => { /* ... (keep existing logic) ... */
     const note = notes.find(n => n.id === id);
     if (note?.isDiagram) return; // Don't change text for diagram notes
     setNotes(prevNotes => prevNotes.map(n => n.id === id ? { ...n, text: text } : n ) ); if (id === selectedNoteId) { setEditText(text); }
  };

   // Start editing
   const handleStartEditing = (id: string) => { /* ... (keep existing logic) ... */
     if (isDraggingRef.current) return; startEditingNote(id); handleCloseContextMenu();
   };

   // Stop editing on blur
    const handleNoteBlur = (id: string) => { /* ... (keep existing logic) ... */
       setNotes(prevNotes => prevNotes.map(note => note.id === id ? { ...note, isEditing: false } : note ) );
    };


  // Change color for new notes
  const handleChangeNewNoteColor = (color: string) => { setCurrentNoteColor(color); };

  // Update selected note size from sidebar
   const handleSizeChange = (dimension: 'width' | 'height', value: string) => { /* ... (keep existing logic) ... */
       if (!selectedNoteId) return; const numValue = parseInt(value, 10); if (!isNaN(numValue) && numValue > 20) { setNotes(prevNotes => prevNotes.map(note => note.id === selectedNoteId ? { ...note, [dimension]: numValue } : note ) ); if (dimension === 'width') setEditWidth(value); else setEditHeight(value); } else if (value === '') { if (dimension === 'width') setEditWidth(''); else setEditHeight(''); }
   };

   const handleWidthInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { setEditWidth(e.target.value); handleSizeChange('width', e.target.value); };
   const handleHeightInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { setEditHeight(e.target.value); handleSizeChange('height', e.target.value); };

  // Handle text changes from sidebar
  const handleSidebarTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => { /* ... (keep existing logic) ... */
      if (!selectedNoteId) return; const newText = e.target.value; setEditText(newText); handleNoteTextChange(selectedNoteId, newText);
  };


  const handleUndo = () => { console.log('Undo clicked'); };
  const handleRedo = () => { console.log('Redo clicked'); };

  const selectedNote = notes.find(n => n.id === selectedNoteId);


  return (
    <div className="flex h-[calc(100vh-var(--header-height,60px))]">
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
          <Select value={selectedCanvas} onValueChange={(value: CanvasType) => { setSelectedCanvas(value); setSelectedNoteId(null); setContextMenu(null); }} >
            <SelectTrigger className="w-[250px] ml-auto"> <SelectValue placeholder="Select Canvas Type" /> </SelectTrigger>
            <SelectContent> {canvasTemplates.map((template) => ( <SelectItem key={template.value} value={template.value}> {template.label} </SelectItem> ))} </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleSave}><Save className="mr-2 h-4 w-4" /> Save</Button>
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="mr-2 h-4 w-4" /> Export</Button>
          <Button variant="outline" size="sm" onClick={handleAiSuggest} className="hover:glow-accent focus-visible:glow-accent"> <Wand2 className="mr-2 h-4 w-4" /> AI Suggest </Button>
        </header>

        {/* Canvas Area */}
        <ScrollArea className="flex-1 bg-muted/20" viewportRef={canvasRef} >
           <div className="relative w-full h-full p-4 md:p-6 cursor-default" onClick={handleCloseContextMenuAndDeselect} onContextMenu={(e) => {e.preventDefault(); handleCloseContextMenuAndDeselect();}} >
             <CanvasBackground type={selectedCanvas} notes={notes} draggingNoteId={draggingNoteId} selectedNoteId={selectedNoteId} onDragStart={handleDragStart} onTouchStart={handleTouchStart} onContextMenu={handleContextMenu} onNoteTextChange={handleNoteTextChange} onNoteDoubleClick={handleStartEditing} onNoteBlur={handleNoteBlur} onNoteClick={handleNoteClick} />
           </div>
        </ScrollArea>
      </div>

      {/* Sidebar */}
      <aside className="w-72 border-l bg-card p-4 flex flex-col gap-4 flex-shrink-0 overflow-y-auto">
         <div>
            <h3 className="text-lg font-semibold text-primary mb-2">Tools</h3>
            <Button onClick={handleAddNote} className="w-full justify-start hover:glow-primary mb-2"> <PlusCircle className="mr-2 h-4 w-4" /> Add Sticky Note </Button>
            <Button onClick={handleAddDiagramNote} className="w-full justify-start hover:glow-primary mb-4"> <Projector className="mr-2 h-4 w-4" /> Add Diagram Note </Button> {/* Diagram Button */}

            <div className="space-y-2">
                <label className="text-sm font-medium">New Note Color</label>
                <div className="flex flex-wrap gap-2">
                    {STICKY_NOTE_COLORS.map(colorClass => ( <Button key={colorClass} size="icon" className={`h-8 w-8 border border-gray-400/50 ${colorClass} hover:opacity-80 ${currentNoteColor === colorClass ? 'ring-2 ring-primary ring-offset-1' : ''}`} onClick={() => handleChangeNewNoteColor(colorClass)} aria-label={`Set new note color to ${colorClass.split('-')[1]}`} /> ))}
                </div>
            </div>
         </div>
        <Separator />

        {/* Conditional Section for Selected Note */}
        {selectedNote ? (
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary">
                    {selectedNote.isDiagram ? 'Edit Diagram Note' : 'Edit Note'}
                </h3>

                 {/* Edit Text Button (Disabled for Diagrams) */}
                <Button variant="outline" size="sm" onClick={() => handleStartEditing(selectedNoteId!)} className="w-full justify-start focus-visible:glow-accent" disabled={selectedNote.isDiagram}>
                    <Edit3 className="mr-2 h-4 w-4" /> {selectedNote.isDiagram ? 'Diagram (No Text Edit)' : 'Edit Text'}
                </Button>

                {/* Text Area (Disabled/Placeholder for Diagrams) */}
                <div className="space-y-1">
                    <Label htmlFor="note-text-sidebar">Text</Label>
                    <Textarea id="note-text-sidebar" value={editText} onChange={handleSidebarTextChange} placeholder={selectedNote.isDiagram ? "Diagram content managed via generation." : "Enter note text..."} className="h-24 text-sm focus-visible:glow-primary" disabled={selectedNote.isDiagram}/>
                </div>

                 {/* Color Palette (Disabled for Diagrams) */}
                <div className="space-y-2">
                     <Label className={selectedNote.isDiagram ? 'text-muted-foreground' : ''}>Color</Label>
                     <div className="flex flex-wrap gap-2">
                        {STICKY_NOTE_COLORS.map(colorClass => ( <Button key={`edit-${colorClass}`} size="icon" className={`h-8 w-8 border border-gray-400/50 ${colorClass} hover:opacity-80 ${selectedNote.color === colorClass ? 'ring-2 ring-primary ring-offset-1' : ''}`} onClick={() => handleChangeNoteColor(selectedNoteId!, colorClass)} aria-label={`Change note color to ${colorClass.split('-')[1]}`} disabled={selectedNote.isDiagram} /> ))}
                     </div>
                     {selectedNote.isDiagram && <p className="text-xs text-muted-foreground">Diagram notes use a default background.</p>}
                </div>

                 {/* Size Inputs */}
                <div className="grid grid-cols-2 gap-2">
                     <div className="space-y-1">
                         <Label htmlFor="note-width" className="flex items-center gap-1 text-xs"> <ArrowRightLeft className="w-3 h-3 transform rotate-90" /> Width (px) </Label>
                         <Input id="note-width" type="number" value={editWidth} onChange={handleWidthInputChange} className="h-8 text-sm" placeholder="e.g., 96" min="20" />
                     </div>
                     <div className="space-y-1">
                          <Label htmlFor="note-height" className="flex items-center gap-1 text-xs"> <ArrowRightLeft className="w-3 h-3" /> Height (px) </Label>
                         <Input id="note-height" type="number" value={editHeight} onChange={handleHeightInputChange} className="h-8 text-sm" placeholder="e.g., 96" min="20" />
                     </div>
                </div>
                 <Button variant="destructive" size="sm" onClick={() => handleDeleteNote(selectedNoteId!)} className="w-full" > <Trash2 className="mr-2 h-4 w-4" /> Delete Note </Button>
            </div>
         ) : (
             <div className="text-center text-sm text-muted-foreground mt-6 flex flex-col items-center"> <StickyNoteIcon className="h-10 w-10 mb-3 opacity-50"/> <p>Click on a note to select it.</p> <p>Edit its properties here.</p> </div>
         )}

        <div className="mt-auto flex gap-2 pt-4 border-t">
            <Button variant="outline" size="icon" onClick={handleUndo} aria-label="Undo"> <Undo className="h-4 w-4" /> </Button>
            <Button variant="outline" size="icon" onClick={handleRedo} aria-label="Redo"> <Redo className="h-4 w-4" /> </Button>
             <p className="text-xs text-muted-foreground text-center flex-1 self-center"> Tip: Dbl-click/Right-click note </p>
        </div>
      </aside>

      {/* Context Menu */}
      {contextMenu && (
          <DropdownMenu open={!!contextMenu} onOpenChange={(open) => !open && handleCloseContextMenu()}>
               <DropdownMenuTrigger style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, width: 0, height: 0 }} aria-hidden="true" />
               <DropdownMenuContent align="start" className="w-48 z-50">
                   {!notes.find(n => n.id === contextMenu.noteId)?.isDiagram && ( // Only show Edit Text if not a diagram
                       <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleStartEditing(contextMenu.noteId); }}> <Edit3 className="mr-2 h-4 w-4" /> Edit Text </DropdownMenuItem>
                   )}
                   {!notes.find(n => n.id === contextMenu.noteId)?.isDiagram && <Separator />}
                    {!notes.find(n => n.id === contextMenu.noteId)?.isDiagram && <div className="px-2 py-1 text-xs text-muted-foreground">Change Color</div>}
                    {!notes.find(n => n.id === contextMenu.noteId)?.isDiagram && <div className="flex justify-start gap-1 px-2 py-1">
                        {STICKY_NOTE_COLORS.map(colorClass => ( <button key={`ctx-${colorClass}`} className={`h-5 w-5 rounded-full border border-gray-400/50 ${colorClass} hover:opacity-80 focus:outline-none focus:ring-1 focus:ring-primary focus:ring-offset-1`} onClick={(e) => { e.stopPropagation(); handleChangeNoteColor(contextMenu.noteId, colorClass); }} aria-label={`Set color to ${colorClass.split('-')[1]}`} /> ))}
                    </div>}
                    {!notes.find(n => n.id === contextMenu.noteId)?.isDiagram && <Separator />}
                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleDeleteNote(contextMenu.noteId); }} className="text-destructive focus:text-destructive focus:bg-destructive/10" > <Trash2 className="mr-2 h-4 w-4" /> Delete Note </DropdownMenuItem>
               </DropdownMenuContent>
          </DropdownMenu>
       )}

       {/* Diagram Generator Dialog */}
        <Dialog open={isDiagramDialogOpen} onOpenChange={setIsDiagramDialogOpen}>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>Generate Diagram</DialogTitle>
              <DialogDescription>
                Describe the diagram you want the AI to create. It will generate Mermaid code.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <AiDiagramGenerator onDiagramGenerated={handleDiagramGenerated} />
            </div>
            {/* Footer removed as the button inside AiDiagramGenerator handles action */}
          </DialogContent>
        </Dialog>

        {/* Global CSS */}
        <style jsx global>{` body.dragging-touch { overflow: hidden; overscroll-behavior: none; } `}</style>

    </div>
  );
}

// Function to display common header info (optional)
const renderCommonInfoOnCanvas = (info: typeof commonHeaderInfo) => ( /* ... (keep existing function) ... */
     <div className="absolute top-4 left-4 bg-background/80 p-2 rounded shadow text-xs max-w-xs pointer-events-none"> <p><strong>Institute:</strong> {info.instituteName}</p> <p><strong>Project:</strong> {info.projectTitle}</p> <p><strong>Team ID:</strong> {info.teamId}</p> <p><strong>Subject:</strong> {info.subject}</p> <p><strong>Branch:</strong> {info.branch}</p> <p><strong>Semester:</strong> {info.semester}</p> </div>
);
