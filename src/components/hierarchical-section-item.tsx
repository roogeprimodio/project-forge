// src/components/hierarchical-section-item.tsx
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Trash2, Edit3, ChevronDown, ChevronRight } from 'lucide-react';
import type { HierarchicalProjectSection } from '@/types/project';
import { cn } from '@/lib/utils';

// Props interface for HierarchicalSectionItem
export interface HierarchicalSectionItemProps {
    section: HierarchicalProjectSection;
    level: number;
    activeSectionId: string | null;
    setActiveSectionId: (id: string) => void;
    onEditSectionName: (id: string) => void;
    onDeleteSection: (id: string) => void;
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
    isEditing,
    onCloseSheet,
}) => {
    const isActive = section.id === activeSectionId;
    const [isExpanded, setIsExpanded] = useState(true); // State for expanding/collapsing sub-sections
    const hasSubSections = section.subSections && section.subSections.length > 0;

    const handleSectionClick = () => {
        if (isEditing) return; // Don't change selection in edit mode
        setActiveSectionId(section.id);
        onCloseSheet?.(); // Close sheet on selection (mobile)
    };

    const handleToggleExpand = (e: React.MouseEvent) => {
         e.stopPropagation(); // Prevent triggering section click
         setIsExpanded(!isExpanded);
    };

    const handleEditClick = (e: React.MouseEvent) => {
         e.stopPropagation(); // Prevent triggering section click
         onEditSectionName(section.id);
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent triggering section click
        onDeleteSection(section.id); // Call the delete handler passed from parent
    };

    return (
        <div>
            <div className="flex items-center group relative"> {/* Container for button and icons */}
                <Button
                    variant={isActive && !isEditing ? "secondary" : "ghost"}
                    size="sm"
                    onClick={handleSectionClick}
                    className={cn(
                        "justify-start flex-1 group/btn", // Remove truncate here, rely on parent container scroll
                        isEditing ? 'pr-16' : 'pr-2' // Adjust padding based on edit mode
                    )}
                    aria-current={isActive && !isEditing ? "page" : undefined}
                    style={{ paddingLeft: `${1 + level * 1.5}rem` }} // Indentation
                    title={section.name}
                    disabled={isEditing} // Disable main click in edit mode
                >
                     {/* Expand/Collapse Toggle */}
                    {hasSubSections ? (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleToggleExpand}
                            className="h-6 w-6 mr-1 text-muted-foreground hover:bg-muted/50 flex-shrink-0"
                            aria-label={isExpanded ? "Collapse section" : "Expand section"}
                        >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                    ) : (
                        <span className="w-6 mr-1 flex-shrink-0"></span> // Placeholder for alignment
                    )}

                    <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
                    {/* Text span should not truncate if parent handles scrolling */}
                    <span className="flex-1">{section.name}</span>
                </Button>

                 {/* Edit and Delete Buttons - only show when editing is enabled */}
                 {isEditing && (
                     <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex gap-1 opacity-100 group-hover:opacity-100 transition-opacity z-10">
                         <Button
                             variant="ghost"
                             size="icon"
                             className="h-6 w-6 text-muted-foreground hover:text-primary"
                             onClick={handleEditClick}
                             aria-label={`Edit section ${section.name}`}
                         >
                             <Edit3 className="h-4 w-4" />
                         </Button>
                         <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={handleDeleteClick} // Use the specific handler
                            aria-label={`Delete section ${section.name}`}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                 )}
            </div>
            {/* Render Sub-sections */}
            {hasSubSections && isExpanded && (
                <div className="ml-0"> {/* No extra margin here, padding handled by button style */}
                    {section.subSections.map((subSection) => (
                        // Recursive call - Ensure key is applied here as well
                        <HierarchicalSectionItem
                            key={subSection.id} // Key is crucial here!
                            section={subSection}
                            level={level + 1}
                            activeSectionId={activeSectionId}
                            setActiveSectionId={setActiveSectionId}
                            onEditSectionName={onEditSectionName}
                            onDeleteSection={onDeleteSection} // Pass down delete handler
                            isEditing={isEditing}
                            onCloseSheet={onCloseSheet}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
