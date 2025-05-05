// src/components/project-sidebar-content.tsx
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Settings, Undo, Lightbulb, Cloud, CloudOff, PlusCircle, FileText, Loader2 } from 'lucide-react'; // Removed unused icons, kept Loader2
import type { Project, SectionIdentifier, HierarchicalProjectSection } from '@/types/project';
// Import constants and utility function from the correct location
import { STANDARD_REPORT_PAGES, STANDARD_PAGE_INDICES, findSectionById, updateProject as updateProjectHelper } from '@/lib/project-utils'; // Corrected import path
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
 *
 * Displays the sidebar content for the project editor, including project details,
 * standard pages, and editable table of contents with numbering. Handles toggling, edits,
 * and new section creation. Separates scrolling for standard pages and report sections.
 */
export const ProjectSidebarContent: React.FC<ProjectSidebarContentProps> = ({
    project,
    updateProject, // Receive updateProject function
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
    onDeleteSection, // Get delete handler
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

         // Use the helper function to update the project state
         updateProject(prev => {
            // Recursive function to add the section at the correct level
            const addRecursive = (sections: HierarchicalProjectSection[]): HierarchicalProjectSection[] => {
                 if (!parentId) {
                     // Add to top level
                     return [...sections, newSection];
                 }
                 // Find the parent and add as sub-section
                 return sections.map(section => {
                     if (section.id === parentId) {
                         // Ensure subSections exists before spreading
                         const currentSubSections = section.subSections || [];
                         return {
                             ...section,
                             subSections: [...currentSubSections, newSection]
                         };
                     }
                     if (section.subSections && section.subSections.length > 0) {
                         // Recursively search in sub-sections
                         const updatedSubSections = addRecursive(section.subSections);
                         // Only create a new object if sub-sections actually changed to avoid unnecessary re-renders
                         if (updatedSubSections !== section.subSections) {
                            return { ...section, subSections: updatedSubSections };
                         }
                     }
                     return section; // Return unchanged section if not the parent and no sub-sections needed update
                 });
            };
            // Return the new project state with updated sections
             return { ...prev, sections: addRecursive(prev.sections || []) }; // Ensure sections is an array
         }, true); // saveToHistory = true

         toast({ title: parentId ? "Sub-section Added" : "Section Added" });
         setIsEditingSections(true); // Ensure edit mode is active after adding
         // Automatically activate the newly added section for editing its name
          setTimeout(() => {
            const newSectionElement = document.getElementById(`edit-section-input-${newSection.id}`);
             if (newSectionElement) {
                // This assumes HierarchicalSectionItem handles enabling edit mode and focusing
                 setActiveSectionId(newSection.id); // Make it active
                 // The HierarchicalSectionItem should handle the edit state based on isEditing prop
             }
          }, 0);
     };


     // Recursive function to render sections and sub-sections
    const renderSectionsRecursive = (sections: HierarchicalProjectSection[], level: number, parentNumbering: string = ''): React.ReactNode[] => {
        return sections.map((section, index) => {
            // Calculate numbering based on level and index (1-based)
            const currentNumbering = parentNumbering ? `${parentNumbering}.${index + 1}` : `${index + 1}`;
            return (
                <HierarchicalSectionItem
                    key={section.id} // ** Key is crucial here **
                    section={section}
                    level={level}
                    numbering={currentNumbering} // Pass numbering
                    activeSectionId={activeSectionId}
                    setActiveSectionId={setActiveSectionId} // Pass function directly
                    onEditSectionName={onEditSectionName}
                    onDeleteSection={onDeleteSection} // Pass handler
                    onAddSubSection={handleAddSectionLocal} // Use local add handler for sub-sections
                    isEditing={isEditingSections}
                    onCloseSheet={onCloseSheet}
                    renderSubSections={renderSectionsRecursive} // Pass the render function for recursion
                />
            );
        });
    };


     return ( // Ensure the return statement is correctly placed after all function definitions
        <div className="flex flex-col h-full border-r bg-card">
            {/* Header - Uses project.title which updates when parent re-renders */}
            <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
                 <Input
                        id="projectTitleSidebar"
                        value={project.title}
                        readOnly
                        className="h-8 text-base font-semibold bg-transparent border-0 shadow-none focus-visible:ring-0 p-0 truncate flex-1 mr-2 text-left" // Explicitly add text-left
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

            {/* Project Details Button - `justify-start` aligns content left */}
            <div className="px-2 py-2 flex-shrink-0">
                <Button
                    key="-1"
                    variant={activeSectionId === String(-1) ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => handleSectionClick(-1)}
                    className="justify-start w-full text-left" // Ensure justify-start and text-left
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
                <ScrollArea className="w-full"> {/* Scroll only for this section */}
                    <nav className="flex flex-col gap-1">
                        {STANDARD_REPORT_PAGES.map((pageName) => {
                            const pageId = String(STANDARD_PAGE_INDICES[pageName]);
                            return (
                                <Button
                                    key={pageId}
                                    variant={activeSectionId === pageId ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => handleSectionClick(STANDARD_PAGE_INDICES[pageName])}
                                    className="justify-start text-left" // Ensure justify-start and text-left
                                    aria-current={activeSectionId === pageId ? "page" : undefined}
                                    title={pageName}
                                >
                                    <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
                                    <span className="truncate">{pageName}</span> {/* Added truncate */}
                                </Button>
                            );
                        })}
                    </nav>
                    <ScrollBar orientation="horizontal" /> {/* Horizontal scroll for standard pages */}
                </ScrollArea>
            </div>
            <Separator className="my-0 flex-shrink-0" />

            {/* Report Sections Section */}
            <div className="flex-1 flex flex-col min-h-0"> {/* Allow this section to grow and enable internal scroll */}
                 <div className="flex justify-between items-center px-4 py-2 flex-shrink-0">
                    <p className="text-xs font-semibold text-muted-foreground text-left">REPORT SECTIONS</p> {/* Ensured text-left */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingSections(!isEditingSections)}
                        className="text-xs h-auto py-0 px-1 text-primary hover:bg-primary/10"
                    >
                        {isEditingSections ? 'Done' : 'Edit'}
                    </Button>
                 </div>
                 <ScrollArea className="flex-1 px-2 py-2 overflow-x-auto"> {/* Takes remaining space and allows horizontal scroll for sections */}
                     <nav className="flex flex-col gap-1 whitespace-nowrap"> {/* Add whitespace-nowrap */}
                       {project.sections?.length > 0 ? (
                          // Call the recursive rendering function starting at level 0
                          renderSectionsRecursive(project.sections, 0)
                       ) : (
                         <p className="px-2 text-xs text-muted-foreground italic text-left">Generate or add sections.</p>
                       )}
                       {/* Add New Section Button (visible in edit mode) */}
                        {isEditingSections && (
                            <Button
                                key="add-new-section-button" // Stable key
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddSectionLocal()} // Add top-level section
                                className="justify-start mt-2 text-muted-foreground hover:text-primary text-left" // Ensure text-left
                                title="Add new top-level section"
                            >
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Section
                            </Button>
                        )}
                     </nav>
                     <ScrollBar orientation="horizontal" /> {/* Horizontal scroll for report sections */}
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