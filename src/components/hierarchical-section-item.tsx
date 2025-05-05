// src/components/hierarchical-section-item.tsx
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Trash2, Edit3, ChevronDown, ChevronRight, PlusCircle } from 'lucide-react';
import type { HierarchicalProjectSection, SectionIdentifier } from '@/types/project';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// Props interface for HierarchicalSectionItem
export interface HierarchicalSectionItemProps {
    section: HierarchicalProjectSection;
    level: number;
    numbering: string; // To display numbering like 1, 1.1, 1.1.1
    activeSectionId: string | null;
    setActiveSectionId: (id: SectionIdentifier) => void;
    onEditSectionName: (id: string, newName: string) => void;
    onDeleteSection: (id: string) => void;
    onAddSubSection: (parentId: string) => void; // Function to add a sub-section to a specific parent
    isEditing: boolean;
    onCloseSheet?: () => void;
    // Prop to pass down the recursive rendering function
    renderSubSections: (sections: HierarchicalProjectSection[], level: number, parentNumbering: string) => React.ReactNode[];
}

export const HierarchicalSectionItem: React.FC<HierarchicalSectionItemProps> = ({
    section,
    level,
    numbering,
    activeSectionId,
    setActiveSectionId,
    onEditSectionName,
    onDeleteSection,
    onAddSubSection, // Get the add sub-section handler
    isEditing,
    onCloseSheet,
    renderSubSections, // Destructure the render function
}) => {
    const isActive = section.id === activeSectionId;
    const [isExpanded, setIsExpanded] = useState(true); // Default to expanded
    const [isNameEditing, setIsNameEditing] = useState(false);
    const [tempName, setTempName] = useState(section.name);
    const { toast } = useToast();
    const hasSubSections = section.subSections && section.subSections.length > 0;
    const inputRef = useRef<HTMLInputElement>(null);

    // Update tempName if the external section name changes while not editing
    useEffect(() => {
        if (!isNameEditing) {
            setTempName(section.name);
        }
    }, [section.name, isNameEditing]);


    const handleSectionClick = () => {
        if (isEditing || isNameEditing) return; // Prevent click if editing name or structure
        setActiveSectionId(section.id);
        onCloseSheet?.();
    };

    const handleToggleExpand = (e: React.MouseEvent) => {
         e.stopPropagation(); // Prevent parent button click
         setIsExpanded(!isExpanded);
    };

    const handleEditClick = (e: React.MouseEvent) => {
         e.stopPropagation(); // Prevent parent button click
         setTempName(section.name);
         setIsNameEditing(true);
         // Focus the input after state update
         setTimeout(() => inputRef.current?.focus(), 0);
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent parent button click
        onDeleteSection(section.id);
    };

    const handleAddSubSectionClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent parent button click
        onAddSubSection(section.id); // Call the passed handler with the current section's ID as parent
        setIsExpanded(true); // Expand the parent when adding a sub-section
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTempName(e.target.value);
    };

    const handleNameSave = () => {
        if (!tempName.trim()) {
            toast({ variant: "destructive", title: "Invalid Name", description: "Section name cannot be empty." });
            setTempName(section.name); // Revert to original name
            setIsNameEditing(false);
            return;
        }
        if (tempName.trim() !== section.name) {
            onEditSectionName(section.id, tempName.trim());
        }
        setIsNameEditing(false);
    };

    const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleNameSave();
        } else if (e.key === 'Escape') {
            setTempName(section.name); // Revert on escape
            setIsNameEditing(false);
        }
    };

    const handleNameBlur = () => {
        // Save on blur only if the name is valid and changed
        if (tempName.trim() && tempName.trim() !== section.name) {
            handleNameSave();
        } else {
            // Otherwise, revert to original name and exit edit mode
            setTempName(section.name);
            setIsNameEditing(false);
        }
    };


    return (
        <div className="group w-full"> {/* Ensure group takes full width */}
             {/* Main row containing content button and edit buttons */}
            <div className="flex group/item relative w-full items-center"> {/* Use w-full and items-center */}

                {/* Section Content Button - Apply paddingLeft here for indentation */}
                <Button
                    variant={(isActive || isNameEditing) && !isEditing ? "secondary" : "ghost"}
                    size="sm"
                    onClick={handleSectionClick}
                    className={cn(
                        "justify-start text-left flex-1 group/btn h-8 min-w-0 flex items-center", // items-center for vertical alignment
                        "pr-1", // Keep right padding for potential actions
                        isEditing ? 'pr-[70px]' : 'pr-1' // Adjust right padding based on edit mode
                    )}
                    style={{ paddingLeft: `${0.5 + (level * 1.5)}rem` }} // Base padding (0.5rem matches title's pl-2) + level indentation
                    aria-current={isActive && !isEditing && !isNameEditing ? "page" : undefined}
                    title={section.name} // Tooltip
                    disabled={isEditing && !isNameEditing}
                >
                    {/* Toggle Button or Spacer (Positioned absolutely or with negative margin if needed, or keep inline) */}
                     {hasSubSections ? (
                         <Button
                             variant="ghost"
                             size="icon"
                             onClick={handleToggleExpand}
                             className="h-6 w-6 mr-1 text-muted-foreground hover:bg-muted/50 flex-shrink-0" // Kept mr-1 for spacing
                             aria-label={isExpanded ? "Collapse section" : "Expand section"}
                             tabIndex={-1} // Make it non-focusable directly, accessible via parent
                         >
                             {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                         </Button>
                     ) : (
                         <span className="w-6 mr-1 flex-shrink-0"></span> // Placeholder for alignment
                     )}

                    {/* Numbering - Remove extra spacing */}
                    <span className="font-medium text-muted-foreground flex-shrink-0">{numbering}</span>
                    {/* Icon - Reduce margin */}
                    <FileText className="ml-1 h-4 w-4 flex-shrink-0" />
                    {/* Name or Input */}
                    {isNameEditing ? (
                        <Input
                            ref={inputRef}
                            value={tempName}
                            onChange={handleNameChange}
                            onKeyDown={handleNameKeyDown}
                            onBlur={handleNameBlur}
                            className="h-6 px-1 text-sm flex-1 bg-transparent border-b border-primary focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary text-left ml-1" // Added ml-1
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <span className="flex-1 truncate text-left ml-1">{section.name}</span> // Added ml-1
                    )}
                </Button>


                 {/* Edit, Delete, and Add Sub-section Buttons (visible only in edit mode) */}
                 {isEditing && !isNameEditing && (
                     <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex gap-0.5 opacity-100 group-hover/item:opacity-100 transition-opacity z-10 bg-card">
                         <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={handleEditClick} aria-label={`Edit section name ${section.name}`} title="Edit name">
                             <Edit3 className="h-4 w-4" />
                         </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={handleAddSubSectionClick} aria-label={`Add sub-section to ${section.name}`} title="Add sub-section">
                              <PlusCircle className="h-4 w-4" />
                          </Button>
                         <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={handleDeleteClick} aria-label={`Delete section ${section.name}`} title="Delete section">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                 )}
            </div>

            {/* Render Sub-sections recursively */}
            {hasSubSections && isExpanded && (
                <div className="w-full"> {/* Ensure sub-section container takes full width */}
                    {renderSubSections(section.subSections!, level + 1, numbering)}
                </div>
            )}
        </div>
    );
}

