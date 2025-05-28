// src/components/project-sidebar-content.tsx
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Settings, Undo, Lightbulb, Cloud, CloudOff, PlusCircle, FileText, Loader2, Edit3, BookOpen } from 'lucide-react'; // Added BookOpen
import type { Project, SectionIdentifier, HierarchicalProjectSection } from '@/types/project';
import { STANDARD_REPORT_PAGES, STANDARD_PAGE_INDICES, TOC_SECTION_NAME, findSectionById, addSubSectionById, getSectionNumbering } from '@/lib/project-utils'; // Removed ensureDefaultSubSection
import { HierarchicalSectionItem } from './hierarchical-section-item';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';

export interface ProjectSidebarContentProps {
    project: Project;
    updateProject: (updatedData: Partial<Project> | ((prev: Project) => Project), saveToHistory?: boolean) => void;
    activeSectionId: string | null; // Will store the ID of any selected item (main section, sub-section, diagram, etc.)
    setActiveSectionId: (id: SectionIdentifier) => void;
    // activeSubSectionId and setActiveSubSectionId are removed
    handleGenerateTocClick: () => void; // Renamed to reflect its primary role as outline generator trigger
    isGeneratingOutline: boolean;
    isGenerating: boolean;
    isSummarizing: boolean;
    isSuggesting: boolean;
    handleSaveOnline: () => void;
    canUndo: boolean;
    handleUndo: () => void;
    onCloseSheet?: () => void;
    isEditingSections: boolean;
    setIsEditingSections: (editing: boolean) => void;
    onEditSectionName: (id: string, newName: string) => void;
    onDeleteSection: (id: string) => void;
    onAddSubSection: (parentId: string) => void; // For adding a sub-item to an existing section
    handleAddNewSection: () => void; // For adding a new top-level section
}

export const ProjectSidebarContent: React.FC<ProjectSidebarContentProps> = ({
    project,
    updateProject, // Not directly used here but good for future direct updates from sidebar
    activeSectionId,
    setActiveSectionId,
    handleGenerateTocClick,
    isGeneratingOutline,
    isGenerating,     // These global states might be useful for disabling buttons
    isSummarizing,
    isSuggesting,
    handleSaveOnline,
    canUndo,
    handleUndo,
    onCloseSheet,
    isEditingSections,
    setIsEditingSections,
    onEditSectionName,
    onDeleteSection,
    onAddSubSection, // This will be passed to HierarchicalSectionItem
    handleAddNewSection,
}) => {
     const { toast } = useToast();

     const handleItemClick = (id: SectionIdentifier) => {
         setActiveSectionId(id);
         onCloseSheet?.();
     };
    
     return (
        <div className="flex flex-col h-full bg-card text-left">
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
                 <Input
                        id="projectTitleSidebar"
                        value={project.title}
                        readOnly
                        className="h-8 text-base font-semibold bg-transparent border-0 shadow-none focus-visible:ring-0 p-0 truncate flex-1 mr-2 text-left"
                        placeholder="Project Title"
                        aria-label="Project Title (Readonly)"
                    />
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleUndo}
                    disabled={!canUndo}
                    className="flex-shrink-0 h-8 w-8"
                    title={canUndo ? "Undo last change" : "Nothing to undo"}
                >
                    <Undo className="h-4 w-4" />
                </Button>
            </div>

            {/* Project Details Link */}
            <div className="px-2 py-2 flex-shrink-0">
                <Button
                    key="-1" // Unique key
                    variant={activeSectionId === String(-1) ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => handleItemClick(String(-1))}
                    className="justify-start w-full text-left text-sm hover:bg-muted/60 data-[variant=secondary]:bg-primary/10"
                    aria-current={activeSectionId === String(-1) ? "page" : undefined}
                >
                    <Settings className="mr-2 h-4 w-4" />
                    Project Details
                </Button>
            </div>
            <Separator className="my-0 flex-shrink-0" />

            {/* Standard Pages Section */}
            <ScrollArea className="w-full flex-shrink-0 max-h-[250px]">
                <div className="px-2 py-2">
                    <p className="px-2 text-xs font-semibold text-muted-foreground mb-1 text-left uppercase">Standard Pages</p>
                    <nav className="flex flex-col gap-1 min-w-max text-left">
                        {STANDARD_REPORT_PAGES.map((pageName) => {
                            const pageId = String(STANDARD_PAGE_INDICES[pageName]);
                            return (
                                <Button
                                    key={pageId} // Unique key
                                    variant={activeSectionId === pageId ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => handleItemClick(STANDARD_PAGE_INDICES[pageName])}
                                    className="justify-start text-left text-sm hover:bg-muted/60 data-[variant=secondary]:bg-primary/10"
                                    aria-current={activeSectionId === pageId ? "page" : undefined}
                                    title={pageName}
                                >
                                    <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
                                    <span className="truncate">{pageName}</span>
                                </Button>
                            );
                        })}
                    </nav>
                </div>
                <ScrollBar orientation="vertical" />
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
            <Separator className="my-0 flex-shrink-0" />

            {/* Report Sections */}
            <div className="flex-1 flex flex-col min-h-0">
                 <div className="flex justify-between items-center pl-4 pr-2 py-2 flex-shrink-0">
                    <p className="text-xs font-semibold text-muted-foreground text-left uppercase">Report Sections</p>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingSections(!isEditingSections)}
                        className="text-xs h-auto py-0 px-1 text-primary hover:bg-primary/10"
                    >
                         <Edit3 className="h-3 w-3 mr-1"/> {isEditingSections ? 'Done' : 'Edit'}
                    </Button>
                 </div>
                 <ScrollArea className="flex-1 px-2 py-2 overflow-x-auto">
                    <nav className="flex flex-col gap-0.5 min-w-max text-left whitespace-nowrap">
                       {project.sections?.length > 0 ? (
                          project.sections.map((section, index) => (
                            <HierarchicalSectionItem
                                key={section.id}
                                section={section}
                                level={0} // Top-level sections are level 0
                                numbering={`${index + 1}`} // Main section numbering
                                activeSectionId={activeSectionId}
                                setActiveSectionId={handleItemClick} // Use the unified click handler
                                // activeSubSectionId and setActiveSubSectionId are removed
                                onEditSectionName={onEditSectionName}
                                onDeleteSection={onDeleteSection}
                                onAddSubSection={onAddSubSection} // Pass down the add sub-item handler
                                isEditing={isEditingSections}
                                onCloseSheet={onCloseSheet}
                            />
                          ))
                       ) : (
                         <p className="px-2 py-1 text-xs text-muted-foreground italic">Generate an outline or add sections in edit mode.</p>
                       )}
                       {isEditingSections && (
                           <Button
                               key="add-new-top-level-section-button"
                               variant="outline"
                               size="sm"
                               onClick={handleAddNewSection}
                               className="justify-start mt-2 text-muted-foreground hover:text-primary text-left text-sm"
                               title="Add new top-level section"
                           >
                               <PlusCircle className="mr-2 h-4 w-4" />
                               Add Section
                           </Button>
                       )}
                    </nav>
                    <ScrollBar orientation="vertical" />
                    <ScrollBar orientation="horizontal" />
                 </ScrollArea>
             </div>

             {/* Footer Actions */}
             <div className="p-4 border-t space-y-2 flex-shrink-0">
                 <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateTocClick} // This now triggers outline generation
                    disabled={isGeneratingOutline || isGenerating || isSummarizing || isSuggesting || !project.projectContext?.trim()}
                    className="w-full hover:glow-accent focus-visible:glow-accent"
                    title={!project.projectContext?.trim() ? "Add project context in Project Details first" : "Generate project outline based on context"}
                >
                    {isGeneratingOutline ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                    {isGeneratingOutline ? 'Generating Outline...' : 'Generate Outline'}
                </Button>
                 <Button
                     variant="outline"
                     size="sm"
                     onClick={handleSaveOnline}
                     disabled={project.storageType === 'cloud'}
                     className="w-full hover:glow-accent focus-visible:glow-accent"
                     title={project.storageType === 'cloud' ? "Project is saved online" : "Save project to cloud (coming soon)"}
                 >
                     {project.storageType === 'cloud' ? <Cloud className="mr-2 h-4 w-4 text-green-500" /> : <CloudOff className="mr-2 h-4 w-4" />}
                     {project.storageType === 'cloud' ? 'Saved Online' : 'Save Online'}
                 </Button>
                 <p className="text-xs text-muted-foreground text-center mt-1">
                     Changes saved {project.storageType === 'local' ? 'locally' : 'to cloud'}.
                 </p>
             </div>
        </div>
     );
};
