// src/components/project-sidebar-content.tsx
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Settings, Undo, Lightbulb, Cloud, CloudOff, PlusCircle, FileText } from 'lucide-react';
import type { Project } from '@/types/project';
import { STANDARD_REPORT_PAGES, STANDARD_PAGE_INDICES } from '@/types/project';
import { HierarchicalSectionItem } from './hierarchical-section-item'; // Import the extracted component

// Props interface for ProjectSidebarContent
export interface ProjectSidebarContentProps {
    project: Project;
    activeSectionId: string | null; // Use string ID
    setActiveSectionId: (id: string | number) => void; // Accept ID or numeric standard index
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
    onEditSectionName: (id: string) => void;
    onDeleteSection: (id: string) => void; // Define delete handler prop
    onAddSection: (parentId?: string) => void; // Define add handler prop
}

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
     const handleSectionClick = (id: string | number) => {
         if (isEditingSections) {
             return;
         }
         setActiveSectionId(id);
         onCloseSheet?.();
     };

     const handleAddNewSection = () => {
          onAddSection();
      };

     return (
        <div className="flex flex-col h-full border-r bg-card">
            <div className="p-4 border-b flex justify-between items-center">
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
             <ScrollArea className="flex-1 px-2 py-2 overflow-x-auto"> {/* Add overflow-x-auto here */}
                 <nav className="flex flex-col gap-1 whitespace-nowrap"> {/* Add whitespace-nowrap here */}
                     {/* Project Details Button */}
                     <Button
                         key="-1"
                         variant={activeSectionId === String(-1) ? "secondary" : "ghost"}
                         size="sm"
                         onClick={() => handleSectionClick(-1)}
                         className="justify-start"
                         aria-current={activeSectionId === String(-1) ? "page" : undefined}
                         disabled={isEditingSections}
                     >
                         <Settings className="mr-2 h-4 w-4" />
                         Project Details
                     </Button>
                     <Separator className="my-2" />

                     {/* Standard Report Pages */}
                     <p className="px-2 text-xs font-semibold text-muted-foreground mb-1">STANDARD PAGES</p>
                     {STANDARD_REPORT_PAGES.map((pageName) => {
                        const pageIndex = STANDARD_PAGE_INDICES[pageName];
                        const pageId = String(pageIndex);
                        return (
                            <Button
                                key={pageId} // Key for standard page buttons
                                variant={activeSectionId === pageId ? "secondary" : "ghost"}
                                size="sm"
                                onClick={() => handleSectionClick(pageIndex)}
                                className="justify-start"
                                aria-current={activeSectionId === pageId ? "page" : undefined}
                                title={pageName}
                                disabled={isEditingSections}
                            >
                                <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
                                <span>{pageName}</span>
                            </Button>
                        );
                     })}

                     <Separator className="my-2" />

                      {/* Table of Contents (Generated Sections List) */}
                       <div className="flex justify-between items-center px-2 mb-1">
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
                       {project.sections?.length > 0 ? (
                          project.sections.map((section) => (
                            // ** Ensure the key prop is DIRECTLY on HierarchicalSectionItem **
                            <HierarchicalSectionItem
                                key={section.id} // Apply key here to the component rendered by map
                                section={section}
                                level={0}
                                activeSectionId={activeSectionId}
                                setActiveSectionId={(id) => handleSectionClick(id)} // Pass string ID
                                onEditSectionName={onEditSectionName}
                                onDeleteSection={onDeleteSection} // Pass handler
                                isEditing={isEditingSections}
                                onCloseSheet={onCloseSheet}
                            />
                          ))
                       ) : (
                         <p className="px-2 text-xs text-muted-foreground italic">Generate or add sections.</p>
                       )}
                       {/* Add New Section Button (visible in edit mode or if no sections) */}
                        {isEditingSections && (
                            <Button
                                key="add-new-section-button" // Added key for stability if needed
                                variant="outline"
                                size="sm"
                                onClick={handleAddNewSection}
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
             <div className="p-4 border-t space-y-2">
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