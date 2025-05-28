// src/components/hierarchical-section-item.tsx
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Trash2, Edit3, ChevronDown, ChevronRight, PlusCircle, Projector, ImageIcon, Table as TableIcon, BookOpen } from 'lucide-react'; // Added more icons
import type { HierarchicalProjectSection, SectionIdentifier } from '@/types/project';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export interface HierarchicalSectionItemProps {
    section: HierarchicalProjectSection;
    level: number;
    numbering: string;
    activeSectionId: string | null; // ID of the currently selected item in the entire hierarchy
    setActiveSectionId: (id: SectionIdentifier) => void; // Setter for the active item ID
    // activeSubSectionId and setActiveSubSectionId are removed
    onEditSectionName: (id: string, newName: string) => void;
    onDeleteSection: (id: string) => void;
    onAddSubSection: (parentId: string) => void; // Handler to add a new sub-item under this section
    isEditing: boolean; // Overall editing mode for the sidebar
    onCloseSheet?: () => void;
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
}) => {
    const isActive = section.id === activeSectionId;
    const [isExpanded, setIsExpanded] = useState(true); // Default to expanded for better visibility of new structure
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

    useEffect(() => {
        if (isNameEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isNameEditing]);

    const handleClick = (e: React.MouseEvent | React.KeyboardEvent) => {
        if (isEditing || isNameEditing) return;
        setActiveSectionId(section.id); // Set this item as active
        onCloseSheet?.();
    };

    const handleToggleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    };

    const handleEditNameClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setTempName(section.name);
        setIsNameEditing(true);
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
        if (e.key === 'Enter') handleNameSave();
        else if (e.key === 'Escape') {
            setTempName(section.name);
            setIsNameEditing(false);
        }
    };
    
    const handleNameBlur = () => {
        requestAnimationFrame(() => {
            if (document.activeElement !== inputRef.current) {
                 if (tempName.trim() && tempName.trim() !== section.name) {
                    handleNameSave();
                } else {
                    setTempName(section.name);
                    setIsNameEditing(false);
                }
            }
        });
    };
    
    const nameLower = section.name.toLowerCase();
    const isDiagram = nameLower.startsWith("diagram:");
    const isFigure = nameLower.startsWith("figure ");
    const isTable = nameLower.startsWith("table:");
    const isMainSection = level === 0; // Main sections are containers for sub-sections or specialized items

    let IconComponent = FileText;
    if (isDiagram) IconComponent = Projector;
    else if (isFigure) IconComponent = ImageIcon;
    else if (isTable) IconComponent = TableIcon;
    else if (isMainSection && !hasSubSections) IconComponent = FileText; // Main section that might become content leaf
    else if (isMainSection && hasSubSections) IconComponent = BookOpen; // Main section as container


    // Main section (level 0) is a container and cannot be directly edited for content, only its sub-items.
    // Its "content" field is not used for direct editing. It's a preview of its children.
    // Sub-sections (level 1+) or specialized items (Diagrams, Figures, Tables at any level) are editable.

    return (
        <div className="group w-full">
            <div className={cn(
                "flex group/item relative w-full items-center rounded-md transition-colors duration-150 pr-1",
                 (isActive && !isNameEditing && !isEditing) ? "bg-primary/10" : "hover:bg-muted/50" // Simplified active state
            )}>
                <div
                    className={cn(
                        "flex flex-1 items-center min-w-0 h-8 cursor-pointer",
                        isEditing ? 'pr-[70px]' : ''
                    )}
                    style={{ paddingLeft: `${level * 0.75}rem` }} // Adjusted padding for deeper nesting
                    onClick={handleClick}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(e); }}
                    title={section.name}
                >
                    {hasSubSections ? (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleToggleExpand}
                            className="h-6 w-6 mr-1 text-muted-foreground hover:bg-muted/60 flex-shrink-0"
                            aria-label={isExpanded ? "Collapse section" : "Expand section"}
                            tabIndex={0} 
                        >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                    ) : (
                        <span className="w-6 mr-1 flex-shrink-0"></span> 
                    )}
                    <IconComponent className="h-4 w-4 flex-shrink-0 mr-1.5 text-muted-foreground" />
                    <span className="font-medium text-sm text-muted-foreground flex-shrink-0 mr-1.5">{numbering}</span>
                    {isNameEditing ? (
                        <Input
                            ref={inputRef}
                            value={tempName}
                            onChange={handleNameChange}
                            onKeyDown={handleNameKeyDown}
                            onBlur={handleNameBlur}
                            className="h-6 px-1 text-sm flex-1 bg-transparent border-b border-primary focus-visible:ring-0 focus-visible:border-primary text-left"
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            aria-label={`Editing section name ${section.name}`}
                        />
                    ) : (
                        <span className="flex-1 truncate text-left text-sm">{section.name}</span>
                    )}
                </div>

                {isEditing && !isNameEditing && (
                    <div className="absolute right-0.5 top-1/2 transform -translate-y-1/2 flex items-center gap-0 opacity-100 group-hover/item:opacity-100 transition-opacity z-10 bg-card">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={handleEditNameClick} aria-label={`Edit name for ${section.name}`} title="Edit name">
                            <Edit3 className="h-4 w-4" />
                        </Button>
                        {/* Add sub-item button - only allow adding to non-leaf nodes based on max depth or type */}
                        {/* Current logic: Add button is always shown in edit mode. Max depth handled by AI. */}
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={handleAddSubSectionClick} aria-label={`Add sub-item to ${section.name}`} title="Add sub-item">
                            <PlusCircle className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={handleDeleteClick} aria-label={`Delete section ${section.name}`} title="Delete section">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>

            {hasSubSections && isExpanded && (
                <div className="w-full border-l border-muted/50" style={{ marginLeft: `${level * 0.75 + 1.25}rem` }}>
                    {section.subSections.map((sub, subIndex) => {
                        const subNumbering = `${numbering}.${subIndex + 1}`;
                        return (
                            <HierarchicalSectionItem
                                key={sub.id}
                                section={sub}
                                level={level + 1}
                                numbering={subNumbering}
                                activeSectionId={activeSectionId}
                                setActiveSectionId={setActiveSectionId}
                                onEditSectionName={onEditSectionName}
                                onDeleteSection={onDeleteSection}
                                onAddSubSection={onAddSubSection} // Pass down so sub-items can also add children
                                isEditing={isEditing}
                                onCloseSheet={onCloseSheet}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}
