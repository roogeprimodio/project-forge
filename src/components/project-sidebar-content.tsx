// src/components/project-sidebar-content.tsx
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Settings, Undo, Lightbulb, Cloud, CloudOff, PlusCircle, FileText, Loader2, ChevronRight, ChevronDown, Edit3, Trash2 } from 'lucide-react'; // Import necessary icons
import type { Project, SectionIdentifier, HierarchicalProjectSection } from '@/types/project';
import { STANDARD_REPORT_PAGES, STANDARD_PAGE_INDICES, findSectionById, addSubSectionById, getSectionNumbering, ensureDefaultSubSection } from '@/lib/project-utils';
import { HierarchicalSectionItem } from './hierarchical-section-item';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';

export interface ProjectSidebarContentProps {
    project: Project;
    updateProject: (updatedData: Partial<Project> | ((prev: Project) => Project), saveToHistory?: boolean) => void;
    activeSectionId: string | null;
    setActiveSectionId: (id: SectionIdentifier) => void;
    activeSubSectionId: string | null;
    setActiveSubSectionId: (id: string | null) => void;
    handleGenerateTocClick: () => void;
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
    handleAddNewSection: () => void;
}

export const ProjectSidebarContent: React.FC<ProjectSidebarContentProps> = ({
    project,
    updateProject,
    activeSectionId,
    setActiveSectionId,
    activeSubSectionId,
    setActiveSubSectionId,
    handleGenerateTocClick,
    isGeneratingOutline,
    isGenerating,
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
    handleAddNewSection,
}) => {
     const { toast } = useToast();

     const handleMainSectionClick = (id: SectionIdentifier) => {
         setActiveSectionId(id);
         setActiveSubSectionId(null); // Clear active sub-section when a main section is clicked
         onCloseSheet?.();
     };
    
     // This function is now primarily for adding to top-level sections or designated parents.
     // HierarchicalSectionItem will handle adding to its own children.
     const handleAddNewSubSectionToParent = (parentId: string) => {
            const parentSection = findSectionById(project.sections, parentId);
            if (!parentSection) {
                toast({ variant: "destructive", title: "Error", description: "Parent section not found." });
                return;
            }

            const parentNumbering = getSectionNumbering(project.sections, parentId) || '';
            const newSubSectionNumber = (parentSection.subSections?.length || 0) + 1;
            const newSubSectionName = `New Sub-Section ${parentNumbering ? parentNumbering + '.' : ''}${newSubSectionNumber}`;
            
            const newSubSectionData: Omit<HierarchicalProjectSection, 'id' | 'subSections'> = {
                name: newSubSectionName,
                prompt: `Generate content for "${newSubSectionName}" under parent section "${parentSection.name}".`,
                content: "",
                lastGenerated: undefined,
            };

            updateProject(prev => {
                if (!prev) return prev;
                const newSections = addSubSectionById(prev.sections, parentId, newSubSectionData);
                 // Find the newly added sub-section to set it active (optional)
                const updatedParent = findSectionById(newSections, parentId);
                const addedSubSection = updatedParent?.subSections?.[updatedParent.subSections.length - 1];
                if (addedSubSection) {
                    setActiveSubSectionId(addedSubSection.id);
                }
                return { ...prev, sections: newSections };
            }, true);
            toast({ title: "Sub-Section Added", description: `"${newSubSectionName}" added to "${parentSection.name}".` });
        };
    
    // No need for renderSectionsRecursive here, HierarchicalSectionItem handles its children

     return (
        <div className="flex flex-col h-full bg-card text-left"> {/* Ensure text-left for all content */}
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
                    key="-1"
                    variant={activeSectionId === String(-1) && activeSubSectionId === null ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => handleMainSectionClick(String(-1))}
                    className="justify-start w-full text-left text-sm hover:bg-muted/60 data-[variant=secondary]:bg-primary/10"
                    aria-current={activeSectionId === String(-1) && activeSubSectionId === null ? "page" : undefined}
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
                                    key={pageId}
                                    variant={activeSectionId === pageId && activeSubSectionId === null ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => handleMainSectionClick(STANDARD_PAGE_INDICES[pageName])}
                                    className="justify-start text-left text-sm hover:bg-muted/60 data-[variant=secondary]:bg-primary/10"
                                    aria-current={activeSectionId === pageId && activeSubSectionId === null ? "page" : undefined}
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
                 <ScrollArea className="flex-1 px-2 py-2 overflow-x-auto"> {/* Add overflow-x-auto */}
                    <nav className="flex flex-col gap-0.5 min-w-max text-left whitespace-nowrap">
                       {project.sections?.length > 0 ? (
                          project.sections.map((section, index) => (
                            <HierarchicalSectionItem
                                key={section.id} // Apply key here to the component rendered by map
                                section={section}
                                level={0}
                                numbering={`${index + 1}`} // Pass top-level numbering
                                activeSectionId={activeSectionId}
                                setActiveSectionId={setActiveSectionId} // Main section setter
                                activeSubSectionId={activeSubSectionId}
                                setActiveSubSectionId={setActiveSubSectionId} // Sub-section setter
                                onEditSectionName={onEditSectionName}
                                onDeleteSection={onDeleteSection}
                                onAddSubSection={handleAddNewSubSectionToParent} // Use specific handler for adding to this level
                                isEditing={isEditingSections}
                                onCloseSheet={onCloseSheet}
                            />
                          ))
                       ) : (
                         <p className="px-2 py-1 text-xs text-muted-foreground italic">Generate sections or add manually in edit mode.</p>
                       )}
                       {isEditingSections && (
                           <Button
                               key="add-new-top-level-section-button"
                               variant="outline"
                               size="sm"
                               onClick={handleAddNewSection} // This adds a new top-level section
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
                    onClick={handleGenerateTocClick}
                    disabled={isGeneratingOutline || isGenerating || isSummarizing || isSuggesting || !project.projectContext?.trim()}
                    className="w-full hover:glow-accent focus-visible:glow-accent"
                    title={!project.projectContext?.trim() ? "Add project context in Project Details first" : "Generate Table of Contents based on project context"}
                >
                    {isGeneratingOutline ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                    {isGeneratingOutline ? 'Generating Sections...' : 'Generate/Update Sections'}
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
