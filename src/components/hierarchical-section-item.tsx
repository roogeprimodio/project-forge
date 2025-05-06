// src/components/hierarchical-section-item.tsx
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Trash2, Edit3, ChevronDown, ChevronRight, PlusCircle, Projector } from 'lucide-react';
import type { HierarchicalProjectSection, SectionIdentifier } from '@/types/project';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export interface HierarchicalSectionItemProps {
    section: HierarchicalProjectSection;
    level: number;
    numbering: string;
    activeSectionId: string | null;
    setActiveSectionId: (id: SectionIdentifier) => void;
    activeSubSectionId: string | null;
    setActiveSubSectionId: (id: string | null) => void;
    onEditSectionName: (id: string, newName: string) => void;
    onDeleteSection: (id: string) => void;
    onAddSubSection: (parentId: string) => void;
    isEditing: boolean; // Overall editing mode for the sidebar
    onCloseSheet?: () => void;
    // renderSubSections prop is removed as sub-sections will be rendered internally by HierarchicalSectionItem
}

export const HierarchicalSectionItem: React.FC<HierarchicalSectionItemProps> = ({
    section,
    level,
    numbering,
    activeSectionId,
    setActiveSectionId,
    activeSubSectionId,
    setActiveSubSectionId,
    onEditSectionName,
    onDeleteSection,
    onAddSubSection,
    isEditing, // This is the global edit mode for the sidebar
    onCloseSheet,
}) => {
    const isMainSectionContext = level === 0; // True if this item is a top-level section

    // A section/subsection is "active" if its ID matches activeSubSectionId, OR
    // if it's a main section and its ID matches activeSectionId AND no sub-section is active.
    const isActive = section.id === activeSubSectionId || (isMainSectionContext && section.id === activeSectionId && activeSubSectionId === null);

    const [isExpanded, setIsExpanded] = useState(true);
    const [isNameEditing, setIsNameEditing] = useState(false); // Local name editing state for this specific item
    const [tempName, setTempName] = useState(section.name);
    const { toast } = useToast();
    const hasSubSections = section.subSections && section.subSections.length > 0;
    const inputRef = useRef<HTMLInputElement>(null);

    // Update tempName if section.name changes externally and not currently editing
    useEffect(() => {
        if (!isNameEditing) {
            setTempName(section.name);
        }
    }, [section.name, isNameEditing]);

    // Focus input when name editing starts
    useEffect(() => {
        if (isNameEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isNameEditing]);

    const handleClick = (e: React.MouseEvent | React.KeyboardEvent) => {
        if (isEditing || isNameEditing) return; // Prevent selection if global edit mode or local name edit active

        if (isMainSectionContext) {
            setActiveSectionId(section.id); // Set this as the active main section
            setActiveSubSectionId(null);     // Clear any active sub-section
        } else {
            // For sub-sections, we need to know the parent main section ID.
            // This requires finding the parent, which is complex here.
            // Assume activeSectionId is already correctly set to the main parent.
            setActiveSubSectionId(section.id); // Set this sub-section as active
        }
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
        if (typeof onAddSubSection !== 'function') {
            console.error("Error: onAddSubSection prop is not a function", { onAddSubSection });
            toast({ variant: "destructive", title: "Error", description: "Could not add sub-section." });
            return;
        }
        onAddSubSection(section.id); // Current section becomes the parent
        setIsExpanded(true); // Expand to show the new sub-section
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
            setTempName(section.name);
            setIsNameEditing(false);
        }
    };

    const handleNameBlur = () => {
        // Delay blur processing to allow other click events (like save button if any)
        requestAnimationFrame(() => {
            if (document.activeElement !== inputRef.current) { // Check if focus is still on input
                 if (tempName.trim() && tempName.trim() !== section.name) {
                    handleNameSave();
                } else {
                    // If name is empty or unchanged, revert and exit edit mode
                    setTempName(section.name);
                    setIsNameEditing(false);
                }
            }
        });
    };
    
    const isDiagram = section.name.toLowerCase().startsWith("diagram:") || section.name.toLowerCase().startsWith("figure:");
    const IconComponent = isDiagram ? Projector : FileText;

    return (
        <div className="group w-full">
            {/* Main row containing content button and edit buttons */}
            <div className={cn(
                "flex group/item relative w-full items-center rounded-md transition-colors duration-150 pr-1",
                 (isActive && !isNameEditing && !isEditing) ? (isMainSectionContext ? "bg-primary/10" : "bg-accent/50") : "hover:bg-muted/50"
            )}>
                {/* Clickable area for section name and icon */}
                <div
                    className={cn(
                        "flex flex-1 items-center min-w-0 h-8 cursor-pointer",
                        isEditing ? 'pr-[70px]' : '' // Make space for edit buttons if global edit mode
                    )}
                    style={{ paddingLeft: `${level * 0.5}rem` }} // Consistent padding based on level
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
                        <span className="w-6 mr-1 flex-shrink-0"></span> // Placeholder for alignment
                    )}
                    <IconComponent className="h-4 w-4 flex-shrink-0 mr-1.5 text-muted-foreground" />
                    <span className="font-medium text-sm text-muted-foreground flex-shrink-0 mr-1.5">{numbering}</span>
                    {isNameEditing ? (
                        <Input
                            ref={inputRef}
                            value={tempName}
                            onChange={handleNameChange}
                            onKeyDown={handleNameKeyDown}
                            onBlur={handleNameBlur} // Use blur to save or cancel
                            className="h-6 px-1 text-sm flex-1 bg-transparent border-b border-primary focus-visible:ring-0 focus-visible:border-primary text-left"
                            onClick={(e) => e.stopPropagation()} // Prevent parent click
                            onMouseDown={(e) => e.stopPropagation()} // Prevent drag start
                            aria-label={`Editing section name ${section.name}`}
                        />
                    ) : (
                        <span className="flex-1 truncate text-left text-sm">{section.name}</span>
                    )}
                </div>

                {/* Edit/Delete/Add buttons - shown if global edit mode is active AND local name editing is NOT active */}
                {isEditing && !isNameEditing && (
                    <div className="absolute right-0.5 top-1/2 transform -translate-y-1/2 flex items-center gap-0 opacity-100 group-hover/item:opacity-100 transition-opacity z-10 bg-card">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={handleEditNameClick} aria-label={`Edit name for ${section.name}`} title="Edit name">
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

            {/* Recursive rendering of sub-sections */}
            {hasSubSections && isExpanded && (
                <div className="w-full border-l border-muted/50" style={{ marginLeft: `${level * 0.5 + 1.25}rem` }}> {/* Adjust marginLeft for visual hierarchy */}
                    {section.subSections.map((sub, subIndex) => {
                        const subNumbering = `${numbering}.${subIndex + 1}`;
                        return (
                            <HierarchicalSectionItem
                                key={sub.id} // CRITICAL: Unique key for each sub-section item
                                section={sub}
                                level={level + 1}
                                numbering={subNumbering}
                                activeSectionId={activeSectionId} // Pass down main active ID
                                setActiveSectionId={setActiveSectionId} // Pass down main setter
                                activeSubSectionId={activeSubSectionId} // Pass down active sub ID
                                setActiveSubSectionId={setActiveSubSectionId} // Pass down sub setter
                                onEditSectionName={onEditSectionName}
                                onDeleteSection={onDeleteSection}
                                onAddSubSection={onAddSubSection}
                                isEditing={isEditing} // Pass down global edit mode
                                onCloseSheet={onCloseSheet}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}
