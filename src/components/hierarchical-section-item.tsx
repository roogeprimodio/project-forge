// src/components/hierarchical-section-item.tsx
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Import Input for editing
import { FileText, Trash2, Edit3, ChevronDown, ChevronRight, PlusCircle } from 'lucide-react'; // Added PlusCircle
import type { HierarchicalProjectSection } from '@/types/project';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast'; // Import useToast

// Props interface for HierarchicalSectionItem
export interface HierarchicalSectionItemProps {
    section: HierarchicalProjectSection;
    level: number;
    activeSectionId: string | null;
    setActiveSectionId: (id: string | number) => void; // Allow number for standard pages
    onEditSectionName: (id: string, newName: string) => void; // Changed signature
    onDeleteSection: (id: string) => void;
    onAddSubSection: (parentId: string) => void; // Added prop for adding sub-sections
    isEditing: boolean;
    onCloseSheet?: () => void;
}

export const HierarchicalSectionItem: React.FC<HierarchicalSectionItemProps> = ({
    section,
    level,
    activeSectionId,
    setActiveSectionId,
    onEditSectionName,
    onDeleteSection,
    onAddSubSection,
    isEditing,
    onCloseSheet,
}) => {
    // IMPORTANT: Ensure section.id is always unique across the entire project structure.
    // If duplicate IDs exist, React's reconciliation will fail, causing "key" prop warnings.
    const isActive = section.id === activeSectionId;
    const [isExpanded, setIsExpanded] = useState(true);
    const [isNameEditing, setIsNameEditing] = useState(false); // State for inline name editing
    const [tempName, setTempName] = useState(section.name); // Temporary name for editing
    const { toast } = useToast(); // Get toast function
    const hasSubSections = section.subSections && section.subSections.length > 0;
    const inputRef = React.useRef<HTMLInputElement>(null); // Ref for the input field


    const handleSectionClick = () => {
        if (isEditing || isNameEditing) return; // Don't change selection in edit mode or during name editing
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
         // Focus the input after state update
         setTimeout(() => inputRef.current?.focus(), 0);
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDeleteSection(section.id);
    };

    const handleAddSubSectionClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onAddSubSection(section.id);
        setIsExpanded(true); // Ensure parent is expanded when adding a sub-section
    };


    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTempName(e.target.value);
    };

    const handleNameSave = () => {
        if (!tempName.trim()) {
            toast({ variant: "destructive", title: "Invalid Name", description: "Section name cannot be empty." });
            setTempName(section.name); // Revert to original name if invalid
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
            setTempName(section.name); // Revert changes on Escape
            setIsNameEditing(false);
        }
    };

    const handleNameBlur = () => {
        // Save on blur only if the name is valid and different
        if (tempName.trim() && tempName.trim() !== section.name) {
            handleNameSave();
        } else {
            // If invalid or unchanged, just cancel editing
            setTempName(section.name);
            setIsNameEditing(false);
        }
    };


    return (
        <div>
            <div className="flex items-center group relative pr-1"> {/* Container for button and icons, added padding right */}
                <Button
                    variant={(isActive || isNameEditing) && !isEditing ? "secondary" : "ghost"} // Highlight if active OR editing name
                    size="sm"
                    onClick={handleSectionClick}
                    className={cn(
                        "justify-start flex-1 group/btn h-8", // Reduced height to h-8
                        isEditing ? 'pr-[70px]' : 'pr-2' // Adjust padding based on edit mode, increase edit padding slightly
                    )}
                    aria-current={isActive && !isEditing && !isNameEditing ? "page" : undefined}
                    style={{ paddingLeft: `${1 + level * 1.5}rem` }} // Indentation
                    title={section.name}
                    disabled={isEditing && !isNameEditing} // Disable main click in edit mode unless editing this specific name
                >
                     {/* Expand/Collapse Toggle */}
                    {hasSubSections ? (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleToggleExpand}
                            className="h-6 w-6 mr-1 text-muted-foreground hover:bg-muted/50 flex-shrink-0"
                            aria-label={isExpanded ? "Collapse section" : "Expand section"}
                            tabIndex={-1} // Prevent tabbing to this button
                        >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                    ) : (
                        <span className="w-6 mr-1 flex-shrink-0"></span> // Placeholder for alignment
                    )}

                    <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
                    {/* Name display or Input field */}
                    {isNameEditing ? (
                        <Input
                            ref={inputRef}
                            value={tempName}
                            onChange={handleNameChange}
                            onKeyDown={handleNameKeyDown}
                            onBlur={handleNameBlur}
                            className="h-6 px-1 text-sm flex-1 bg-transparent border-b border-primary focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary"
                            onClick={(e) => e.stopPropagation()} // Prevent section click
                            onMouseDown={(e) => e.stopPropagation()} // Prevent drag/selection issues
                        />
                    ) : (
                        <span className="flex-1 truncate">{section.name}</span> // Truncate text here
                    )}
                </Button>

                 {/* Edit, Delete, and Add Sub-section Buttons */}
                 {isEditing && !isNameEditing && ( // Only show buttons if global edit mode is on AND not currently editing this item's name
                     <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex gap-0.5 opacity-100 group-hover:opacity-100 transition-opacity z-10 bg-card"> {/* Added bg-card for visibility */}
                         <Button
                             variant="ghost"
                             size="icon"
                             className="h-6 w-6 text-muted-foreground hover:text-primary"
                             onClick={handleEditClick}
                             aria-label={`Edit section name ${section.name}`}
                             title="Edit name"
                         >
                             <Edit3 className="h-4 w-4" />
                         </Button>
                          <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-primary"
                              onClick={handleAddSubSectionClick}
                              aria-label={`Add sub-section to ${section.name}`}
                              title="Add sub-section"
                          >
                              <PlusCircle className="h-4 w-4" />
                          </Button>
                         <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={handleDeleteClick}
                            aria-label={`Delete section ${section.name}`}
                            title="Delete section"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                 )}
            </div>
            {/* Render Sub-sections */}
            {hasSubSections && isExpanded && (
                <div className="ml-0"> {/* No extra margin */}
                    {section.subSections.map((subSection) => (
                        // ** Ensure the key prop is DIRECTLY on the recursively rendered HierarchicalSectionItem **
                        // Double-check that subSection.id is unique within this parent section's subSections.
                        <HierarchicalSectionItem
                            key={subSection.id} // Key is crucial here!
                            section={subSection}
                            level={level + 1}
                            activeSectionId={activeSectionId}
                            setActiveSectionId={setActiveSectionId}
                            onEditSectionName={onEditSectionName}
                            onDeleteSection={onDeleteSection} // Pass down delete handler
                            onAddSubSection={onAddSubSection} // Pass down add handler
                            isEditing={isEditing}
                            onCloseSheet={onCloseSheet}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
