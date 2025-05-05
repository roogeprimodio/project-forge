// src/components/project-sidebar-content.tsx
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Settings, Undo, Lightbulb, Cloud, CloudOff, PlusCircle, FileText, Loader2, Edit3, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import type { Project, SectionIdentifier, HierarchicalProjectSection } from '@/types/project';
import { STANDARD_REPORT_PAGES, STANDARD_PAGE_INDICES, findSectionById } from '@/types/project';
import { HierarchicalSectionItem } from './hierarchical-section-item';
import { useToast } from '@/hooks/use-toast';

// Props interface for ProjectSidebarContent
export interface ProjectSidebarContentProps {
    project: Project;
    activeSectionId: string | null;
    setActiveSectionId: (id: SectionIdentifier) => void;
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
    onAddSection: (parentId?: string) => void;
}

/**
 * ProjectSidebarContent Component
 *
 * Displays the sidebar content for the project editor, including project details,
 * standard pages, and editable table of contents with numbering. Handles toggling, edits,
 * and new section creation. Separates scrolling for standard pages and report sections.
 */
export const ProjectSidebarContent: React.FC<ProjectSidebarContentProps> = ({
    project,
    activeSectionId,
    setActiveSectionId,
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
    onAddSection,
}) => {
     const { toast } = useToast();

     const handleSectionClick = (id: SectionIdentifier) => {
         setActiveSectionId(id);
         onCloseSheet?.();
     };

     const handleAddNewSection = (parentId?: string) => {
          onAddSection(parentId);
      };

     // Recursive function to render sections and sub-sections
    const renderSectionsRecursive = (sections: HierarchicalProjectSection[], level: number, parentNumbering: string = ''): React.ReactNode[] => {
        return sections.map((section, index) => {
            const currentNumbering = parentNumbering ? `${parentNumbering}.${index + 1}` : `${index + 1}`;
            return (
                <HierarchicalSectionItem
                    key={section.id} // Key directly on the list item component
                    section={section}
                    level={level}
                    numbering={currentNumbering}
                    activeSectionId={activeSectionId}
                    setActiveSectionId={setActiveSectionId} // Pass function directly
                    onEditSectionName={onEditSectionName}
                    onDeleteSection={onDeleteSection} // Pass handler
                    onAddSubSection={handleAddNewSection} // Pass add sub-section handler
                    isEditing={isEditingSections}
                    onCloseSheet={onCloseSheet}
                    renderSubSections={renderSectionsRecursive} // Pass the render function for recursion
                />
            );
        });
    };


     return (
        <div className="flex flex-col h-full border-r bg-card">
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
                 <Input
                        id="projectTitleSidebar"
                        value={project.title}
                        readOnly
                        className="h-8 text-base font-semibold bg-transparent border-0 shadow-none focus-visible:ring-0 p-0 truncate flex-1 mr-2"
                        placeholder="Project Title"
                        aria-label="Project Title (Readonly)"
                    />
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleUndo}
                    disabled={!canUndo}
                    className="flex-shrink-0"
                    title={canUndo ? "Undo last change" : "Nothing to undo"}
                >
                    <Undo className="h-4 w-4" />
                </Button>
            </div>

            {/* Project Details Button */}
            <div className="px-2 py-2 flex-shrink-0">
                <Button
                    key="-1"
                    variant={activeSectionId === String(-1) ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => handleSectionClick(-1)}
                    className="justify-start w-full"
                    aria-current={activeSectionId === String(-1) ? "page" : undefined}
                >
                    <Settings className="mr-2 h-4 w-4" />
                    Project Details
                </Button>
            </div>
            <Separator className="my-0 flex-shrink-0" />

            {/* Standard Report Pages Section */}
            <div className="px-2 py-2 flex-shrink-0">
                <p className="px-2 text-xs font-semibold text-muted-foreground mb-1">STANDARD PAGES</p>
                <ScrollArea className="w-full overflow-x-auto">
                    <nav className="flex flex-col gap-1 whitespace-nowrap">
                        {STANDARD_REPORT_PAGES.map((pageName) => {
                            const pageId = String(STANDARD_PAGE_INDICES[pageName]);
                            return (
                                <Button
                                    key={pageId}
                                    variant={activeSectionId === pageId ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => handleSectionClick(STANDARD_PAGE_INDICES[pageName])}
                                    className="justify-start"
                                    aria-current={activeSectionId === pageId ? "page" : undefined}
                                    title={pageName}
                                >
                                    <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
                                    <span>{pageName}</span>
                                </Button>
                            );
                        })}
                    </nav>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </div>
            <Separator className="my-0 flex-shrink-0" />

            {/* Report Sections Section */}
            <div className="flex-1 flex flex-col min-h-0"> {/* Allow this section to grow and enable internal scroll */}
                 <div className="flex justify-between items-center px-4 py-2 flex-shrink-0">
                    <p className="text-xs font-semibold text-muted-foreground">REPORT SECTIONS</p>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingSections(!isEditingSections)}
                        className="text-xs h-auto py-0 px-1 text-primary hover:bg-primary/10"
                    >
                        {isEditingSections ? 'Done' : 'Edit'}
                    </Button>
                 </div>
                 <ScrollArea className="flex-1 w-full overflow-x-auto px-2 pb-2"> {/* Take remaining space */}
                     <nav className="flex flex-col gap-1 whitespace-nowrap">
                       {project.sections?.length > 0 ? (
                          renderSectionsRecursive(project.sections, 0) // Use the render function
                       ) : (
                         <p className="px-2 text-xs text-muted-foreground italic">Generate or add sections.</p>
                       )}
                       {isEditingSections && (
                            <Button
                                key="add-new-section-button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddNewSection()}
                                className="justify-start mt-2 text-muted-foreground hover:text-primary"
                                title="Add new top-level section"
                            >
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Section
                            </Button>
                        )}
                     </nav>
                     <ScrollBar orientation="horizontal" />
                 </ScrollArea>
             </div>

             {/* Footer */}
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
                     className="w-full mt-2 hover:glow-accent focus-visible:glow-accent"
                     title={project.storageType === 'cloud' ? "Project is saved online" : "Save project to the cloud (requires login - coming soon)"}
                 >
                     {project.storageType === 'cloud' ? <Cloud className="mr-2 h-4 w-4 text-green-500" /> : <CloudOff className="mr-2 h-4 w-4" />}
                     {project.storageType === 'cloud' ? 'Saved Online' : 'Save Online'}
                 </Button>
                 <p className="text-xs text-muted-foreground text-center mt-2">
                     Changes are saved automatically {project.storageType === 'local' ? 'locally' : 'to the cloud'}.
                 </p>
             </div>
        </div>
     );
}
