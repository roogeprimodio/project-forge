// src/app/canva/page.tsx
"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // Import Label
import { ScrollArea } from '@/components/ui/scroll-area';
import { Paintbrush, Save, Download, Wand2, StickyNote as StickyNoteIcon, Undo, Redo, Palette, PlusCircle, Trash2, Edit3, Square, ArrowRightLeft } from 'lucide-react'; // Added icons
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator'; // Import Separator
import { Textarea } from '@/components/ui/textarea'; // Import Textarea for sidebar editing

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

// Available Colors
const STICKY_NOTE_COLORS = ['bg-yellow-200', 'bg-pink-200', 'bg-blue-200', 'bg-green-200', 'bg-purple-200', 'bg-orange-200']; // Added more colors


// Sticky Note Component
const StickyNote = React.memo(({
    note,
    isDragging,
    isSelected, // New prop to indicate selection for sidebar editing
    onDragStart,
    onTouchStart,
    onContextMenu,
    onTextChange, // Changed: now takes only new text
    onDoubleClick,
    onBlur,
    onClick, // New prop for single click selection
}: {
    note: StickyNoteData;
    isDragging: boolean;
    isSelected: boolean; // New prop
    onDragStart: (e: React.MouseEvent<HTMLDivElement>, id: string) => void;
    onTouchStart: (e: React.TouchEvent<HTMLDivElement>, id: string) => void;
    onContextMenu: (e: React.MouseEvent<HTMLDivElement>, id: string) => void;
    onTextChange: (text: string) => void; // Changed signature
    onDoubleClick: (id: string) => void; // For initiating edit
    onBlur: (id: string) => void; // For finishing edit
    onClick: (id: string) => void; // New prop
}) => {
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (note.isEditing && textAreaRef.current) {
            textAreaRef.current.focus();
            textAreaRef.current.select();
        }
    }, [note.isEditing]);

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        // Stop propagation to prevent canvas click handlers (deselect)
        e.stopPropagation();
        // Prevent triggering click during/immediately after drag or while editing
        if (note.isEditing || isDragging) {
             return;
        }
        onClick(note.id);
    };

     const handleBlur = () => {
       onBlur(note.id);
     };


    return (
        <div
            className={cn(
                `absolute p-2 shadow-md rounded text-sm text-black cursor-grab active:cursor-grabbing border border-gray-400/50 flex flex-col touch-none overflow-hidden`, // Added overflow-hidden
                note.color,
                isDragging && 'ring-2 ring-blue-500 ring-offset-2 scale-105 shadow-xl cursor-grabbing z-50 opacity-80', // Dragging style (changed ring color, added opacity)
                isSelected && !isDragging && 'ring-2 ring-primary ring-offset-1 z-10', // Selection style (only if not dragging)
                note.isEditing && 'cursor-text z-20 ring-2 ring-blue-500 ring-offset-1' // Editing style with ring
            )}
            style={{
                left: `${note.x}px`,
                top: `${note.y}px`,
                width: `${note.width}px`,
                height: `${note.height}px`,
                // Add transitions for smoother movement (optional)
                // transition: isDragging ? 'none' : 'left 0.05s ease-out, top 0.05s ease-out',
            }}
            onMouseDown={(e) => !note.isEditing && onDragStart(e, note.id)}
            onTouchStart={(e) => !note.isEditing && onTouchStart(e, note.id)}
            onContextMenu={(e) => !note.isEditing && onContextMenu(e, note.id)} // Only context menu if not editing
            onDoubleClick={(e) => {
                e.stopPropagation();
                // Prevent double click during drag or right after
                if (!isDragging) {
                    onDoubleClick(note.id);
                }
            }}
             onClick={handleClick} // Use the wrapped click handler
        >
            {note.isEditing ? (
                <textarea
                    ref={textAreaRef}
                    className="w-full h-full bg-transparent border-none resize-none outline-none text-xs focus:ring-0" // Removed focus ring from textarea itself
                    value={note.text}
                    onChange={(e) => onTextChange(e.target.value)} // Pass only text
                    onBlur={handleBlur} // Use wrapper
                    onMouseDown={(e) => e.stopPropagation()} // Prevent drag when clicking textarea
                    onTouchStart={(e) => e.stopPropagation()} // Prevent drag when touching textarea
                    onClick={(e) => e.stopPropagation()} // Prevent note selection click when clicking textarea
                />
            ) : (
                 // Display text, handle overflow
                 <div className="w-full h-full overflow-hidden whitespace-pre-wrap text-xs break-words pointer-events-none"> {/* Keep pointer-events-none */}
                    {note.text || <span className="text-muted-foreground italic">Edit...</span>} {/* Placeholder */}
                 </div>
            )}
        </div>
    );
});
StickyNote.displayName = 'StickyNote'; // Add display name


// Placeholder for Canvas Backgrounds - Updated with new types and sections
const CanvasBackground = ({
    type,
    notes,
    draggingNoteId,
    selectedNoteId, // Added selectedNoteId
    onDragStart,
    onTouchStart,
    onContextMenu,
    onNoteTextChange, // Changed: now takes id and text
    onNoteDoubleClick,
    onNoteBlur,
    onNoteClick, // Added onNoteClick
}: {
    type: CanvasType;
    notes: StickyNoteData[];
    draggingNoteId: string | null;
    selectedNoteId: string | null; // Added selectedNoteId prop
    onDragStart: (e: React.MouseEvent<HTMLDivElement>, id: string) => void;
    onTouchStart: (e: React.TouchEvent<HTMLDivElement>, id: string) => void;
    onContextMenu: (e: React.MouseEvent<HTMLDivElement>, id: string) => void;
    onNoteTextChange: (id: string, text: string) => void; // Changed signature
    onNoteDoubleClick: (id: string) => void;
    onNoteBlur: (id: string) => void;
    onNoteClick: (id: string) => void; // Added onNoteClick prop
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
                        isDragging={note.id === draggingNoteId} // Pass dragging state
                        isSelected={note.id === selectedNoteId} // Pass selected state
                        onDragStart={onDragStart}
                        onTouchStart={onTouchStart} // Pass touch handler
                        onContextMenu={onContextMenu}
                        onTextChange={(text) => onNoteTextChange(note.id, text)} // Pass id and text
                        onDoubleClick={onNoteDoubleClick}
                        onBlur={onNoteBlur}
                        onClick={onNoteClick} // Pass click handler
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
                    isDragging={note.id === draggingNoteId} // Pass dragging state
                    isSelected={note.id === selectedNoteId} // Pass selected state
                    onDragStart={onDragStart}
                    onTouchStart={onTouchStart} // Pass touch handler
                    onContextMenu={onContextMenu}
                    onTextChange={(text) => onNoteTextChange(note.id, text)} // Pass id and text
                    onDoubleClick={onNoteDoubleClick}
                    onBlur={onNoteBlur}
                    onClick={onNoteClick} // Pass click handler
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
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null); // Track selected note for sidebar editing
  const [editWidth, setEditWidth] = useState(''); // Width for sidebar editor
  const [editHeight, setEditHeight] = useState(''); // Height for sidebar editor
  const [editText, setEditText] = useState(''); // Text for sidebar editor

  const canvasRef = useRef<HTMLDivElement>(null);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref for long press timeout
  const dragStartTimeRef = useRef<number>(0); // To differentiate click from drag
  const isDraggingRef = useRef(false); // Ref to track dragging state precisely
  const pointerDownTimeRef = useRef<number>(0); // Track initial pointer down time

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

  // Update sidebar edit fields when selectedNoteId changes
  useEffect(() => {
    const selected = notes.find(n => n.id === selectedNoteId);
    if (selected) {
        setEditWidth(String(selected.width));
        setEditHeight(String(selected.height));
        setEditText(selected.text); // Update text in sidebar
    } else {
      // Clear fields if no note is selected
      setEditWidth('');
      setEditHeight('');
      setEditText(''); // Clear text
    }
  }, [selectedNoteId, notes]);


  const handleSave = () => { console.log('Save clicked', notes); /* Implement save logic */ };
  const handleExport = () => { console.log('Export clicked'); /* Implement export logic */ };
  const handleAiSuggest = () => { console.log('AI Suggest clicked'); /* Implement AI suggestion logic */ };

  // Add a new sticky note
  const handleAddNote = () => {
    const canvasBounds = canvasRef.current?.getBoundingClientRect();
    const newNote: StickyNoteData = {
      id: uuidv4(),
       x: canvasBounds ? (canvasBounds.width / 2) - 50 + (canvasRef.current?.scrollLeft || 0) : 50, // Centered, adjusted for scroll
       y: canvasBounds ? (canvasBounds.height / 2) - 50 + (canvasRef.current?.scrollTop || 0) : 50, // Centered, adjusted for scroll
      text: '',
      color: currentNoteColor, // Use current selected color
      width: 96, // Default width (w-24)
      height: 96, // Default height (h-24)
    };
    setNotes(prevNotes => [...prevNotes, newNote]);
    setSelectedNoteId(newNote.id); // Select the new note
    // Automatically trigger edit for the new note
    startEditingNote(newNote.id);
  };


  const startEditingNote = (id: string) => {
     setNotes(prevNotes =>
       prevNotes.map(note =>
         note.id === id ? { ...note, isEditing: true } : { ...note, isEditing: false } // Deactivate others
       )
     );
     setSelectedNoteId(id); // Ensure it's selected
  };

   // --- Drag and Drop Logic (Mouse) ---
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>, id: string) => {
    if (e.button !== 0) return; // Only left click
    e.preventDefault();
    e.stopPropagation();

    pointerDownTimeRef.current = Date.now(); // Record pointer down time
    isDraggingRef.current = false; // Reset dragging flag

    const noteElement = e.currentTarget;
    const startX = e.clientX;
    const startY = e.clientY;
    const noteRect = noteElement.getBoundingClientRect();
    const offsetX = startX - noteRect.left;
    const offsetY = startY - noteRect.top;

    setDraggingNoteId(id);
    setDragOffset({ x: offsetX, y: offsetY });
    setSelectedNoteId(id); // Select note on drag start
  };

  // --- Drag and Drop Logic (Touch with Optimized Long Press) ---
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>, id: string) => {
    e.stopPropagation();
    pointerDownTimeRef.current = Date.now(); // Record pointer down time
    isDraggingRef.current = false; // Reset dragging flag

    const noteElement = e.currentTarget;
    const touch = e.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;
    const noteRect = noteElement.getBoundingClientRect();
    const offsetX = startX - noteRect.left;
    const offsetY = startY - noteRect.top;

    // Clear any previous long press timeout
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
    }

    // Set timeout for long press to initiate drag
    longPressTimeoutRef.current = setTimeout(() => {
        // If timeout fires, it's a drag
        setDraggingNoteId(id);
        setDragOffset({ x: offsetX, y: offsetY });
        isDraggingRef.current = true; // Mark as dragging immediately when timeout fires
        navigator.vibrate?.(50); // Haptic feedback
        setSelectedNoteId(id); // Ensure note is selected
        document.body.classList.add('dragging-touch');
        longPressTimeoutRef.current = null; // Clear the ref after firing
    }, 200); // Slightly shorter long press duration (adjust as needed)
  };

   // --- Universal Move Handler (Mouse & Touch) ---
   const handlePointerMove = useCallback((clientX: number, clientY: number) => {
       if (!draggingNoteId || !canvasRef.current) return;

       // If a long press timer is still active, clear it - movement cancels long press
       if (longPressTimeoutRef.current) {
            clearTimeout(longPressTimeoutRef.current);
            longPressTimeoutRef.current = null;
       }

       // Determine if it's *actually* dragging (moved beyond threshold OR long press fired)
        // No need for explicit threshold check here if long press sets isDraggingRef.current
       if (!isDraggingRef.current) {
           // Optional: Add a small movement threshold if needed, e.g., if long press didn't fire yet
           // const movedEnough = Math.abs(clientX - startX) > 5 || Math.abs(clientY - startY) > 5; // Example threshold
           // if (movedEnough) { isDraggingRef.current = true; } else { return; }
           isDraggingRef.current = true; // Assume movement means dragging if no long press timer
           document.body.classList.add('dragging-touch'); // Ensure class is added on first move
       }


       const canvasBounds = canvasRef.current.getBoundingClientRect();
       // Calculate new position relative to canvas viewport, adjusted for scroll
       const newCanvasX = clientX - canvasBounds.left - dragOffset.x + canvasRef.current.scrollLeft;
       const newCanvasY = clientY - canvasBounds.top - dragOffset.y + canvasRef.current.scrollTop;

       // Debounce or throttle state updates if performance is an issue
       setNotes(prevNotes =>
         prevNotes.map(note =>
           note.id === draggingNoteId ? { ...note, x: newCanvasX, y: newCanvasY } : note
         )
       );
   }, [draggingNoteId, dragOffset]); // Removed handlePointerMove


   // Handle mouse move for dragging
   const handleMouseMove = useCallback((e: MouseEvent) => {
        if (draggingNoteId) {
             e.preventDefault(); // Prevent text selection
             handlePointerMove(e.clientX, e.clientY);
        }
   }, [draggingNoteId, handlePointerMove]);

   // Handle touch move for dragging
    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (!draggingNoteId) {
             // If no note is being dragged BUT a long press timer is active, clear it.
             if (longPressTimeoutRef.current) {
                 clearTimeout(longPressTimeoutRef.current);
                 longPressTimeoutRef.current = null;
             }
             return; // Not dragging anything
        }

        // Prevent scroll only if dragging has actually started
        if (isDraggingRef.current) {
             e.preventDefault();
        }

        const touch = e.touches[0];
        handlePointerMove(touch.clientX, touch.clientY);
    }, [draggingNoteId, handlePointerMove]);


  // Close context menu only
  const handleCloseContextMenu = () => {
     setContextMenu(null);
  };

    // --- Single Click Note Selection ---
    const handleNoteClick = useCallback((id: string) => {
        // Only select if not dragging and not editing
        const note = notes.find(n => n.id === id);
        if (!isDraggingRef.current && !note?.isEditing) {
            setSelectedNoteId(id);
            handleCloseContextMenu(); // Close menu if open
        }
    }, [notes, handleCloseContextMenu]); // Added notes, handleCloseContextMenu dependencies


  // --- Universal Up Handler (Mouse & Touch) ---
  const handlePointerUp = useCallback((e: Event) => { // Accept event for context menu check
      const upTime = Date.now();
      const pressDuration = upTime - pointerDownTimeRef.current;

      // 1. Clear long press timeout if it exists (touch up before timeout fires)
      if (longPressTimeoutRef.current) {
          clearTimeout(longPressTimeoutRef.current);
          longPressTimeoutRef.current = null;
           // If touch up happens quickly after touch start, and wasn't dragging, treat as click/tap
          if (pressDuration < 200 && draggingNoteId) { // Use the same threshold as long press
              handleNoteClick(draggingNoteId); // Trigger selection/click
          }
      }

      // 2. Check if dragging actually occurred
      const wasDragging = isDraggingRef.current;

      // 3. Reset dragging state *before* potential click handling
      if (draggingNoteId) {
          setDraggingNoteId(null); // Stop dragging state
      }
      isDraggingRef.current = false;
      pointerDownTimeRef.current = 0; // Reset timer

      // 4. Cleanup body class
      document.body.classList.remove('dragging-touch');

      // 5. Handle click vs. drag end
      // If it *was* dragging, do nothing more (drag ended).
      // If it *wasn't* dragging (i.e., a short tap/click or aborted long press)
      // AND it wasn't a right-click (context menu), handle as a click.
      // Note: handleNoteClick is already called above for quick taps during touch.
      // Mouse clicks are handled by the note's onClick directly.
      // We mainly need to ensure drag end doesn't trigger a click.


  }, [draggingNoteId]); // Removed handleNoteClick dependency


   // Stop dragging (Mouse)
   const handleMouseUp = useCallback((e: MouseEvent) => {
       handlePointerUp(e);
   }, [handlePointerUp]);

   // Stop dragging (Touch)
   const handleTouchEnd = useCallback((e: TouchEvent) => {
       handlePointerUp(e);
   }, [handlePointerUp]);

  // Add mouse/touch move and up listeners to the window
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove, { capture: true });
    window.addEventListener('mouseup', handleMouseUp, { capture: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
    window.addEventListener('touchend', handleTouchEnd, { capture: true });
    window.addEventListener('touchcancel', handleTouchEnd, { capture: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove, { capture: true });
      window.removeEventListener('mouseup', handleMouseUp, { capture: true });
      window.removeEventListener('touchmove', handleTouchMove, { capture: true });
      window.removeEventListener('touchend', handleTouchEnd, { capture: true });
      window.removeEventListener('touchcancel', handleTouchEnd, { capture: true });
      if (longPressTimeoutRef.current) {
          clearTimeout(longPressTimeoutRef.current);
      }
      document.body.classList.remove('dragging-touch');
    };
  }, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);


  // Handle right-click context menu (only if not dragging)
  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    // Only show context menu if not dragging and not editing
    const note = notes.find(n => n.id === id);
    if (!isDraggingRef.current && !note?.isEditing) {
        setContextMenu({ x: e.clientX, y: e.clientY, noteId: id });
        setSelectedNoteId(id); // Select on context menu
    }
  };

  // Close context menu & deselect note if clicking outside
  const handleCloseContextMenuAndDeselect = useCallback((e?: React.MouseEvent<HTMLDivElement>) => { // Make event optional
     // Prevent closing if the click is on a note itself (handled by note's onClick)
     if (e) {
        const target = e.target as Element;
        // Check if the click target or its ancestor is a sticky note
        if (target.closest('.absolute[style^="left"]')) { // Basic check for sticky note div
            return;
        }
     }

    setContextMenu(null);
    setSelectedNoteId(null); // Deselect note
  }, []);


  // Delete a note
  const handleDeleteNote = (id: string) => {
    setNotes(prevNotes => prevNotes.filter(note => note.id !== id));
    if (selectedNoteId === id) {
        setSelectedNoteId(null); // Deselect if the deleted note was selected
    }
    handleCloseContextMenu(); // Close context menu if open
  };

  // Change note color from context menu OR sidebar
  const handleChangeNoteColor = (id: string, color: string) => {
     setNotes(prevNotes =>
       prevNotes.map(note =>
         note.id === id ? { ...note, color: color } : note
       )
     );
     handleCloseContextMenu(); // Close context menu if open
   };

   // Handle text change in sticky note textarea OR sidebar textarea
  const handleNoteTextChange = (id: string, text: string) => {
    setNotes(prevNotes =>
      prevNotes.map(note =>
        note.id === id ? { ...note, text: text } : note
      )
    );
     // Also update sidebar text if the edited note is selected
     if (id === selectedNoteId) {
         setEditText(text);
     }
  };

   // Set editing flag on double click OR sidebar button click
   const handleStartEditing = (id: string) => {
     // Prevent edit if dragging was just active
     if (isDraggingRef.current) return;
     startEditingNote(id);
     handleCloseContextMenu(); // Close menu if open
   };

   // Unset editing flag on blur
    const handleNoteBlur = (id: string) => {
      // Check if the blur target is within the sidebar text area to prevent premature closing
      // This might need refinement depending on exact event flow
      // For simplicity, assume any blur means stop editing for now.
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

  // Update selected note size from sidebar input
   const handleSizeChange = (dimension: 'width' | 'height', value: string) => {
       if (!selectedNoteId) return;
       const numValue = parseInt(value, 10);
       if (!isNaN(numValue) && numValue > 20) { // Basic validation (e.g., min size 20px)
           setNotes(prevNotes =>
               prevNotes.map(note =>
                   note.id === selectedNoteId ? { ...note, [dimension]: numValue } : note
               )
           );
           // Update the corresponding state for the input field
           if (dimension === 'width') setEditWidth(value);
           else setEditHeight(value);
       } else if (value === '') {
           // Allow clearing the input, keep state empty
           if (dimension === 'width') setEditWidth('');
           else setEditHeight('');
           // Optionally reset to a default size or keep last valid size in the note data
           // For simplicity, let's allow empty input but not update the note data unless it's valid
       }
   };

   const handleWidthInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
       setEditWidth(e.target.value); // Update local state immediately
       handleSizeChange('width', e.target.value); // Then validate and update note data
   };

   const handleHeightInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
       setEditHeight(e.target.value); // Update local state immediately
       handleSizeChange('height', e.target.value); // Then validate and update note data
   };

  // Handle text changes from the sidebar textarea
  const handleSidebarTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!selectedNoteId) return;
      const newText = e.target.value;
      setEditText(newText); // Update sidebar state
      handleNoteTextChange(selectedNoteId, newText); // Update actual note data
  };


  const handleUndo = () => { console.log('Undo clicked'); /* Implement undo */ };
  const handleRedo = () => { console.log('Redo clicked'); /* Implement redo */ };

  const selectedNote = notes.find(n => n.id === selectedNoteId);


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
            onValueChange={(value: CanvasType) => {
                 setSelectedCanvas(value);
                 setSelectedNoteId(null); // Deselect note when changing canvas type
                 setContextMenu(null); // Close context menu
            }}
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
               className="relative w-full h-full p-4 md:p-6 cursor-default" // Use full height
               onClick={handleCloseContextMenuAndDeselect} // Close context menu & deselect on canvas click
               onContextMenu={(e) => {e.preventDefault(); handleCloseContextMenuAndDeselect();}} // Prevent default canvas menu & deselect
            >
             <CanvasBackground
                type={selectedCanvas}
                notes={notes}
                draggingNoteId={draggingNoteId}
                selectedNoteId={selectedNoteId} // Pass selected ID
                onDragStart={handleDragStart}
                onTouchStart={handleTouchStart}
                onContextMenu={handleContextMenu}
                onNoteTextChange={handleNoteTextChange} // Pass changed handler
                onNoteDoubleClick={handleStartEditing} // Use wrapper
                onNoteBlur={handleNoteBlur}
                onNoteClick={handleNoteClick} // Pass click handler
              />
           </div>
        </ScrollArea>
      </div>

      {/* Sidebar */}
      <aside className="w-72 border-l bg-card p-4 flex flex-col gap-4 flex-shrink-0 overflow-y-auto"> {/* Wider sidebar */}
        {/* Always Show Add Note and New Note Color */}
         <div>
            <h3 className="text-lg font-semibold text-primary mb-2">Tools</h3>
            <Button onClick={handleAddNote} className="w-full justify-start hover:glow-primary mb-4">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Sticky Note
            </Button>

            <div className="space-y-2">
                <label className="text-sm font-medium">New Note Color</label>
                <div className="flex flex-wrap gap-2"> {/* Use flex-wrap */}
                    {STICKY_NOTE_COLORS.map(colorClass => (
                        <Button
                            key={colorClass}
                            size="icon"
                            className={`h-8 w-8 border border-gray-400/50 ${colorClass} hover:opacity-80 ${currentNoteColor === colorClass ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                            onClick={() => handleChangeNewNoteColor(colorClass)}
                            aria-label={`Set new note color to ${colorClass.split('-')[1]}`}
                        />
                     ))}
                </div>
            </div>
         </div>

        <Separator />

        {/* Conditional Section for Selected Note */}
        {selectedNote ? (
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary">Edit Note</h3>

                 {/* Edit Text Button */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStartEditing(selectedNoteId!)}
                    className="w-full justify-start focus-visible:glow-accent"
                >
                    <Edit3 className="mr-2 h-4 w-4" /> Edit Text (or double-click note)
                </Button>

                {/* Text Area for Sidebar Editing */}
                <div className="space-y-1">
                    <Label htmlFor="note-text-sidebar">Text</Label>
                    <Textarea
                        id="note-text-sidebar"
                        value={editText}
                        onChange={handleSidebarTextChange}
                        placeholder="Enter note text..."
                        className="h-24 text-sm focus-visible:glow-primary" // Adjust height as needed
                    />
                </div>


                 {/* Color Palette for Selected Note */}
                <div className="space-y-2">
                     <Label>Color</Label>
                     <div className="flex flex-wrap gap-2">
                        {STICKY_NOTE_COLORS.map(colorClass => (
                            <Button
                                key={`edit-${colorClass}`}
                                size="icon"
                                className={`h-8 w-8 border border-gray-400/50 ${colorClass} hover:opacity-80 ${selectedNote.color === colorClass ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                                onClick={() => handleChangeNoteColor(selectedNoteId!, colorClass)}
                                aria-label={`Change note color to ${colorClass.split('-')[1]}`}
                            />
                        ))}
                     </div>
                </div>

                 {/* Size Inputs */}
                <div className="grid grid-cols-2 gap-2">
                     <div className="space-y-1">
                         <Label htmlFor="note-width" className="flex items-center gap-1 text-xs">
                            <ArrowRightLeft className="w-3 h-3 transform rotate-90" /> Width (px)
                         </Label>
                         <Input
                            id="note-width"
                            type="number"
                            value={editWidth}
                            onChange={handleWidthInputChange}
                            className="h-8 text-sm"
                            placeholder="e.g., 96"
                            min="20"
                         />
                     </div>
                     <div className="space-y-1">
                          <Label htmlFor="note-height" className="flex items-center gap-1 text-xs">
                             <ArrowRightLeft className="w-3 h-3" /> Height (px)
                          </Label>
                         <Input
                            id="note-height"
                            type="number"
                            value={editHeight}
                            onChange={handleHeightInputChange}
                            className="h-8 text-sm"
                            placeholder="e.g., 96"
                            min="20"
                         />
                     </div>
                </div>

                {/* Delete Button for Selected Note */}
                 <Button
                     variant="destructive"
                     size="sm"
                     onClick={() => handleDeleteNote(selectedNoteId!)}
                     className="w-full"
                 >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Note
                 </Button>
            </div>
         ) : (
             <div className="text-center text-sm text-muted-foreground mt-6 flex flex-col items-center">
                 <StickyNoteIcon className="h-10 w-10 mb-3 opacity-50"/>
                 <p>Click on a note to select it.</p>
                 <p>Edit its properties here.</p>
             </div>
         )}


        {/* Undo/Redo always at the bottom */}
        <div className="mt-auto flex gap-2 pt-4 border-t">
            <Button variant="outline" size="icon" onClick={handleUndo} aria-label="Undo">
                <Undo className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleRedo} aria-label="Redo">
                <Redo className="h-4 w-4" />
            </Button>
             <p className="text-xs text-muted-foreground text-center flex-1 self-center">
                 Tip: Dbl-click/Right-click note
             </p>
        </div>
      </aside>

      {/* Context Menu */}
      {contextMenu && (
          <DropdownMenu open={!!contextMenu} onOpenChange={(open) => !open && handleCloseContextMenu()}>
               <DropdownMenuTrigger
                    style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, width: 0, height: 0 }}
                    aria-hidden="true"
                />
               <DropdownMenuContent align="start" className="w-48 z-50"> {/* Wider menu */}
                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleStartEditing(contextMenu.noteId); }}>
                        <Edit3 className="mr-2 h-4 w-4" /> Edit Text
                    </DropdownMenuItem>
                    <Separator />
                    <div className="px-2 py-1 text-xs text-muted-foreground">Change Color</div>
                    {/* Row of color circles */}
                    <div className="flex justify-start gap-1 px-2 py-1">
                        {STICKY_NOTE_COLORS.map(colorClass => (
                            <button
                                key={`ctx-${colorClass}`}
                                className={`h-5 w-5 rounded-full border border-gray-400/50 ${colorClass} hover:opacity-80 focus:outline-none focus:ring-1 focus:ring-primary focus:ring-offset-1`}
                                onClick={(e) => { e.stopPropagation(); handleChangeNoteColor(contextMenu.noteId, colorClass); }} // Stop propagation here too
                                aria-label={`Set color to ${colorClass.split('-')[1]}`}
                            />
                         ))}
                    </div>
                    <Separator />
                    <DropdownMenuItem
                        onSelect={(e) => { e.preventDefault(); handleDeleteNote(contextMenu.noteId); }}
                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Note
                    </DropdownMenuItem>
               </DropdownMenuContent>
          </DropdownMenu>
       )}

        {/* Global CSS for touch dragging */}
        <style jsx global>{`
          body.dragging-touch {
            overflow: hidden; /* Prevent scrolling */
            overscroll-behavior: none; /* Prevent pull-to-refresh/bounce */
            /* Optional: Improve visual feedback */
            /* cursor: grabbing !important; */
          }
          /* Optional: Style for note being dragged */
          /* .dragging-note { opacity: 0.8; transform: scale(1.05); } */
        `}</style>

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

    