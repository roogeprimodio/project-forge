
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
    onAddSubSection: (parentId: string) => void;
    isEditing: boolean;
    onCloseSheet?: () => void;
    renderSubSections: (sections: HierarchicalProjectSection[], level: number, parentNumbering: string, onAddSubSection: (parentId: string) => void) => React.ReactNode[];
}

export const HierarchicalSectionItem: React.FC<HierarchicalSectionItemProps> = ({
    section,
    level,
    numbering,
    activeSectionId,
    setActiveSectionId,
    onEditSectionName,
    onDeleteSection,
    onAddSubSection,
    isEditing,
    onCloseSheet,
    renderSubSections,
}) => {
    const isActive = section.id === activeSectionId;
    const [isExpanded, setIsExpanded] = useState(true); // Default to expanded
    const [isNameEditing, setIsNameEditing] = useState(false);
    const [tempName, setTempName] = useState(section.name);
    const { toast } = useToast();
    const hasSubSections = section.subSections && section.subSections.length > 0;
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isNameEditing) {
            setTempName(section.name);
        }
    }, [section.name, isNameEditing]);


    const handleSectionClick = () => {
        if (isEditing || isNameEditing) return;
        setActiveSectionId(section.id);
        onCloseSheet?.();
    };

    const handleToggleExpand = (e: React.MouseEvent) => {
         e.stopPropagation();
         setIsExpanded(!isExpanded);
    };

    const handleEditClick = (e: React.MouseEvent) => {
         e.stopPropagation();
         setTempName(section.name);
         setIsNameEditing(true);
         setTimeout(() => inputRef.current?.focus(), 0);
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDeleteSection(section.id);
    };

    const handleAddSubSectionClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (typeof onAddSubSection !== 'function') {
             console.error("Error: onAddSubSection prop is not a function", { onAddSubSection });
             toast({ variant: "destructive", title: "Error", description: "Could not add sub-section." });
             return;
        }
        onAddSubSection(section.id);
        setIsExpanded(true);
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTempName(e.target.value);
    };

    const handleNameSave = () => {
        if (!tempName.trim()) {
            toast({ variant: "destructive", title: "Invalid Name", description: "Section name cannot be empty." });
            setTempName(section.name); // Revert
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
            setTempName(section.name);
            setIsNameEditing(false);
        }
    };

    const handleNameBlur = () => {
        if (tempName.trim() && tempName.trim() !== section.name) {
            handleNameSave();
        } else {
            setTempName(section.name);
            setIsNameEditing(false);
        }
    };


    // Main item structure
    return (
        <div className="group w-full">
            {/* Main interactive row */}
            <div
                className={cn(
                    "flex group/item relative w-full items-center pr-1 rounded-md", // Add rounded-md
                    (isActive || isNameEditing) && !isEditing ? "bg-secondary" : "hover:bg-muted/50",
                    "cursor-pointer" // Make the whole row subtly indicate clickability
                )}
                 onClick={handleSectionClick} // Click handler on the outer div
                 role="button" // Indicate role
                 tabIndex={0} // Make focusable
                 onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSectionClick(); }} // Keyboard activation
            >
                {/* Indentation, Expand/Collapse Toggle */}
                 <div
                     className="flex items-center flex-shrink-0 h-8" // Fixed height for alignment
                     style={{ paddingLeft: `${level * 1}rem` }} // Reduced indentation multiplier
                     onClick={(e) => e.stopPropagation()} // Prevent click propagation from this area
                 >
                    {hasSubSections ? (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleToggleExpand} // Separate toggle handler
                            className="h-6 w-6 mr-1 text-muted-foreground hover:bg-transparent" // Transparent hover
                            aria-label={isExpanded ? "Collapse section" : "Expand section"}
                            tabIndex={0} // Make toggle focusable independently
                        >
                            {isExpanded ? <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" /> : <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />}
                        </Button>
                    ) : (
                        <span className="w-6 mr-1 flex-shrink-0"></span>
                    )}
                </div>

                {/* Section Icon, Numbering, and Name/Input */}
                 <div
                    className={cn(
                        "flex items-center flex-1 min-w-0 h-8 pl-0", // No extra padding, let indentation handle it
                        isEditing ? 'pr-[60px] sm:pr-[70px]' : '' // Space for edit buttons
                    )}
                     onClick={(e) => e.stopPropagation()} // Prevent click propagation when clicking text/input area
                 >
                    <FileText className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 mr-1 text-muted-foreground" />
                    <span className="font-medium text-xs sm:text-sm text-muted-foreground flex-shrink-0 mr-1">{numbering}</span>
                    {isNameEditing ? (
                        <Input
                            ref={inputRef}
                            value={tempName}
                            onChange={handleNameChange}
                            onKeyDown={handleNameKeyDown}
                            onBlur={handleNameBlur}
                            className="h-6 px-1 text-xs sm:text-sm flex-1 bg-transparent border-b border-primary focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary text-left"
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            aria-label={`Editing section name ${section.name}`}
                        />
                    ) : (
                        <span className="flex-1 truncate text-left text-xs sm:text-sm">{section.name}</span>
                    )}
                </div>


                 {/* Edit, Delete, and Add Sub-section Buttons */}
                 {isEditing && !isNameEditing && (
                     <div className="absolute right-0.5 sm:right-1 top-1/2 transform -translate-y-1/2 flex gap-0 sm:gap-0.5 opacity-100 group-hover/item:opacity-100 transition-opacity z-10 bg-card">
                         <Button variant="ghost" size="icon" className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground hover:text-primary" onClick={handleEditClick} aria-label={`Edit section name ${section.name}`} title="Edit name">
                             <Edit3 className="h-3 w-3 sm:h-4 sm:w-4" />
                         </Button>
                          <Button variant="ghost" size="icon" className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground hover:text-primary" onClick={handleAddSubSectionClick} aria-label={`Add sub-section to ${section.name}`} title="Add sub-section">
                              <PlusCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                         <Button variant="ghost" size="icon" className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground hover:text-destructive" onClick={handleDeleteClick} aria-label={`Delete section ${section.name}`} title="Delete section">
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                    </div>
                 )}
            </div>

            {/* Render Sub-sections recursively */}
            {hasSubSections && isExpanded && (
                <div className="w-full">
                    {renderSubSections(section.subSections!, level + 1, numbering, onAddSubSection)}
                </div>
            )}
        </div>
    );
}
