// src/components/hierarchical-section-item.tsx
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Trash2, Edit3, ChevronDown, ChevronRight, PlusCircle, Projector, ImageIcon as ImageIconLucide, Table as TableIcon, BookOpen, Brain } from 'lucide-react';
import type { HierarchicalProjectSection, SectionIdentifier } from '@/types/project';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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
    children?: React.ReactNode; // To render nested items
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
    children, // Used for nested rendering
}) => {
    const isActive = section.id === activeSectionId;
    const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand top levels
    const [isNameEditing, setIsNameEditing] = useState(false);
    const [tempName, setTempName] = useState(section.name);
    const { toast } = useToast();
    const inputRef = useRef<HTMLInputElement>(null);

    const hasSubSections = section.subSections && section.subSections.length > 0;

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
        if (isNameEditing || (e.target as HTMLElement).closest('button[aria-label*="Expand"], button[aria-label*="Collapse"]')) {
            // Prevent selection if clicking expand/collapse or if name is being edited
            return;
        }
        setActiveSectionId(section.id);
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
    const isFlowchart = nameLower.startsWith("flowchart");
    const isFigure = nameLower.startsWith("figure ");
    const isTable = nameLower.startsWith("table:");
    const isSpecialized = isDiagram || isFlowchart || isFigure || isTable;

    let IconComponent = FileText;
    if (isDiagram || isFlowchart) IconComponent = Projector;
    else if (isFigure) IconComponent = ImageIconLucide;
    else if (isTable) IconComponent = TableIcon;
    else if (hasSubSections) IconComponent = BookOpen;


    return (
        <div className="group w-full">
            <div className={cn(
                "flex group/item relative w-full items-center rounded-md transition-colors duration-150 pr-1 text-left", // Ensure text-left
                 (isActive && !isNameEditing && !isEditing) ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
            )}>
                <div
                    className={cn(
                        "flex flex-1 items-center min-w-0 h-8 cursor-pointer",
                        isEditing ? 'pr-[70px]' : ''
                    )}
                    style={{ paddingLeft: `${level * 0.75}rem` }}
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
                    <span className={cn("font-medium text-sm flex-shrink-0 mr-1.5", isActive ? "text-primary/90" : "text-muted-foreground")}>{numbering}</span>
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
                        <span className={cn("flex-1 truncate text-left text-sm", isActive ? "text-primary font-semibold" : "text-foreground")}>{section.name}</span>
                    )}
                </div>

                {isEditing && !isNameEditing && (
                    <div className="absolute right-0.5 top-1/2 transform -translate-y-1/2 flex items-center gap-0 opacity-100 group-hover/item:opacity-100 transition-opacity z-10 bg-card">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={handleEditNameClick} aria-label={`Edit name for ${section.name}`} title="Edit name">
                            <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={handleAddSubSectionClick} aria-label={`Add sub-item to ${section.name}`} title="Add sub-item">
                            <PlusCircle className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={handleDeleteClick} aria-label={`Delete section ${section.name}`} title="Delete section">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>
            {isExpanded && children /* Render children (nested items) here */}
        </div>
    );
}
