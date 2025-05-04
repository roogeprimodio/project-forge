"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { BookOpen, Settings, ChevronLeft, Save, Loader2, Wand2 } from 'lucide-react';
import Link from 'next/link';
import type { Project, ProjectSection } from '@/types/project';
import { COMMON_SECTIONS } from '@/types/project';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useToast } from '@/hooks/use-toast';
import { generateSectionAction } from '@/app/actions';

interface ProjectEditorProps {
  projectId: string;
}

export function ProjectEditor({ projectId }: ProjectEditorProps) {
  const [projects, setProjects] = useLocalStorage<Project[]>('projects', []);
  const { toast } = useToast();
  const [activeSectionIndex, setActiveSectionIndex] = useState<number | null>(0); // Start with first section or null if empty
  const [isGenerating, setIsGenerating] = useState(false);
  const [customSectionName, setCustomSectionName] = useState('');

  // Find the current project based on projectId
  const project = useMemo(() => projects.find(p => p.id === projectId), [projects, projectId]);

  // Effect to initialize activeSectionIndex if project loads/changes
  useEffect(() => {
     if (project && project.sections.length > 0 && activeSectionIndex === null) {
       setActiveSectionIndex(0);
     } else if (project && project.sections.length === 0) {
       setActiveSectionIndex(null);
     }
     // If project becomes undefined (e.g., deleted), reset
     if (!project) {
         setActiveSectionIndex(null);
     }
  }, [project, activeSectionIndex]);


  const updateProject = useCallback((updatedProjectData: Partial<Project>) => {
    setProjects(prevProjects =>
      prevProjects.map(p =>
        p.id === projectId ? { ...p, ...updatedProjectData, updatedAt: new Date().toISOString() } : p
      )
    );
  }, [projectId, setProjects]);

  const handleSectionContentChange = (index: number, content: string) => {
    if (!project) return;
    const updatedSections = [...project.sections];
    updatedSections[index] = { ...updatedSections[index], content };
    updateProject({ sections: updatedSections });
  };

  const handleSectionPromptChange = (index: number, prompt: string) => {
    if (!project) return;
    const updatedSections = [...project.sections];
    updatedSections[index] = { ...updatedSections[index], prompt };
    updateProject({ sections: updatedSections });
  }

  const handleProjectDetailChange = (field: keyof Project, value: string) => {
    if (!project) return;
    updateProject({ [field]: value });
  };

  const addSection = (name: string) => {
    if (!project || !name.trim()) return;
    const newSection: ProjectSection = {
      name: name.trim(),
      prompt: `Generate the ${name.trim()} section for the project titled "${project.title}". Consider the following details: [Add specific points or requirements here]`,
      content: '',
      lastGenerated: undefined,
    };
    const updatedSections = [...project.sections, newSection];
    updateProject({ sections: updatedSections });
    setActiveSectionIndex(updatedSections.length - 1); // Activate the new section
    setCustomSectionName(''); // Clear input
  };

  const handleGenerateSection = async (index: number) => {
    if (!project || index < 0 || index >= project.sections.length) return;

    const section = project.sections[index];
    setIsGenerating(true);

    try {
      const result = await generateSectionAction({
        projectTitle: project.title,
        sectionName: section.name,
        prompt: section.prompt,
        teamDetails: project.teamDetails,
        collegeInfo: project.collegeInfo,
      });

      if ('error' in result) {
        throw new Error(result.error);
      }

      const updatedSections = [...project.sections];
      updatedSections[index] = {
        ...section,
        content: result.reportSectionContent,
        lastGenerated: new Date().toISOString(),
      };
      updateProject({ sections: updatedSections });

      toast({
        title: "Section Generated",
        description: `"${section.name}" content has been updated.`,
      });

    } catch (error) {
      console.error("Generation failed:", error);
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Could not generate section content.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

   if (!project) {
    // Handle case where project is not found (e.g., deleted or invalid ID)
    // You might want to redirect or show a specific message
    useEffect(() => {
        // Maybe redirect after a delay or show message
        // router.push('/'); // If using useRouter
    }, []);
    return (
        <div className="flex items-center justify-center min-h-screen">
            <p className="text-lg text-destructive">Project not found.</p>
             <Link href="/" passHref legacyBehavior>
                 <Button variant="link" className="ml-2">Go to Dashboard</Button>
             </Link>
        </div>
    );
   }


  const activeSection = activeSectionIndex !== null ? project.sections[activeSectionIndex] : null;

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen">
        <Sidebar side="left" collapsible="icon" className="border-r">
          <SidebarHeader className="p-4">
             <div className="flex items-center justify-between">
                 <Link href="/" passHref legacyBehavior>
                    <Button variant="ghost" size="sm" className="text-primary hover:bg-accent">
                        <ChevronLeft className="mr-1 h-4 w-4"/> Back
                    </Button>
                 </Link>
                <h2 className="font-semibold text-lg text-primary group-data-[state=collapsed]:hidden">
                  Project Forge
                </h2>
            </div>
          </SidebarHeader>

           <Separator className="mb-2" />

          <SidebarContent>
            <ScrollArea className="h-full px-2">
                 {/* Project Title Input - visible only when expanded */}
                 <div className="mb-4 group-data-[state=collapsed]:hidden px-2">
                    <Label htmlFor="projectTitleSidebar" className="text-xs font-medium text-muted-foreground">Project Title</Label>
                    <Input
                        id="projectTitleSidebar"
                        value={project.title}
                        onChange={(e) => handleProjectDetailChange('title', e.target.value)}
                        className="h-8 mt-1 text-base"
                        placeholder="Enter Project Title"
                    />
                 </div>


              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setActiveSectionIndex(-1)} // Use -1 for settings/details
                    isActive={activeSectionIndex === -1}
                    tooltip="Project Settings"
                  >
                    <Settings />
                    <span className="group-data-[state=collapsed]:hidden">Project Details</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                 <Separator className="my-2" />
                <p className="px-4 text-xs font-semibold text-muted-foreground mb-1 group-data-[state=collapsed]:hidden">SECTIONS</p>
                {project.sections.map((section, index) => (
                  <SidebarMenuItem key={index}>
                    <SidebarMenuButton
                      onClick={() => setActiveSectionIndex(index)}
                      isActive={activeSectionIndex === index}
                      tooltip={section.name}
                    >
                      <BookOpen />
                      <span className="group-data-[state=collapsed]:hidden">{section.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}

                 {/* Add Standard Sections */}
                 <div className="mt-4 group-data-[state=collapsed]:hidden px-2">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Add Standard Section</p>
                    <div className="flex flex-col gap-1">
                        {COMMON_SECTIONS.filter(cs => !project.sections.some(s => s.name === cs)).map(sectionName => (
                            <Button key={sectionName} variant="ghost" size="sm" className="justify-start text-muted-foreground" onClick={() => addSection(sectionName)}>
                                {sectionName}
                            </Button>
                        ))}
                    </div>
                 </div>

                 {/* Add Custom Section */}
                  <div className="mt-4 group-data-[state=collapsed]:hidden px-2">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Add Custom Section</p>
                    <div className="flex gap-2">
                        <Input
                            value={customSectionName}
                            onChange={(e) => setCustomSectionName(e.target.value)}
                            placeholder="Section Name"
                            className="h-8"
                        />
                        <Button size="sm" onClick={() => addSection(customSectionName)} disabled={!customSectionName.trim()}>Add</Button>
                    </div>
                  </div>
              </SidebarMenu>
            </ScrollArea>
          </SidebarContent>
           <SidebarFooter className="p-4 border-t group-data-[state=collapsed]:hidden">
               {/* Add save status or actions here if needed */}
                <p className="text-xs text-muted-foreground text-center">
                    Changes are saved automatically.
                </p>
           </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1 flex flex-col bg-background">
           {/* Main Content Area Header */}
           <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-4 lg:h-[60px] lg:px-6">
               <SidebarTrigger className="md:hidden" /> {/* Mobile toggle */}
               <h1 className="flex-1 text-lg font-semibold md:text-xl text-primary truncate">
                {activeSectionIndex === -1 ? 'Project Details' : activeSection?.name ?? project.title ?? 'Project'}
               </h1>
               {/* Add other header actions like download, etc. here */}
           </header>

          {/* Main Content */}
          <ScrollArea className="flex-1 p-4 md:p-6">
            {activeSectionIndex === -1 ? (
                // Render Project Details/Settings Form
                <Card>
                    <CardHeader>
                        <CardTitle>Project Details</CardTitle>
                        <CardDescription>Edit general information about your project.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div>
                            <Label htmlFor="projectTitleMain">Project Title</Label>
                            <Input
                                id="projectTitleMain"
                                value={project.title}
                                onChange={(e) => handleProjectDetailChange('title', e.target.value)}
                                placeholder="Enter Project Title"
                                className="mt-1"
                            />
                        </div>
                         <div>
                            <Label htmlFor="teamDetails">Team Details</Label>
                            <Textarea
                                id="teamDetails"
                                value={project.teamDetails}
                                onChange={(e) => handleProjectDetailChange('teamDetails', e.target.value)}
                                placeholder="Enter team member names and IDs, one per line"
                                className="mt-1 min-h-[80px]"
                            />
                        </div>
                         <div>
                            <Label htmlFor="collegeInfo">College Information</Label>
                            <Input
                                id="collegeInfo"
                                value={project.collegeInfo}
                                onChange={(e) => handleProjectDetailChange('collegeInfo', e.target.value)}
                                placeholder="Enter College Name"
                                className="mt-1"
                            />
                        </div>
                        {/* Add API Key input later if needed */}
                    </CardContent>
                </Card>
            ) : activeSection ? (
              // Render Section Editor
              <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-primary">{activeSection.name}</CardTitle>
                         {activeSection.lastGenerated && (
                             <CardDescription>
                                Last generated: {new Date(activeSection.lastGenerated).toLocaleString()}
                             </CardDescription>
                         )}
                    </CardHeader>
                     <CardContent className="space-y-4">
                          <div>
                              <Label htmlFor={`section-prompt-${activeSectionIndex}`}>Generation Prompt</Label>
                              <Textarea
                                id={`section-prompt-${activeSectionIndex}`}
                                value={activeSection.prompt}
                                onChange={(e) => handleSectionPromptChange(activeSectionIndex, e.target.value)}
                                placeholder="Enter instructions for the AI to generate this section..."
                                className="mt-1 min-h-[100px] font-mono text-sm"
                              />
                          </div>
                           <Button onClick={() => handleGenerateSection(activeSectionIndex)} disabled={isGenerating}>
                             {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                             {isGenerating ? 'Generating...' : 'Generate Content'}
                           </Button>
                     </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>Section Content</CardTitle>
                        <CardDescription>Edit the generated content below.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Textarea
                           id={`section-content-${activeSectionIndex}`}
                           value={activeSection.content}
                           onChange={(e) => handleSectionContentChange(activeSectionIndex, e.target.value)}
                           placeholder="Generated content will appear here. You can also write manually."
                           className="min-h-[300px] text-base" // Increased base text size
                         />
                    </CardContent>
                 </Card>
              </div>
            ) : (
               <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">Select a section from the sidebar or add a new one.</p>
               </div>
            )}
          </ScrollArea>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
