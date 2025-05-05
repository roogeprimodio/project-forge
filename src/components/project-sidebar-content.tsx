// src/components/project-sidebar-content.tsx
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Settings, Undo, Lightbulb, Cloud, CloudOff, PlusCircle, FileText, Loader2, ChevronRight, ChevronDown, Edit3, Trash2 } from 'lucide-react'; // Import necessary icons
import type { Project, SectionIdentifier, HierarchicalProjectSection } from '@/types/project';
import { STANDARD_REPORT_PAGES, STANDARD_PAGE_INDICES, findSectionById, updateProject as updateProjectHelper } from '@/lib/project-utils'; // Import utils
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
}) => {
     const { toast } = useToast();

     const handleSectionClick = (id: SectionIdentifier) => {
         setActiveSectionId(id);
         onCloseSheet?.();
     };

     // Add a new section (top-level or sub-section) locally
     const handleAddSectionLocal = (parentId?: string) => {
         if (!project) return;

         const newSection: HierarchicalProjectSection = {
             id: uuidv4(), // Generate unique ID
             name: 'New Section', // Default name
             prompt: `Generate content for New Section... [Add specific instructions here, considering context: ${project.projectContext || ''}]`,
             content: '',
             lastGenerated: undefined,
             subSections: [], // Initialize with empty sub-sections
         };

         updateProject(prev => {
            const addRecursive = (sections: HierarchicalProjectSection[]): HierarchicalProjectSection[] => {
                 if (!parentId) {
                     // Add to top level
                     return [...sections, newSection];
                 }
                 // Add as sub-section
                 return sections.map(section => {
                     if (section.id === parentId) {
                         const currentSubSections = section.subSections || [];
                         return {
                             ...section,
                             subSections: [...currentSubSections, newSection]
                         };
                     }
                     // Recursively search in sub-sections
                     if (section.subSections && section.subSections.length > 0) {
                         const updatedSubSections = addRecursive(section.subSections);
                         // Only return a new object if sub-sections actually changed
                         if (updatedSubSections !== section.subSections) {
                             return { ...section, subSections: updatedSubSections };
                         }
                     }
                     return section; // Return unchanged section if not the parent and no change in children
                 });
            };
             return { ...prev, sections: addRecursive(prev.sections || []) };
         }, true); // Save to history

         toast({ title: parentId ? "Sub-section Added" : "Section Added" });
         setIsEditingSections(true); // Ensure edit mode is active
          // Activate and potentially focus the new section after state update
          setTimeout(() => {
             setActiveSectionId(newSection.id);
             // Try focusing the edit input if it exists (needs HierarchicalSectionItem to handle focus on name edit)
             const editInput = document.getElementById(`edit-section-input-${newSection.id}`);
             if (editInput) {
                 editInput.focus();
             } else {
                  // Fallback or handle differently if direct focus isn't possible
                  console.log("Could not focus new section's edit input immediately.");
             }
          }, 50); // Short delay to allow React to re-render
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
                    onAddSubSection={handleAddSectionLocal} // Pass the add sub-section handler
                    isEditing={isEditingSections}
                    onCloseSheet={onCloseSheet}
                    renderSubSections={renderSectionsRecursive} // Pass down the recursive function
                />
            );
        });
    };


     return (
        <div className="flex flex-col h-full border-r bg-card">
            {/* Header - Uses project.title which updates when parent re-renders */}
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
                    onClick={() => handleSectionClick(-1)}
                    className="justify-start w-full text-left" // Ensure text is left-aligned
                    aria-current={activeSectionId === String(-1) ? "page" : undefined}
                >
                    <Settings className="mr-2 h-4 w-4" />
                    Project Details
                </Button>
            </div>
            <Separator className="my-0 flex-shrink-0" />

            {/* Standard Report Pages Section */}
            <div className="px-2 py-2 flex-shrink-0">
                <p className="px-2 text-xs font-semibold text-muted-foreground mb-1 text-left">STANDARD PAGES</p> {/* Ensure text-left */}
                <ScrollArea className="w-full whitespace-nowrap"> {/* Ensure whitespace-nowrap for horizontal scroll */}
                    <nav className="flex flex-col gap-1">
                        {STANDARD_REPORT_PAGES.map((pageName) => {
                            const pageId = String(STANDARD_PAGE_INDICES[pageName]);
                            return (
                                <Button
                                    key={pageId}
                                    variant={activeSectionId === pageId ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => handleSectionClick(STANDARD_PAGE_INDICES[pageName])}
                                    className="justify-start text-left" // Ensure text-left
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
                </ScrollArea>
            </div>
            <Separator className="my-0 flex-shrink-0" />

            {/* Report Sections Section */}
            <div className="flex-1 flex flex-col min-h-0">
                 <div className="flex justify-between items-center pl-2 pr-4 py-2 flex-shrink-0">
                    <p className="text-xs font-semibold text-muted-foreground text-left">REPORT SECTIONS</p> {/* Ensure text-left */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingSections(!isEditingSections)}
                        className="text-xs h-auto py-0 px-1 text-primary hover:bg-primary/10"
                    >
                        {isEditingSections ? 'Done' : 'Edit'}
                    </Button>
                 </div>
                 {/* Vertical Scroll for the list, Horizontal Scroll within the list */}
                 <ScrollArea className="flex-1">
                     <div className="px-2 py-2"> {/* Add padding here */}
                         <ScrollArea className="w-full whitespace-nowrap"> {/* Horizontal scroll for the nav content */}
                            {/* Ensure the nav itself doesn't have centering classes */}
                            <nav className="flex flex-col gap-1 min-w-max text-left"> {/* Added text-left */}
                                {/* ** Apply the key directly to the HierarchicalSectionItem component ** */}
                                {/* Ensure section.id is unique within the project.sections array. */}
                               {project.sections?.length > 0 ? (
                                  renderSectionsRecursive(project.sections, 0) // Call recursive function
                               ) : (
                                 <p className="text-xs text-muted-foreground italic text-left">Generate or add sections.</p> // Ensure text-left
                               )}
                               {/* Add New Section Button */}
                                {isEditingSections && (
                                    <Button
                                        key="add-new-section-button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleAddSectionLocal()} // Call local add function without parentId for top-level
                                        className="justify-start mt-2 text-muted-foreground hover:text-primary text-left" // Ensure text-left
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