// src/components/project-sidebar-content.tsx
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Settings, Undo, Lightbulb, Cloud, CloudOff, PlusCircle, FileText, Loader2, ChevronRight, ChevronDown, Edit3, Trash2 } from 'lucide-react'; // Import necessary icons
import type { Project, SectionIdentifier, HierarchicalProjectSection } from '@/types/project';
import { STANDARD_REPORT_PAGES, STANDARD_PAGE_INDICES, findSectionById } from '@/lib/project-utils'; // Import utils
import { HierarchicalSectionItem } from './hierarchical-section-item'; // Import the hierarchical item
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid'; // Import uuid for generating unique IDs
import { cn } from '@/lib/utils'; // Import cn for conditional classes


// Props interface for ProjectSidebarContent
export interface ProjectSidebarContentProps {
    project: Project;
    updateProject: (updatedData: Partial<Project> | ((prev: Project) => Project), saveToHistory?: boolean) => void; // Pass updateProject function
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
    isEditingSections: boolean; // Manage edit mode state
    setIsEditingSections: (editing: boolean) => void;
    onEditSectionName: (id: string, newName: string) => void;
    onDeleteSection: (id: string) => void; // Handler for deleting sections
    onAddSubSection: (parentId: string) => void; // Added prop for adding sub-sections
}

/**
 * ProjectSidebarContent Component
 */
export const ProjectSidebarContent: React.FC<ProjectSidebarContentProps> = ({
    project,
    updateProject,
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
    onAddSubSection, // Destructure the new prop
}) => {
     const { toast } = useToast();

     const handleSectionClick = (id: SectionIdentifier) => {
         setActiveSectionId(id);
         onCloseSheet?.();
     };

     // Add a new top-level section locally
      const handleAddTopLevelSection = () => {
         if (!project) return;

         const newSection: HierarchicalProjectSection = {
             id: uuidv4(),
             name: 'New Section',
             prompt: `Generate content for New Section... [Add specific instructions here, considering context: ${project.projectContext || ''}]`,
             content: '',
             lastGenerated: undefined,
             subSections: [],
         };

         updateProject(prev => ({
             ...prev,
             sections: [...(prev.sections || []), newSection]
         }), true);

         toast({ title: "Section Added" });
         setIsEditingSections(true); // Ensure edit mode is active
         // Activate the new section
          setTimeout(() => {
             setActiveSectionId(newSection.id);
             // Optionally focus the edit input if needed
          }, 50);
     };


     // Recursive function to render sections and sub-sections
    const renderSectionsRecursive = (sections: HierarchicalProjectSection[], level: number, parentNumbering: string = ''): React.ReactNode[] => {
        return sections.map((section, index) => {
            const currentNumbering = parentNumbering ? `${parentNumbering}.${index + 1}` : `${index + 1}`;
            return (
                <HierarchicalSectionItem
                    key={section.id} // ** Key is crucial here **
                    section={section}
                    level={level}
                    numbering={currentNumbering}
                    activeSectionId={activeSectionId}
                    setActiveSectionId={setActiveSectionId}
                    onEditSectionName={onEditSectionName}
                    onDeleteSection={onDeleteSection}
                    onAddSubSection={onAddSubSection} // Pass the add sub-section handler
                    isEditing={isEditingSections}
                    onCloseSheet={onCloseSheet}
                    renderSubSections={renderSectionsRecursive} // Pass down the recursive function
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
                        className="h-8 text-base font-semibold bg-transparent border-0 shadow-none focus-visible:ring-0 p-0 truncate flex-1 mr-2 text-left"
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
                    onClick={() => handleSectionClick(String(-1))} // Use String() for consistency
                    className="justify-start w-full text-left"
                    aria-current={activeSectionId === String(-1) ? "page" : undefined}
                >
                    <Settings className="mr-2 h-4 w-4" />
                    Project Details
                </Button>
            </div>
            <Separator className="my-0 flex-shrink-0" />

            {/* Standard Report Pages Section with its own vertical scroll */}
            <div className="px-2 py-2 flex-shrink-0">
                <p className="px-2 text-xs font-semibold text-muted-foreground mb-1 text-left">STANDARD PAGES</p>
                {/* Vertical scroll for Standard Pages */}
                <ScrollArea className="h-48 w-full"> {/* Adjust height as needed */}
                    <nav className="flex flex-col gap-1 pr-2"> {/* Add padding-right */}
                        {STANDARD_REPORT_PAGES.map((pageName) => {
                            const pageId = String(STANDARD_PAGE_INDICES[pageName]);
                            return (
                                <Button
                                    key={pageId}
                                    variant={activeSectionId === pageId ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => handleSectionClick(STANDARD_PAGE_INDICES[pageName])}
                                    className="justify-start text-left"
                                    aria-current={activeSectionId === pageId ? "page" : undefined}
                                    title={pageName}
                                >
                                    <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
                                    <span className="truncate">{pageName}</span>
                                </Button>
                            );
                        })}
                    </nav>
                </ScrollArea>
            </div>
            <Separator className="my-0 flex-shrink-0" />

            {/* Report Sections Section with its own vertical scroll */}
            <div className="flex-1 flex flex-col min-h-0"> {/* Use flex-1 and min-h-0 */}
                 <div className="flex justify-between items-center pl-2 pr-4 py-2 flex-shrink-0">
                    <p className="text-xs font-semibold text-muted-foreground text-left">REPORT SECTIONS</p>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingSections(!isEditingSections)}
                        className="text-xs h-auto py-0 px-1 text-primary hover:bg-primary/10"
                    >
                        {isEditingSections ? 'Done' : 'Edit'}
                    </Button>
                 </div>
                 {/* Vertical Scroll for Report Sections */}
                 <ScrollArea className="flex-1"> {/* flex-1 to fill remaining space */}
                     <div className="px-2 py-2">
                         {/* Horizontal Scroll remains within the vertical scroll */}
                         <ScrollArea className="w-full whitespace-nowrap">
                            <nav className="flex flex-col gap-1 min-w-max text-left">
                               {project.sections?.length > 0 ? (
                                  renderSectionsRecursive(project.sections, 0)
                               ) : (
                                 <p className="text-xs text-muted-foreground italic text-left">Generate or add sections.</p>
                               )}
                                {isEditingSections && (
                                    <Button
                                        key="add-new-section-button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleAddTopLevelSection} // Add top-level section
                                        className="justify-start mt-2 text-muted-foreground hover:text-primary text-left"
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
};
