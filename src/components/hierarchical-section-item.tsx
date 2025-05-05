// src/components/hierarchical-section-item.tsx
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Import Input for editing
import { FileText, Trash2, Edit3, ChevronDown, ChevronRight, PlusCircle } from 'lucide-react'; // Added PlusCircle
import type { HierarchicalProjectSection, SectionIdentifier } from '@/types/project';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast'; // Import useToast

// Props interface for HierarchicalSectionItem
export interface HierarchicalSectionItemProps {
    section: HierarchicalProjectSection;
    level: number;
    numbering: string;
    activeSectionId: string | null;
    setActiveSectionId: (id: SectionIdentifier) => void;
    onEditSectionName: (id: string, newName: string) => void;
    onDeleteSection: (id: string) => void;
    onAddSubSection: (parentId: string) => void;
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
    onAddSubSection,
    isEditing,
    onCloseSheet,
    renderSubSections, // Destructure the render function
}) => {
    const isActive = section.id === activeSectionId;
    const [isExpanded, setIsExpanded] = useState(true);
    const [isNameEditing, setIsNameEditing] = useState(false);
    const [tempName, setTempName] = useState(section.name);
    const { toast } = useToast();
    const hasSubSections = section.subSections && section.subSections.length > 0;
    const inputRef = React.useRef<HTMLInputElement>(null);

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
        onAddSubSection(section.id);
        setIsExpanded(true);
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTempName(e.target.value);
    };

    const handleNameSave = () => {
        if (!tempName.trim()) {
            toast({ variant: "destructive", title: "Invalid Name", description: "Section name cannot be empty." });
            setTempName(section.name);
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


    return (
        <div className="group">
             {/* Main row containing toggle, content button, and edit buttons */}
            <div className="flex items-center group/item relative pr-1">
                {/* Indentation and Toggle Button */}
                <div
                    className="flex items-center flex-shrink-0 h-8"
                    style={{ paddingLeft: `${1 + level * 1.5}rem` }}
                >
                    {hasSubSections ? (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleToggleExpand}
                            className="h-6 w-6 mr-1 text-muted-foreground hover:bg-muted/50 flex-shrink-0"
                            aria-label={isExpanded ? "Collapse section" : "Expand section"}
                            tabIndex={-1}
                        >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                    ) : (
                        <span className="w-6 mr-1 flex-shrink-0"></span>
                    )}
                </div>

                {/* Section Content Button */}
                <Button
                    variant={(isActive || isNameEditing) && !isEditing ? "secondary" : "ghost"}
                    size="sm"
                    onClick={handleSectionClick}
                    className={cn(
                        "justify-start flex-1 group/btn h-8 min-w-0",
                        isEditing ? 'pr-[70px]' : 'pr-2'
                    )}
                    aria-current={isActive && !isEditing && !isNameEditing ? "page" : undefined}
                    title={section.name}
                    disabled={isEditing && !isNameEditing}
                >
                    <span className="mr-2 font-medium text-muted-foreground min-w-[2em] text-right">{numbering}</span>
                    <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
                    {isNameEditing ? (
                        <Input
                            ref={inputRef}
                            value={tempName}
                            onChange={handleNameChange}
                            onKeyDown={handleNameKeyDown}
                            onBlur={handleNameBlur}
                            className="h-6 px-1 text-sm flex-1 bg-transparent border-b border-primary focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary"
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <span className="flex-1 truncate">{section.name}</span>
                    )}
                </Button>

                 {/* Edit, Delete, and Add Sub-section Buttons */}
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
                <div className="ml-0"> {/* No extra margin here, handled by paddingLeft */}
                    {/* Use the passed render function for sub-sections */}
                    {renderSubSections(section.subSections!, level + 1, numbering)}
                </div>
            )}
        </div>
    );
};
