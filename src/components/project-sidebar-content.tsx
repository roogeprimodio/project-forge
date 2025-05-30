// src/components/project-sidebar-content.tsx
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Settings, Undo, Lightbulb, Cloud, CloudOff, PlusCircle, FileText, Loader2, Edit3, BookOpen, Brain } from 'lucide-react';
import type { Project, SectionIdentifier, HierarchicalProjectSection } from '@/types/project';
import { STANDARD_REPORT_PAGES, STANDARD_PAGE_INDICES, TOC_SECTION_NAME, findSectionById } from '@/lib/project-utils';
import { HierarchicalSectionItem } from './hierarchical-section-item';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
    isSuggesting: boolean; // Added for consistency
    handleSaveOnline: () => void;
    canUndo: boolean;
    handleUndo: () => void;
    onCloseSheet?: () => void;
    isEditingSections: boolean;
    setIsEditingSections: (editing: boolean) => void;
    onEditSectionName: (id: string, newName: string) => void;
    onDeleteSection: (id: string) => void;
    onAddSubSection: (parentId: string) => void;
    handleAddNewSection: () => void;
}

const renderSectionsRecursive = (
    sections: HierarchicalProjectSection[],
    level: number,
    parentNumbering: string,
    activeSectionId: string | null,
    setActiveSectionId: (id: SectionIdentifier) => void,
    onEditSectionName: (id: string, newName: string) => void,
    onDeleteSection: (id: string) => void,
    onAddSubSection: (parentId: string) => void,
    isEditingSections: boolean,
    onCloseSheet?: () => void
): React.ReactNode => {
    return sections.map((section, index) => {
        const currentNumbering = parentNumbering ? `${parentNumbering}.${index + 1}` : `${index + 1}`;
        return (
            <HierarchicalSectionItem
                key={section.id}
                section={section}
                level={level}
                numbering={currentNumbering}
                activeSectionId={activeSectionId}
                setActiveSectionId={setActiveSectionId}
                onEditSectionName={onEditSectionName}
                onDeleteSection={onDeleteSection}
                onAddSubSection={onAddSubSection}
                isEditing={isEditingSections}
                onCloseSheet={onCloseSheet}
            >
                {section.subSections && section.subSections.length > 0 && (
                    <div className="pl-4 border-l border-muted/30">
                        {renderSectionsRecursive(
                            section.subSections,
                            level + 1,
                            currentNumbering,
                            activeSectionId,
                            setActiveSectionId,
                            onEditSectionName,
                            onDeleteSection,
                            onAddSubSection,
                            isEditingSections,
                            onCloseSheet
                        )}
                    </div>
                )}
            </HierarchicalSectionItem>
        );
    });
};


export const ProjectSidebarContent: React.FC<ProjectSidebarContentProps> = ({
    project,
    updateProject,
    activeSectionId,
    setActiveSectionId,
    activeSubSectionId, // Will be used to highlight the deeply active item
    setActiveSubSectionId, // Will be set by HierarchicalSectionItem
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
    onAddSubSection,
    handleAddNewSection,
}) => {
     const { toast } = useToast();

     const handleMainItemClick = (id: SectionIdentifier) => {
         setActiveSectionId(id);
         setActiveSubSectionId(null); // Clear sub-section when a main item is clicked
         onCloseSheet?.();
     };

     const handleModelChange = (model: 'gemini' | 'openai') => {
        updateProject({ preferredAiModel: model }, true);
        toast({
            title: "AI Model Updated",
            description: `Project will now use ${model === 'gemini' ? 'Google Gemini' : 'OpenAI GPT'} for generations.`,
        });
    };

     // This function will be passed down to HierarchicalSectionItem
     // It handles clicks on any item in the hierarchy
     const handleHierarchicalItemClick = (itemId: string) => {
        const mainSection = project.sections.find(s => s.id === itemId || findSectionById([s], itemId));
        if (mainSection) {
            setActiveSectionId(mainSection.id); // Set the top-level parent as active
            if (mainSection.id !== itemId) {
                 setActiveSubSectionId(itemId); // Set the actual clicked item as sub-active
            } else {
                setActiveSubSectionId(null); // Clicked a main section
            }
        } else { // Could be a standard page
            setActiveSectionId(itemId);
            setActiveSubSectionId(null);
        }
        onCloseSheet?.();
     };


     return (
        <div className="flex flex-col h-full bg-card text-left">
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

            <div className="px-2 py-2 flex-shrink-0">
                <Button
                    key="-1"
                    variant={activeSectionId === String(-1) && activeSubSectionId === null ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => handleMainItemClick(String(-1))}
                    className="justify-start w-full text-left text-sm hover:bg-muted/60 data-[variant=secondary]:bg-primary/10"
                    aria-current={activeSectionId === String(-1) && activeSubSectionId === null ? "page" : undefined}
                >
                    <Settings className="mr-2 h-4 w-4" />
                    Project Details
                </Button>
            </div>
            <Separator className="my-0 flex-shrink-0" />

            <div className="p-3 border-b flex-shrink-0">
                <Label htmlFor="ai-model-select" className="text-xs font-medium text-muted-foreground mb-1 block">Preferred AI Model</Label>
                <Select
                    value={project.preferredAiModel || 'gemini'}
                    onValueChange={(value: 'gemini' | 'openai') => handleModelChange(value)}
                >
                    <SelectTrigger id="ai-model-select" className="h-9 w-full text-xs">
                        <SelectValue placeholder="Select AI Model" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="gemini" className="text-xs"> <Brain className="inline h-3.5 w-3.5 mr-1.5 text-blue-500" /> Google Gemini (Default)</SelectItem>
                        <SelectItem value="openai" className="text-xs"> <Brain className="inline h-3.5 w-3.5 mr-1.5 text-green-500" /> OpenAI GPT</SelectItem>
                    </SelectContent>
                </Select>
                 <p className="text-xs text-muted-foreground mt-1">Select the AI for content generation. Ensure the corresponding API key is set in your Profile.</p>
            </div>
            <Separator className="my-0 flex-shrink-0" />


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
                                    onClick={() => handleMainItemClick(STANDARD_PAGE_INDICES[pageName])}
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
                          renderSectionsRecursive(
                            project.sections,
                            0,
                            "",
                            activeSubSectionId || activeSectionId, // Pass the most specific active ID
                            handleHierarchicalItemClick, // Use the new handler
                            onEditSectionName,
                            onDeleteSection,
                            onAddSubSection,
                            isEditingSections,
                            onCloseSheet
                          )
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

             <div className="p-4 border-t space-y-2 flex-shrink-0">
                 <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateTocClick}
                    disabled={isGeneratingOutline || isGenerating || isSummarizing || isSuggesting || !project.projectContext?.trim()}
                    className="w-full hover:glow-accent focus-visible:glow-accent"
                    title={!project.projectContext?.trim() ? "Add project context in Project Details first" : "Generate project outline based on context"}
                >
                    {isGeneratingOutline ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                    {isGeneratingOutline ? 'Generating Outline...' : 'Generate Outline Preview'}
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
                     {project.storageType === 'cloud' ? 'Saved Online' : 'Save Online (Soon)'}
                 </Button>
                 <p className="text-xs text-muted-foreground text-center mt-1">
                     Changes saved {project.storageType === 'local' ? 'locally' : 'to cloud'}.
                 </p>
             </div>
        </div>
     );
};
