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
    activeSectionId: string | null; // ID of the active *main* section
    setActiveSectionId: (id: SectionIdentifier) => void;
    activeSubSectionId: string | null; // ID of the active *sub-section*
    setActiveSubSectionId: (id: string | null) => void; // Setter for sub-section
    onEditSectionName: (id: string, newName: string) => void;
    onDeleteSection: (id: string) => void;
    onAddSubSection: (parentId: string) => void;
    isEditing: boolean;
    onCloseSheet?: () => void;
    renderSubSections: (sections: HierarchicalProjectSection[], level: number, parentNumbering: string) => React.ReactNode[];
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
    isEditing,
    onCloseSheet,
    renderSubSections,
}) => {
    // A main section is "active" if its ID matches activeSectionId AND no sub-section is active.
    // A sub-section is "active" if its ID matches activeSubSectionId.
    const isMainSectionActive = section.id === activeSectionId && activeSubSectionId === null;
    const [isExpanded, setIsExpanded] = useState(true);
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

    // This click handler is for the main section item itself
    const handleMainSectionClick = (e: React.MouseEvent | React.KeyboardEvent) => {
        if (isEditing || isNameEditing) return;
        setActiveSectionId(section.id); // Set this as the active main section
        setActiveSubSectionId(null); // Clear any active sub-section
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

    return (
        <div className="group w-full">
            <div className={cn(
                 "flex group/item relative w-full items-center rounded-md transition-colors duration-150",
                 (isMainSectionActive && !isNameEditing && !isEditing) ? "bg-primary/10" : "hover:bg-muted/50",
                 "pr-1"
                 )}
                 >
                <div
                    className={cn(
                        "flex flex-1 items-center min-w-0 h-8 cursor-pointer",
                         isEditing ? 'pr-[70px]' : ''
                    )}
                    style={{ paddingLeft: `${level * 1}rem` }}
                    onClick={handleMainSectionClick}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleMainSectionClick(e); }}
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
                     <FileText className="h-4 w-4 flex-shrink-0 mr-1.5 text-muted-foreground" />
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

            {hasSubSections && isExpanded && (
                <div className="w-full border-l border-muted/50" style={{ marginLeft: `${level * 1 + 1.25}rem` }}>
                    {section.subSections.map((sub, subIndex) => {
                        const subNumbering = `${numbering}.${subIndex + 1}`;
                        const isSubSectionDiagram = sub.name.toLowerCase().startsWith("diagram:") || sub.name.toLowerCase().startsWith("figure");
                        const isSubActive = sub.id === activeSubSectionId;
                        return (
                            <div
                                key={sub.id}
                                className={cn(
                                    "flex items-center rounded-md transition-colors duration-150 h-8 cursor-pointer min-w-0",
                                    (isSubActive && !isNameEditing && !isEditing) ? "bg-accent/50" : "hover:bg-muted/30",
                                    "pl-2 pr-1" // Indent sub-sections slightly
                                )}
                                style={{ paddingLeft: `${(level + 1) * 0.5}rem` }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (isEditing || isNameEditing) return;
                                    setActiveSubSectionId(sub.id);
                                    onCloseSheet?.();
                                }}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setActiveSubSectionId(sub.id); onCloseSheet?.();}}}
                                title={sub.name}
                            >
                               {isSubSectionDiagram ? <Projector className="h-3 w-3 flex-shrink-0 mr-1.5 text-muted-foreground/80" /> : <FileText className="h-3 w-3 flex-shrink-0 mr-1.5 text-muted-foreground/80" />}
                               <span className="font-normal text-xs text-muted-foreground flex-shrink-0 mr-1.5">{subNumbering}</span>
                               <span className="flex-1 truncate text-left text-xs">{sub.name}</span>
                               {/* Edit/Delete for sub-sections (can be added if needed) */}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}