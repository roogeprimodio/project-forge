// src/components/project-sidebar-content.tsx
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'; // Import ScrollBar
import { Separator } from '@/components/ui/separator';
import { Settings, Undo, Lightbulb, Cloud, CloudOff, PlusCircle, FileText, Loader2 } from 'lucide-react'; // Import necessary icons
import type { Project, SectionIdentifier, HierarchicalProjectSection } from '@/types/project';
import { STANDARD_REPORT_PAGES, STANDARD_PAGE_INDICES, findSectionById } from '@/lib/project-utils'; // Import from lib
import { HierarchicalSectionItem } from './hierarchical-section-item'; // Import the hierarchical item
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid'; // Import uuid for generating unique IDs
import { cn } from '@/lib/utils';

// Props interface for ProjectSidebarContent
export interface ProjectSidebarContentProps {
    project: Project;
    updateProject: (updatedData: Partial<Project> | ((prev: Project) => Project), saveToHistory?: boolean) => void;
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
    onAddSubSection: (parentId: string) => void; // Add sub-section handler prop
    handleAddNewSection: () => void; // Handler for adding top-level sections
}

/**
 * ProjectSidebarContent Component
 * Renders the sidebar content for the project editor, including project details,
 * standard pages, and the hierarchical report sections.
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
    onAddSubSection, // Destructure the handler
    handleAddNewSection, // Destructure the handler
}) => {
     const { toast } = useToast();

     const handleSectionClick = (id: SectionIdentifier) => {
         setActiveSectionId(id);
         onCloseSheet?.();
     };

     // Recursive function to render sections and sub-sections
     // This function is passed down to HierarchicalSectionItem
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
                    setActiveSectionId={setActiveSectionId} // Pass setActiveSectionId down
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

            {/* Standard Report Pages Section */}
            <div className="px-2 py-2 flex-shrink-0">
                <p className="px-2 text-xs font-semibold text-muted-foreground mb-1 text-left">STANDARD PAGES</p>
                {/* ScrollArea for STANDARD PAGES */}
                <ScrollArea className="w-full whitespace-nowrap max-h-[200px]"> {/* Added max-height for independent scroll */}
                    <nav className="flex flex-col gap-1 min-w-max text-left">
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
                     <ScrollBar orientation="horizontal" />
                     <ScrollBar orientation="vertical" /> {/* Explicitly add vertical scrollbar */}
                </ScrollArea>
            </div>
            <Separator className="my-0 flex-shrink-0" />

            {/* Report Sections Section */}
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
                 {/* ScrollArea for REPORT SECTIONS */}
                 <ScrollArea className="flex-1 w-full"> {/* flex-1 to fill space, w-full */}
                     <div className="px-2 py-2">
                        <nav className="flex flex-col gap-1 min-w-max text-left whitespace-nowrap"> {/* min-w-max and whitespace-nowrap */}
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
                                   onClick={handleAddNewSection}
                                   className="justify-start mt-2 text-muted-foreground hover:text-primary text-left"
                                   title="Add new top-level section"
                               >
                                   <PlusCircle className="mr-2 h-4 w-4" />
                                   Add Section
                               </Button>
                           )}
                        </nav>
                     </div>
                     <ScrollBar orientation="horizontal" />
                     <ScrollBar orientation="vertical" /> {/* Explicitly add vertical scrollbar */}
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
