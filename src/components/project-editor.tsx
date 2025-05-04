// src/components/project-editor.tsx
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { BookOpen, Settings, ChevronLeft, Save, Loader2, Wand2, ScrollText, List, Download, Lightbulb, FileText, Cloud, CloudOff, Home } from 'lucide-react';
import Link from 'next/link';
import type { Project, ProjectSection } from '@/types/project';
import { COMMON_SECTIONS, TOC_SECTION_NAME } from '@/types/project';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useToast } from '@/hooks/use-toast';
import { generateSectionAction, summarizeSectionAction, generateTocAction, generateOutlineAction } from '@/app/actions';
import { useRouter } from 'next/navigation';

interface ProjectEditorProps {
  projectId: string;
}

export function ProjectEditor({ projectId }: ProjectEditorProps) {
  const [projects, setProjects] = useLocalStorage<Project[]>('projects', []);
  const { toast } = useToast();
  const [activeSectionIndex, setActiveSectionIndex] = useState<number | null | -1>(null); // -1 for Project Details, null for initial/loading
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isGeneratingToc, setIsGeneratingToc] = useState(false);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [customSectionName, setCustomSectionName] = useState('');
  const [isProjectFound, setIsProjectFound] = useState<boolean | null>(null);
  const router = useRouter();

  // Derived state: current project
  const project = useMemo(() => {
    // Ensure projects is an array before using .find()
    return Array.isArray(projects) ? projects.find(p => p.id === projectId) : undefined;
  }, [projects, projectId]);

   // Effect to check if project exists and set initial state
   useEffect(() => {
     // Only run if projects data is loaded (not initial undefined) and we haven't determined existence yet
     if (projects !== undefined && isProjectFound === null) {
       const projectExists = Array.isArray(projects) && projects.some(p => p.id === projectId);
       setIsProjectFound(projectExists);
       if (projectExists && activeSectionIndex === null) {
           // If project found and no section is active, default to Project Details
           setActiveSectionIndex(-1);
       }
       // If not found, isProjectFound is false, and the component will render the "Not Found" message
     } else if (isProjectFound === true && !project) {
         // Edge case: Project existed, but is now gone (e.g., deleted in another tab)
         setIsProjectFound(false);
         toast({
             variant: "destructive",
             title: "Project Data Lost",
             description: "The project data seems to have been removed. Returning to dashboard.",
         });
         // Consider redirecting after a short delay
          setTimeout(() => router.push('/'), 1500); // Redirect back home
     }
   }, [projectId, projects, isProjectFound, activeSectionIndex, toast, router]); // Added router to dependencies

  const updateProject = useCallback((updatedProjectData: Partial<Project>) => {
    setProjects((prevProjects = []) => // Ensure prevProjects is an array
      (prevProjects || []).map(p =>
        p.id === projectId ? { ...p, ...updatedProjectData, updatedAt: new Date().toISOString() } : p
      )
    );
  }, [projectId, setProjects]);

  const handleSectionContentChange = (index: number, content: string) => {
    if (!project || index < 0 || index >= project.sections.length) return;
    const updatedSections = [...project.sections];
    updatedSections[index] = { ...updatedSections[index], content };
    updateProject({ sections: updatedSections });
  };

  const handleSectionPromptChange = (index: number, prompt: string) => {
    if (!project || index < 0 || index >= project.sections.length) return;
    const updatedSections = [...project.sections];
    updatedSections[index] = { ...updatedSections[index], prompt };
    updateProject({ sections: updatedSections });
  }

  const handleProjectDetailChange = (field: keyof Project, value: string) => {
    if (!project) return;
    if (field === 'storageType') return; // Prevent changing storageType directly
    updateProject({ [field]: value });
  };

  const addSection = (name: string) => {
    if (!project || !name.trim()) return;
    if (project.sections.some(s => s.name.toLowerCase() === name.trim().toLowerCase())) {
        toast({
            variant: "destructive",
            title: "Section Exists",
            description: `A section named "${name.trim()}" already exists.`,
        });
        return;
    }

    const newSection: ProjectSection = {
      name: name.trim(),
      prompt: `Generate the ${name.trim()} section for the project titled "${project.title}". Consider the project context: ${project.projectContext || '[No context provided]'}. [Add more specific instructions here if needed]`,
      content: '',
      lastGenerated: undefined,
    };
    const updatedSections = [...project.sections, newSection];
    updateProject({ sections: updatedSections });
    setActiveSectionIndex(updatedSections.length - 1);
    setCustomSectionName('');
    toast({
      title: "Section Added",
      description: `"${name.trim()}" section has been added.`,
    });
  };

   const addMultipleSections = useCallback((sectionNames: string[]) => {
       if (!project) return;

       const existingSectionNamesLower = new Set(project.sections.map(s => s.name.toLowerCase()));
       const newSections: ProjectSection[] = sectionNames
           .map(name => name.trim())
           .filter(name => name) // Filter out empty names
           .filter(name => !existingSectionNamesLower.has(name.toLowerCase())) // Filter out duplicates (case-insensitive)
           .map(name => ({
               name: name,
               prompt: `Generate the ${name} section for the project titled "${project.title}". Consider the project context: ${project.projectContext || '[No context provided]'}. [Add more specific instructions here if needed]`,
               content: '',
               lastGenerated: undefined,
           }));

       if (newSections.length === 0) {
            toast({
                title: "No New Sections Added",
                description: "The suggested sections might already exist or were empty.",
            });
           return;
       }

       const updatedSections = [...project.sections, ...newSections];
       updateProject({ sections: updatedSections });
       toast({
            title: "Sections Added",
            description: `${newSections.length} new sections based on the generated outline have been added.`,
       });
       // Optionally activate the first new section:
       // setActiveSectionIndex(project.sections.length);
   }, [project, updateProject, toast]);


  const handleGenerateSection = async (index: number) => {
    if (!project || index < 0 || index >= project.sections.length || isGenerating || isSummarizing || isGeneratingToc || isGeneratingOutline) return;

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

      if ('error' in result) throw new Error(result.error);

      // Use functional update to ensure we're working with the latest state
      setProjects(currentProjects => {
        const projectToUpdate = currentProjects?.find(p => p.id === projectId);
        if (!projectToUpdate || index >= projectToUpdate.sections.length) return currentProjects;

        const updatedSections = [...projectToUpdate.sections];
         updatedSections[index] = {
           ...updatedSections[index],
           content: result.reportSectionContent,
           lastGenerated: new Date().toISOString(),
         };

         return currentProjects.map(p =>
            p.id === projectId ? { ...projectToUpdate, sections: updatedSections, updatedAt: new Date().toISOString() } : p
          );
      });

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

  const handleSummarizeSection = async (index: number) => {
      if (!project || index < 0 || index >= project.sections.length || isGenerating || isSummarizing || isGeneratingToc || isGeneratingOutline) return;

      const section = project.sections[index];
      if (!section.content?.trim()) {
          toast({ variant: "destructive", title: "Summarization Failed", description: "Section content is empty." });
          return;
      }
      setIsSummarizing(true);
      try {
          const result = await summarizeSectionAction({ projectTitle: project.title, sectionText: section.content });
          if ('error' in result) throw new Error(result.error);
          toast({
              title: `Summary for "${section.name}"`,
              description: ( <ScrollArea className="h-32 w-full"><p className="text-sm">{result.summary}</p></ScrollArea> ),
              duration: 9000,
          });
      } catch (error) {
          console.error("Summarization failed:", error);
          toast({ variant: "destructive", title: "Summarization Failed", description: error instanceof Error ? error.message : "Could not summarize section content." });
      } finally {
          setIsSummarizing(false);
      }
  };

  const handleGenerateToc = async () => {
    if (!project || isGenerating || isSummarizing || isGeneratingToc || isGeneratingOutline) return;

    const contentSections = project.sections.filter(s => s.name !== TOC_SECTION_NAME);
    if (contentSections.length === 0) {
       toast({ variant: "destructive", title: "Cannot Generate ToC", description: "Add some content sections first." });
       return;
    }

    setIsGeneratingToc(true);
    try {
        const reportContent = contentSections
            .map(s => `## ${s.name}\n\n${s.content}`)
            .join('\n\n---\n\n');

        if (!reportContent.trim()) {
             toast({ variant: "destructive", title: "Cannot Generate ToC", description: "No content found in project sections." });
             setIsGeneratingToc(false);
             return;
        }

        const result = await generateTocAction({ reportContent });
        if ('error' in result) throw new Error(result.error);

        const tocContent = result.tableOfContents;
        const now = new Date().toISOString();

        // Use functional update for safety
        setProjects(currentProjects => {
            const projectToUpdate = currentProjects?.find(p => p.id === projectId);
            if (!projectToUpdate) return currentProjects;

            let tocSectionIndex = projectToUpdate.sections.findIndex(s => s.name === TOC_SECTION_NAME);
            let updatedSections = [...projectToUpdate.sections];
            let sectionAdded = false;

            if (tocSectionIndex > -1) {
                updatedSections[tocSectionIndex] = { ...updatedSections[tocSectionIndex], content: tocContent, lastGenerated: now };
            } else {
                const newTocSection: ProjectSection = { name: TOC_SECTION_NAME, prompt: "Table of Contents generated by AI.", content: tocContent, lastGenerated: now };
                updatedSections.unshift(newTocSection); // Add to the beginning
                tocSectionIndex = 0;
                sectionAdded = true;
            }

             toast({
                title: "Table of Contents Generated",
                description: `The "${TOC_SECTION_NAME}" section has been ${sectionAdded ? 'added' : 'updated'}.`,
             });

            // Update active section index state *after* the project state update
            // Use requestAnimationFrame to ensure state updates flush before setting active index
            requestAnimationFrame(() => setActiveSectionIndex(tocSectionIndex));

            return currentProjects.map(p =>
                p.id === projectId ? { ...projectToUpdate, sections: updatedSections, updatedAt: now } : p
            );
        });

    } catch (error) {
        console.error("Table of Contents generation failed:", error);
        toast({ variant: "destructive", title: "ToC Generation Failed", description: error instanceof Error ? error.message : "Could not generate Table of Contents." });
    } finally {
        setIsGeneratingToc(false);
    }
  };

  const handleGenerateOutline = useCallback(async () => {
      if (!project || isGenerating || isSummarizing || isGeneratingToc || isGeneratingOutline) return;

      if (!project.projectContext?.trim()) {
          toast({ variant: "destructive", title: "Cannot Generate Outline", description: "Please provide some project context in Project Details first." });
          setActiveSectionIndex(-1);
          return;
      }

      setIsGeneratingOutline(true);
      try {
          const result = await generateOutlineAction({ projectTitle: project.title, projectContext: project.projectContext });
          if ('error' in result) throw new Error(result.error);
          if (!result.suggestedSections?.length) throw new Error("AI did not return any suggested sections.");

          addMultipleSections(result.suggestedSections); // Use the callback version

      } catch (error) {
          console.error("Outline generation failed:", error);
          toast({ variant: "destructive", title: "Outline Generation Failed", description: error instanceof Error ? error.message : "Could not generate project outline." });
      } finally {
          setIsGeneratingOutline(false);
      }
  }, [project, isGenerating, isSummarizing, isGeneratingToc, isGeneratingOutline, toast, addMultipleSections]); // Added dependencies


  const handleSaveOnline = () => {
     if (!project) return;
     toast({
         title: "Save Online (Coming Soon)",
         description: "This feature will allow you to save your project to the cloud.",
     });
  };

   const handleNavigateToExport = () => {
     if (project) {
       router.push(`/project/${projectId}/export`);
     } else {
        toast({ variant: "destructive", title: "Navigation Error", description: "Could not find project data to export." });
     }
   };


   // --- Render Logic ---

   if (isProjectFound === null) {
     return ( <div className="flex flex-col items-center justify-center min-h-screen text-center p-4"><Loader2 className="h-16 w-16 animate-spin text-primary mb-4" /><p className="text-lg text-muted-foreground">Loading project...</p></div> );
   }

   if (!isProjectFound) {
     return ( <div className="flex flex-col items-center justify-center min-h-screen text-center p-4"><CloudOff className="h-16 w-16 text-destructive mb-4" /><h2 className="text-2xl font-semibold text-destructive mb-2">Project Not Found</h2><p className="text-muted-foreground mb-6">The project with ID <code className="bg-muted px-1 rounded">{projectId}</code> could not be found. It might have been deleted or the link is incorrect.</p><Button onClick={() => router.push('/')}><Home className="mr-2 h-4 w-4" /> Go to Dashboard</Button></div> );
   }

   // Project found, but `project` object might still be momentarily undefined during hydration/update
   if (!project) {
       return ( <div className="flex flex-col items-center justify-center min-h-screen text-center p-4"><Loader2 className="h-16 w-16 animate-spin text-primary mb-4" /><p className="text-lg text-muted-foreground">Finalizing project data...</p><Button onClick={() => router.push('/')} className="mt-4"><Home className="mr-2 h-4 w-4" /> Go to Dashboard</Button></div> );
   }

   // Project is guaranteed to exist from here
   const activeSection = activeSectionIndex !== null && activeSectionIndex >= 0 && activeSectionIndex < project.sections.length
    ? project.sections[activeSectionIndex]
    : null;


  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen">
        {/* --- Sidebar --- */}
        <Sidebar side="left" collapsible="icon" className="border-r bg-sidebar text-sidebar-foreground">
          <SidebarHeader className="p-4">
             <div className="flex items-center justify-between">
                 <Link href="/" passHref legacyBehavior>
                    <Button variant="ghost" size="sm" className="text-sidebar-primary hover:bg-sidebar-accent">
                        <ChevronLeft className="mr-1 h-4 w-4"/> Back
                    </Button>
                 </Link>
                <h2 className="font-semibold text-lg text-sidebar-primary group-data-[state=collapsed]:hidden text-glow-primary">
                  Project Forge
                </h2>
            </div>
          </SidebarHeader>

           <Separator className="mb-2 bg-sidebar-border" />

          <SidebarContent>
            <ScrollArea className="h-full px-2">
                 {/* Project Title Input - visible only when expanded */}
                 <div className="mb-4 group-data-[state=collapsed]:hidden px-2">
                    <Label htmlFor="projectTitleSidebar" className="text-xs font-medium text-sidebar-foreground/70">Project Title</Label>
                    <Input
                        id="projectTitleSidebar"
                        value={project.title}
                        onChange={(e) => handleProjectDetailChange('title', e.target.value)}
                        className="h-8 mt-1 text-base bg-input text-input-foreground border-sidebar-border focus-visible:ring-sidebar-ring"
                        placeholder="Enter Project Title"
                    />
                 </div>

              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setActiveSectionIndex(-1)}
                    isActive={activeSectionIndex === -1}
                    tooltip="Project Details"
                    className="text-sidebar-foreground hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
                  >
                    <Settings />
                    <span className="group-data-[state=collapsed]:hidden">Project Details</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                 <Separator className="my-2 bg-sidebar-border" />
                <p className="px-4 text-xs font-semibold text-sidebar-foreground/70 mb-1 group-data-[state=collapsed]:hidden">SECTIONS</p>
                {project.sections.map((section, index) => (
                  <SidebarMenuItem key={`${section.name}-${index}`}> {/* Use a more stable key if possible */}
                    <SidebarMenuButton
                      onClick={() => setActiveSectionIndex(index)}
                      isActive={activeSectionIndex === index}
                      tooltip={section.name}
                      className="text-sidebar-foreground hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
                    >
                      {section.name === TOC_SECTION_NAME ? <List /> : <FileText />}
                      <span className="group-data-[state=collapsed]:hidden">{section.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}

                 {/* Add Standard Sections */}
                 <div className="mt-4 group-data-[state=collapsed]:hidden px-2">
                    <p className="text-xs font-semibold text-sidebar-foreground/70 mb-2">Add Standard Section</p>
                    <div className="flex flex-col gap-1">
                        {COMMON_SECTIONS
                         .filter(cs => cs !== TOC_SECTION_NAME)
                         .filter(cs => !project.sections.some(s => s.name.toLowerCase() === cs.toLowerCase()))
                         .map(sectionName => (
                            <Button key={sectionName} variant="ghost" size="sm" className="justify-start text-sidebar-foreground/80 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent" onClick={() => addSection(sectionName)}>
                                {sectionName}
                            </Button>
                        ))}
                        {COMMON_SECTIONS.filter(cs => cs !== TOC_SECTION_NAME).every(cs => project.sections.some(s => s.name.toLowerCase() === cs.toLowerCase())) && (
                             <p className="text-xs text-sidebar-foreground/60">All standard sections added.</p>
                        )}
                    </div>
                 </div>

                 {/* Add Custom Section */}
                  <div className="mt-4 group-data-[state=collapsed]:hidden px-2">
                    <p className="text-xs font-semibold text-sidebar-foreground/70 mb-2">Add Custom Section</p>
                    <div className="flex gap-2">
                        <Input
                            value={customSectionName}
                            onChange={(e) => setCustomSectionName(e.target.value)}
                            placeholder="Section Name"
                            className="h-8 bg-input text-input-foreground border-sidebar-border focus-visible:ring-sidebar-ring"
                        />
                        <Button size="sm" onClick={() => addSection(customSectionName)} disabled={!customSectionName.trim()} className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90">Add</Button>
                    </div>
                  </div>
              </SidebarMenu>
            </ScrollArea>
          </SidebarContent>
           <SidebarFooter className="p-4 border-t border-sidebar-border group-data-[state=collapsed]:hidden">
               <Button
                   variant="outline"
                   size="sm"
                   onClick={handleGenerateOutline}
                   disabled={isGeneratingOutline || isGenerating || isSummarizing || isGeneratingToc || !project.projectContext?.trim()}
                   className="w-full hover:glow-accent focus-visible:glow-accent"
                   title={!project.projectContext?.trim() ? "Add project context in Project Details first" : "Generate section outline based on project context"}
               >
                   {isGeneratingOutline ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                   {isGeneratingOutline ? 'Generating Outline...' : 'Generate Outline'}
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
                <p className="text-xs text-sidebar-foreground/70 text-center mt-2">
                    Changes are saved automatically {project.storageType === 'local' ? 'locally' : 'to the cloud'}.
                </p>
           </SidebarFooter>
        </Sidebar>

        {/* --- Main Content Area --- */}
        <SidebarInset className="flex-1 flex flex-col bg-background">
           <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-4 lg:h-[60px] lg:px-6">
               <SidebarTrigger className="md:hidden text-foreground" />
               <h1 className="flex-1 text-lg font-semibold md:text-xl text-primary truncate text-glow-primary">
                {activeSectionIndex === -1 ? 'Project Details' : activeSection?.name ?? project.title ?? 'Project'}
               </h1>
               <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto mr-2" title={`Project stored ${project.storageType === 'local' ? 'locally' : 'in the cloud'}`}>
                 {project.storageType === 'local' ? <CloudOff className="h-4 w-4" /> : <Cloud className="h-4 w-4 text-green-500" />}
                 <span>{project.storageType === 'local' ? 'Local' : 'Cloud'}</span>
               </div>
               <Button
                   variant="outline"
                   size="sm"
                   onClick={handleGenerateToc}
                   disabled={isGeneratingToc || isGenerating || isSummarizing || isGeneratingOutline || project.sections.filter(s => s.name !== TOC_SECTION_NAME).length === 0}
                   className="hover:glow-accent focus-visible:glow-accent"
                   title={project.sections.filter(s => s.name !== TOC_SECTION_NAME).length === 0 ? "Add sections before generating ToC" : "Generate Table of Contents"}
               >
                   {isGeneratingToc ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <List className="mr-2 h-4 w-4" />}
                   {isGeneratingToc ? 'Generating ToC...' : 'Generate ToC'}
               </Button>
               <Button
                   variant="outline"
                   size="sm"
                   onClick={handleNavigateToExport}
                   className="hover:glow-accent focus-visible:glow-accent ml-2"
               >
                   <Download className="mr-2 h-4 w-4" />
                   Export Report
               </Button>
           </header>

          <ScrollArea className="flex-1 p-4 md:p-6">
            {activeSectionIndex === -1 ? (
                // Project Details Form
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle className="text-glow-primary">Project Details</CardTitle>
                        <CardDescription>Edit general information about your project. Providing context helps the AI generate a relevant outline and content.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         {/* Title */}
                         <div>
                            <Label htmlFor="projectTitleMain">Project Title *</Label>
                            <Input
                                id="projectTitleMain"
                                value={project.title}
                                onChange={(e) => handleProjectDetailChange('title', e.target.value)}
                                placeholder="Enter Project Title"
                                className="mt-1 focus-visible:glow-primary"
                                required // Basic HTML required validation
                            />
                        </div>
                        {/* Context */}
                        <div>
                            <Label htmlFor="projectContext">Project Context</Label>
                            <Textarea
                                id="projectContext"
                                value={project.projectContext}
                                onChange={(e) => handleProjectDetailChange('projectContext', e.target.value)}
                                placeholder="Briefly describe your project, its goals, scope, and key features or technologies involved. This helps the AI generate a relevant outline and content."
                                className="mt-1 min-h-[120px] focus-visible:glow-primary"
                            />
                            <p className="text-xs text-muted-foreground mt-1">This context is used by the AI to generate the initial project outline.</p>
                        </div>
                        {/* Team & College Info in a Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="teamDetails">Team Details</Label>
                                <Textarea
                                    id="teamDetails"
                                    value={project.teamDetails}
                                    onChange={(e) => handleProjectDetailChange('teamDetails', e.target.value)}
                                    placeholder="Enter team member names and IDs, one per line"
                                    className="mt-1 min-h-[80px] focus-visible:glow-primary"
                                />
                            </div>
                             <div>
                                <Label htmlFor="collegeInfo">College Information</Label>
                                <Input
                                    id="collegeInfo"
                                    value={project.collegeInfo}
                                    onChange={(e) => handleProjectDetailChange('collegeInfo', e.target.value)}
                                    placeholder="Enter College Name"
                                    className="mt-1 focus-visible:glow-primary"
                                />
                            </div>
                        </div>
                    </CardContent>
                     <CardFooter className="flex justify-end">
                         <Button
                             variant="default"
                             size="sm"
                             onClick={handleGenerateOutline}
                             disabled={isGeneratingOutline || isGenerating || isSummarizing || isGeneratingToc || !project.projectContext?.trim()}
                             className="hover:glow-primary focus-visible:glow-primary"
                             title={!project.projectContext?.trim() ? "Add project context above first" : "Generate section outline based on project context"}
                         >
                             {isGeneratingOutline ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                             {isGeneratingOutline ? 'Generating Outline...' : 'Generate Section Outline'}
                         </Button>
                     </CardFooter>
                </Card>
            ) : activeSection ? (
              // Section Editor
              <div className="space-y-6">
                 {activeSection.name !== TOC_SECTION_NAME && (
                    <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle className="text-primary text-glow-primary">{activeSection.name} - AI Prompt</CardTitle>
                             {activeSection.lastGenerated && (
                                 <CardDescription>Last generated: {new Date(activeSection.lastGenerated).toLocaleString()}</CardDescription>
                             )}
                        </CardHeader>
                         <CardContent className="space-y-4">
                              <div>
                                  <Label htmlFor={`section-prompt-${activeSectionIndex}`}>Generation Prompt</Label>
                                  <Textarea
                                    id={`section-prompt-${activeSectionIndex}`}
                                    value={activeSection.prompt}
                                    onChange={(e) => handleSectionPromptChange(activeSectionIndex, e.target.value)}
                                    placeholder="Enter instructions for the AI..."
                                    className="mt-1 min-h-[100px] font-mono text-sm focus-visible:glow-primary"
                                  />
                              </div>
                               <Button onClick={() => handleGenerateSection(activeSectionIndex)} disabled={isGenerating || isSummarizing || isGeneratingToc || isGeneratingOutline} className="hover:glow-primary focus-visible:glow-primary">
                                 {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                                 {isGenerating ? 'Generating...' : 'Generate Content'}
                               </Button>
                         </CardContent>
                    </Card>
                 )}

                 <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>{activeSection.name} - Content</CardTitle>
                        <CardDescription>
                          {activeSection.name === TOC_SECTION_NAME
                            ? "This Table of Contents was generated by the AI. You can manually edit it below."
                            : "Edit the generated or existing content below."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Textarea
                           id={`section-content-${activeSectionIndex}`}
                           value={activeSection.content}
                           onChange={(e) => handleSectionContentChange(activeSectionIndex, e.target.value)}
                           placeholder={activeSection.name === TOC_SECTION_NAME ? "Table of Contents will appear here." : "Generated content will appear here. You can also write manually."}
                           className="min-h-[400px] text-base focus-visible:glow-primary" // Increased min-height
                         />
                    </CardContent>
                     {activeSection.name !== TOC_SECTION_NAME && (
                         <CardFooter className="flex justify-end">
                             <Button
                                 variant="outline"
                                 onClick={() => handleSummarizeSection(activeSectionIndex)}
                                 disabled={isSummarizing || isGenerating || isGeneratingToc || isGeneratingOutline || !activeSection.content?.trim()}
                                 className="hover:glow-accent focus-visible:glow-accent"
                             >
                               {isSummarizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScrollText className="mr-2 h-4 w-4" />}
                               {isSummarizing ? 'Summarizing...' : 'Summarize'}
                             </Button>
                         </CardFooter>
                      )}
                 </Card>
              </div>
            ) : (
               // Initial State - No Section Selected or Empty Project
               <div className="flex items-center justify-center h-full">
                    {project.sections.length > 0 ? (
                       <p className="text-muted-foreground text-lg">Select a section from the sidebar or add a new one.</p>
                    ) : (
                       <Card className="text-center py-8 px-6 max-w-md mx-auto shadow-md">
                           <CardHeader>
                                <CardTitle className="text-xl text-primary text-glow-primary">Project Outline Needed</CardTitle>
                                <CardDescription className="mt-2">
                                  Your project doesn't have any sections yet.
                                </CardDescription>
                           </CardHeader>
                            <CardContent className="mt-4 space-y-4">
                                <p>Go to <Button variant="link" className="p-0 h-auto text-base" onClick={() => setActiveSectionIndex(-1)}>Project Details</Button> and provide some context, then click "Generate Section Outline" below or in the details section.</p>
                                <Button
                                    variant="default"
                                    size="sm"
                                    onClick={handleGenerateOutline}
                                    disabled={isGeneratingOutline || isGenerating || isSummarizing || isGeneratingToc || !project.projectContext?.trim()}
                                    className="hover:glow-primary focus-visible:glow-primary"
                                    title={!project.projectContext?.trim() ? "Add project context in Project Details first" : "Generate section outline based on project context"}
                                >
                                    {isGeneratingOutline ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                                    {isGeneratingOutline ? 'Generating Outline...' : 'Generate Outline'}
                                </Button>
                                <p className="text-xs text-muted-foreground mt-3">Alternatively, you can add standard or custom sections manually using the sidebar.</p>
                            </CardContent>
                       </Card>
                    )}
               </div>
            )}
          </ScrollArea>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
