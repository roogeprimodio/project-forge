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
    numbering: string; // Full hierarchical number (e.g., "1", "1.1", "1.1.1")
    activeSectionId: string | null;
    setActiveSectionId: (id: SectionIdentifier) => void;
    onEditSectionName: (id: string, newName: string) => void;
    onDeleteSection: (id: string) => void;
    onAddSubSection: (parentId: string) => void; // Add sub-section under this item
    isEditing: boolean;
    onCloseSheet?: () => void;
    renderSubSections: (sections: HierarchicalProjectSection[], level: number, parentNumbering: string) => React.ReactNode[]; // Pass down render function
}

export const HierarchicalSectionItem: React.FC<HierarchicalSectionItemProps> = ({
    section,
    level,
    numbering, // Use the full numbering passed down
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

    const handleSectionClick = (e: React.MouseEvent | React.KeyboardEvent) => {
         // Allow activating even if it has subsections - click area is the main content row
        if (isEditing || isNameEditing) return;

        setActiveSectionId(section.id);
        onCloseSheet?.();
    };

    const handleToggleExpand = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent section activation when clicking the toggle
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
        onAddSubSection(section.id); // Call the passed handler with the current section's ID as parent
        setIsExpanded(true); // Expand the parent when adding a sub-section
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
        // Avoid saving if clicking delete/add buttons
        requestAnimationFrame(() => {
            if (document.activeElement !== inputRef.current) {
                if (tempName.trim() && tempName.trim() !== section.name) {
                    handleNameSave();
                } else {
                    setTempName(section.name); // Revert if empty or unchanged
                    setIsNameEditing(false);
                }
            }
         });
    };

    return (
        <div className="group w-full"> {/* Ensure group takes full width */}
             {/* Main row containing content button and edit buttons */}
            <div className={cn(
                 "flex group/item relative w-full items-center rounded-md transition-colors duration-150", // Add transition
                 (isActive && !isNameEditing && !isEditing) ? "bg-primary/10" : "hover:bg-muted/50", // Enhanced active/hover states
                 "pr-1" // Space for edit buttons
                 )}
                 >
                {/* Clickable area for section content (excluding edit buttons) */}
                <div
                    className={cn(
                        "flex flex-1 items-center min-w-0 h-8 cursor-pointer", // Use h-8 for consistent height
                         isEditing ? 'pr-[70px]' : '' // Add padding to avoid overlap with edit buttons only when editing
                    )}
                    style={{ paddingLeft: `${level * 1}rem` }} // Apply indentation here
                    onClick={handleSectionClick}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSectionClick(e); }}
                    title={section.name} // Tooltip for truncated names
                >
                     {/* Expand/Collapse Toggle - Rendered only if there are subSections */}
                     {hasSubSections ? (
                         <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleToggleExpand}
                            className="h-6 w-6 mr-1 text-muted-foreground hover:bg-muted/60 flex-shrink-0" // Subtle hover
                            aria-label={isExpanded ? "Collapse section" : "Expand section"}
                            tabIndex={0} // Make toggle focusable independently
                        >
                             {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                         </Button>
                     ) : (
                         // Placeholder for alignment when no sub-sections exist
                         <span className="w-6 mr-1 flex-shrink-0"></span>
                     )}

                     {/* Icon and Numbering */}
                     <FileText className="h-4 w-4 flex-shrink-0 mr-1.5 text-muted-foreground" />
                     <span className="font-medium text-sm text-muted-foreground flex-shrink-0 mr-1.5">{numbering}</span>

                     {/* Name/Input */}
                     {isNameEditing ? (
                        <Input
                            ref={inputRef}
                            value={tempName}
                            onChange={handleNameChange}
                            onKeyDown={handleNameKeyDown}
                            onBlur={handleNameBlur}
                            className="h-6 px-1 text-sm flex-1 bg-transparent border-b border-primary focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary text-left"
                            onClick={(e) => e.stopPropagation()} // Prevent section click while editing name
                            onMouseDown={(e) => e.stopPropagation()} // Prevent drag start issues
                            aria-label={`Editing section name ${section.name}`}
                        />
                     ) : (
                         <span className="flex-1 truncate text-left text-sm">{section.name}</span>
                     )}
                 </div>

                 {/* Edit, Delete, and Add Sub-section Buttons (Absolute Positioned) */}
                 {isEditing && !isNameEditing && (
                     <div className="absolute right-0.5 top-1/2 transform -translate-y-1/2 flex items-center gap-0 opacity-100 group-hover/item:opacity-100 transition-opacity z-10 bg-card">
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
                <div className="w-full border-l border-muted/50" style={{ marginLeft: `${level * 1 + 1.25}rem` }}> {/* Indent sub-sections container slightly, add subtle border */}
                    {renderSubSections(section.subSections!, level + 1, numbering)}
                </div>
            )}
        </div>
    );
};