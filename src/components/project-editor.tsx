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
import { BookOpen, Settings, ChevronLeft, Save, Loader2, Wand2, ScrollText, List, Download, Lightbulb, FileText, Cloud, CloudOff, Home } from 'lucide-react'; // Added Cloud, CloudOff, Home icons
import Link from 'next/link';
import type { Project, ProjectSection } from '@/types/project';
import { COMMON_SECTIONS, TOC_SECTION_NAME } from '@/types/project'; // Import TOC_SECTION_NAME
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useToast } from '@/hooks/use-toast';
import { generateSectionAction, summarizeSectionAction, generateTocAction, generateOutlineAction } from '@/app/actions'; // Added generateOutlineAction
import { useRouter } from 'next/navigation';

interface ProjectEditorProps {
  projectId: string;
}

export function ProjectEditor({ projectId }: ProjectEditorProps) {
  const [projects, setProjects] = useLocalStorage<Project[]>('projects', []);
  const { toast } = useToast();
  const [activeSectionIndex, setActiveSectionIndex] = useState<number | null | -1>(null); // Use null initially
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false); // State for summarization loading
  const [isGeneratingToc, setIsGeneratingToc] = useState(false); // State for ToC generation
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false); // State for Outline generation
  const [customSectionName, setCustomSectionName] = useState('');
  const [isProjectFound, setIsProjectFound] = useState<boolean | null>(null); // Track if project is found: null (loading), true (found), false (not found)
  const router = useRouter(); // Initialize useRouter

  // Find the current project based on projectId
  const project = useMemo(() => {
     // Ensure projects is an array before using .find()
     return Array.isArray(projects) ? projects.find(p => p.id === projectId) : undefined;
   }, [projects, projectId]);

   // Effect to check if project exists and handle redirection/state update
   useEffect(() => {
     // Only proceed if projects state has been initialized (is not the initial empty array anymore)
     // and isProjectFound is still in its initial loading state (null)
     if (projects !== undefined && isProjectFound === null) {
       const projectExists = Array.isArray(projects) && projects.some(p => p.id === projectId);
       setIsProjectFound(projectExists);

       if (projectExists) {
          // Project found, initialize activeSectionIndex if it's still null
          if (activeSectionIndex === null) {
            setActiveSectionIndex(-1); // Default to Project Details
          }
       }
       // No 'else' needed here: if !projectExists, isProjectFound is set to false,
       // and the component will render the "Not Found" message automatically.
     } else if (isProjectFound === true && !project) {
        // Case: Project was found previously, but now it's gone (e.g., deleted in another tab)
        setIsProjectFound(false);
        // Optionally show a toast, though the 'Not Found' screen is usually sufficient
        // toast({ ... });
     }
   }, [projectId, projects, isProjectFound, activeSectionIndex]); // Dependencies for checking existence and initialization


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
    // Prevent changing storageType directly via this handler
    if (field === 'storageType') return;
    updateProject({ [field]: value });
  };

  const addSection = (name: string) => {
    if (!project || !name.trim()) return;
    // Prevent adding duplicate section names
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
      prompt: `Generate the ${name.trim()} section for the project titled "${project.title}". Consider the following details: [Add specific points or requirements here] \n Project Context: ${project.projectContext || 'N/A'}`,
      content: '',
      lastGenerated: undefined,
    };
    const updatedSections = [...project.sections, newSection];
    updateProject({ sections: updatedSections });
    setActiveSectionIndex(updatedSections.length - 1); // Activate the new section
    setCustomSectionName(''); // Clear input
  };

  // Function to add multiple sections, typically from outline generation
   const addMultipleSections = (sectionNames: string[]) => {
       if (!project) return;

       const newSections: ProjectSection[] = sectionNames
           .filter(name => name.trim()) // Ensure names are not empty
           // Filter out sections that already exist (case-insensitive)
           .filter(name => !project.sections.some(s => s.name.toLowerCase() === name.trim().toLowerCase()))
           .map(name => ({
               name: name.trim(),
               prompt: `Generate the ${name.trim()} section for the project titled "${project.title}". Consider the project context: ${project.projectContext || '[No context provided]'}. [Add more specific instructions here if needed]`,
               content: '',
               lastGenerated: undefined,
           }));

       if (newSections.length === 0) {
            toast({
                title: "No New Sections Added",
                description: "The suggested sections might already exist in your project.",
            });
           return;
       }

       const updatedSections = [...project.sections, ...newSections];
       updateProject({ sections: updatedSections });
       // Optionally, activate the first newly added section
       // setActiveSectionIndex(project.sections.length);
       toast({
            title: "Sections Added",
            description: `${newSections.length} new sections based on the generated outline have been added.`,
       });
   };

  const handleGenerateSection = async (index: number) => {
    // Ensure project exists before proceeding
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
        // Pass project context if needed by the prompt, currently not used in generate-report-section.ts prompt template
        // projectContext: project.projectContext,
      });

      if ('error' in result) {
        throw new Error(result.error);
      }

      // Re-fetch the project state in case it changed during generation (less likely with local storage)
      // This ensures we update the *current* project state
      setProjects(currentProjects => {
        const projectToUpdate = currentProjects?.find(p => p.id === projectId);
        if (!projectToUpdate || index >= projectToUpdate.sections.length) return currentProjects; // Safety check

        const updatedSections = [...projectToUpdate.sections];
         updatedSections[index] = {
           ...updatedSections[index], // Use the section from the re-fetched project state
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
      // Ensure project exists
      if (!project || index < 0 || index >= project.sections.length || isGenerating || isSummarizing || isGeneratingToc || isGeneratingOutline) return;

      const section = project.sections[index];
      if (!section.content || section.content.trim() === '') {
          toast({
              variant: "destructive",
              title: "Summarization Failed",
              description: "Section content is empty.",
          });
          return;
      }

      setIsSummarizing(true);

      try {
          const result = await summarizeSectionAction({
              projectTitle: project.title, // Safe to use project.title here as we checked project existence
              sectionText: section.content,
          });

          if ('error' in result) {
              throw new Error(result.error);
          }

          // Display summary in a toast
          toast({
              title: `Summary for "${section.name}"`,
              description: (
                 <ScrollArea className="h-32 w-full"> {/* Make description scrollable */}
                     <p className="text-sm">{result.summary}</p>
                 </ScrollArea>
              ),
              duration: 9000, // Longer duration for reading summary
          });

      } catch (error) {
          console.error("Summarization failed:", error);
          toast({
              variant: "destructive",
              title: "Summarization Failed",
              description: error instanceof Error ? error.message : "Could not summarize section content.",
          });
      } finally {
          setIsSummarizing(false);
      }
  };

  const handleGenerateToc = async () => {
    // Ensure project exists
    if (!project || isGenerating || isSummarizing || isGeneratingToc || isGeneratingOutline) return;

    if (!project.sections || project.sections.length === 0) {
       toast({
         variant: "destructive",
         title: "Cannot Generate ToC",
         description: "Add some sections to the project first.",
       });
       return;
    }

    setIsGeneratingToc(true);

    try {
        // Use project details safely after checking existence
        const reportContent = project.sections
            .filter(s => s.name !== TOC_SECTION_NAME) // Exclude existing ToC
            .map(s => `## ${s.name}\n\n${s.content}`) // Add section headings for context
            .join('\n\n---\n\n'); // Separate sections clearly

        if (!reportContent.trim()) {
             toast({
               variant: "destructive",
               title: "Cannot Generate ToC",
               description: "No content found in project sections.",
             });
             setIsGeneratingToc(false);
             return;
        }

        const result = await generateTocAction({ reportContent });

        if ('error' in result) {
            throw new Error(result.error);
        }

        const tocContent = result.tableOfContents;
        const now = new Date().toISOString();

        // Re-fetch project state before updating
        setProjects(currentProjects => {
            const projectToUpdate = currentProjects?.find(p => p.id === projectId);
            if (!projectToUpdate) return currentProjects; // Safety check

            let tocSectionIndex = projectToUpdate.sections.findIndex(s => s.name === TOC_SECTION_NAME);
            let updatedSections = [...projectToUpdate.sections];
            let sectionAdded = false;

            if (tocSectionIndex > -1) {
                // Update existing ToC section
                updatedSections[tocSectionIndex] = {
                    ...updatedSections[tocSectionIndex],
                    content: tocContent,
                    lastGenerated: now,
                };
            } else {
                // Add new ToC section at the beginning
                const newTocSection: ProjectSection = {
                    name: TOC_SECTION_NAME,
                    prompt: "Table of Contents generated by AI.", // Default prompt
                    content: tocContent,
                    lastGenerated: now,
                };
                updatedSections.unshift(newTocSection); // Add to the beginning
                tocSectionIndex = 0; // New index is 0
                sectionAdded = true;
            }

             toast({
                title: "Table of Contents Generated",
                description: `The "${TOC_SECTION_NAME}" section has been ${sectionAdded ? 'added' : 'updated'}.`,
             });

            // Optional: Navigate to the ToC section after generation
            // Note: Direct state update here might be risky if many updates happen concurrently
            // Consider using a separate effect or a post-update callback if navigation is critical
            setActiveSectionIndex(tocSectionIndex);

            return currentProjects.map(p =>
                p.id === projectId ? { ...projectToUpdate, sections: updatedSections, updatedAt: now } : p
            );
        });


    } catch (error) {
        console.error("Table of Contents generation failed:", error);
        toast({
            variant: "destructive",
            title: "ToC Generation Failed",
            description: error instanceof Error ? error.message : "Could not generate Table of Contents.",
        });
    } finally {
        setIsGeneratingToc(false);
    }
  };

  const handleGenerateOutline = async () => {
      // Ensure project exists
      if (!project || isGenerating || isSummarizing || isGeneratingToc || isGeneratingOutline) return;

      if (!project.projectContext || !project.projectContext.trim()) {
          toast({
              variant: "destructive",
              title: "Cannot Generate Outline",
              description: "Please provide some project context in the Project Details section first.",
          });
          setActiveSectionIndex(-1); // Navigate to project details
          return;
      }

      setIsGeneratingOutline(true);

      try {
          const result = await generateOutlineAction({
              projectTitle: project.title, // Safe to use project properties
              projectContext: project.projectContext,
          });

          if ('error' in result) {
              throw new Error(result.error);
          }

          if (!result.suggestedSections || result.suggestedSections.length === 0) {
             throw new Error("AI did not return any suggested sections.");
          }

          // Add the suggested sections to the project
          // addMultipleSections internally checks for project existence again, which is fine
          addMultipleSections(result.suggestedSections);

          // No separate toast here, addMultipleSections handles it

      } catch (error) {
          console.error("Outline generation failed:", error);
          toast({
              variant: "destructive",
              title: "Outline Generation Failed",
              description: error instanceof Error ? error.message : "Could not generate project outline.",
          });
      } finally {
          setIsGeneratingOutline(false);
      }
  };

  // Placeholder for future "Save Online" functionality
  const handleSaveOnline = () => {
     // Ensure project exists
     if (!project) return;
     // 1. Implement authentication if not already done.
     // 2. Send project data to a backend API (e.g., Firestore).
     // 3. Update the project's storageType to 'cloud'.
     // updateProject({ storageType: 'cloud' });
     toast({
         title: "Save Online (Coming Soon)",
         description: "This feature will allow you to save your project to the cloud.",
     });
  };


   // Navigate to the export page
   const handleNavigateToExport = () => {
     // Ensure project exists before navigating
     if (project) {
       router.push(`/project/${projectId}/export`);
     } else {
        toast({
            variant: "destructive",
            title: "Navigation Error",
            description: "Could not find project data to export.",
        });
     }
   };


   // Render loading state while checking if project exists (isProjectFound is null)
   if (isProjectFound === null) {
     return (
       <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
         <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
         <p className="text-lg text-muted-foreground">Loading project...</p>
       </div>
     );
   }

   // Render "Not Found" message if project doesn't exist (isProjectFound is false)
   if (!isProjectFound) {
     return (
       <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
         <CloudOff className="h-16 w-16 text-destructive mb-4" />
         <h2 className="text-2xl font-semibold text-destructive mb-2">Project Not Found</h2>
         <p className="text-muted-foreground mb-6">
           The project with ID <code className="bg-muted px-1 rounded">{projectId}</code> could not be found. It might have been deleted or the link is incorrect.
         </p>
         <Button onClick={() => router.push('/')}>
           <Home className="mr-2 h-4 w-4" /> Go to Dashboard
         </Button>
       </div>
     );
   }

   // Project found (isProjectFound is true), but still check if `project` object is available before rendering
   if (!project) {
       // This state should be very temporary or indicate an unexpected issue if isProjectFound was true
       return (
         <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
            <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
           <p className="text-lg text-muted-foreground">Finalizing project data...</p>
            <Button onClick={() => router.push('/')} className="mt-4">
                <Home className="mr-2 h-4 w-4" /> Go to Dashboard
            </Button>
         </div>
       );
   }

   // --- Project is guaranteed to exist from here ---

  const activeSection = activeSectionIndex !== null && activeSectionIndex >= 0 && activeSectionIndex < project.sections.length
    ? project.sections[activeSectionIndex]
    : null;

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen">
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
                    onClick={() => setActiveSectionIndex(-1)} // Use -1 for settings/details
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
                  <SidebarMenuItem key={index}>
                    <SidebarMenuButton
                      onClick={() => setActiveSectionIndex(index)}
                      isActive={activeSectionIndex === index}
                      tooltip={section.name}
                      className="text-sidebar-foreground hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
                    >
                      {/* Use List icon for Table of Contents */}
                      {section.name === TOC_SECTION_NAME ? <List /> : <FileText />} {/* Changed BookOpen to FileText */}
                      <span className="group-data-[state=collapsed]:hidden">{section.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}

                 {/* Add Standard Sections */}
                 <div className="mt-4 group-data-[state=collapsed]:hidden px-2">
                    <p className="text-xs font-semibold text-sidebar-foreground/70 mb-2">Add Standard Section</p>
                    <div className="flex flex-col gap-1">
                        {COMMON_SECTIONS
                         .filter(cs => cs !== TOC_SECTION_NAME) // Exclude ToC from standard add
                         .filter(cs => !project.sections.some(s => s.name.toLowerCase() === cs.toLowerCase())) // Case-insensitive check
                         .map(sectionName => (
                            <Button key={sectionName} variant="ghost" size="sm" className="justify-start text-sidebar-foreground/80 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent" onClick={() => addSection(sectionName)}>
                                {sectionName}
                            </Button>
                        ))}
                         {/* Show message if all standard sections are added */}
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
                {/* Generate Outline Button */}
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
                 {/* Save Online Button Placeholder */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveOnline}
                    disabled={project.storageType === 'cloud'} // Disable if already saved online
                    className="w-full mt-2 hover:glow-accent focus-visible:glow-accent"
                    title={project.storageType === 'cloud' ? "Project is saved online" : "Save project to the cloud (requires login - coming soon)"}
                >
                    {project.storageType === 'cloud' ? <Cloud className="mr-2 h-4 w-4" /> : <CloudOff className="mr-2 h-4 w-4" />}
                    {project.storageType === 'cloud' ? 'Saved Online' : 'Save Online'}
                </Button>
                <p className="text-xs text-sidebar-foreground/70 text-center mt-2">
                    Changes are saved automatically {project.storageType === 'local' ? 'locally' : 'to the cloud'}.
                </p>
           </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1 flex flex-col bg-background">
           {/* Main Content Area Header */}
           <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-4 lg:h-[60px] lg:px-6">
               <SidebarTrigger className="md:hidden text-foreground" /> {/* Mobile toggle */}
               <h1 className="flex-1 text-lg font-semibold md:text-xl text-primary truncate text-glow-primary">
                {activeSectionIndex === -1 ? 'Project Details' : activeSection?.name ?? project.title ?? 'Project'}
               </h1>
               {/* Storage Indicator */}
               <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto mr-2" title={`Project stored ${project.storageType === 'local' ? 'locally' : 'in the cloud'}`}>
                 {project.storageType === 'local' ? <CloudOff className="h-4 w-4" /> : <Cloud className="h-4 w-4 text-green-500" />}
                 <span>{project.storageType === 'local' ? 'Local' : 'Cloud'}</span>
               </div>
               {/* Generate ToC Button */}
               <Button
                   variant="outline"
                   size="sm"
                   onClick={handleGenerateToc}
                   disabled={isGeneratingToc || isGenerating || isSummarizing || isGeneratingOutline || project.sections.filter(s => s.name !== TOC_SECTION_NAME).length === 0}
                   className="hover:glow-accent focus-visible:glow-accent" // Removed ml-2
                   title={project.sections.filter(s => s.name !== TOC_SECTION_NAME).length === 0 ? "Add sections before generating ToC" : "Generate Table of Contents"}
               >
                   {isGeneratingToc ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <List className="mr-2 h-4 w-4" />}
                   {isGeneratingToc ? 'Generating ToC...' : 'Generate ToC'}
               </Button>
               {/* Export Button */}
               <Button
                   variant="outline"
                   size="sm"
                   onClick={handleNavigateToExport}
                   className="hover:glow-accent focus-visible:glow-accent ml-2" // Added margin back here
               >
                   <Download className="mr-2 h-4 w-4" />
                   Export Report
               </Button>
           </header>

          {/* Main Content */}
          <ScrollArea className="flex-1 p-4 md:p-6">
            {activeSectionIndex === -1 ? (
                // Render Project Details/Settings Form
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle className="text-glow-primary">Project Details</CardTitle>
                        <CardDescription>Edit general information about your project. Providing context helps the AI.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div>
                            <Label htmlFor="projectTitleMain">Project Title</Label>
                            <Input
                                id="projectTitleMain"
                                value={project.title}
                                onChange={(e) => handleProjectDetailChange('title', e.target.value)}
                                placeholder="Enter Project Title"
                                className="mt-1 focus-visible:glow-primary"
                            />
                        </div>
                        <div>
                            <Label htmlFor="projectContext">Project Context</Label>
                            <Textarea
                                id="projectContext"
                                value={project.projectContext}
                                onChange={(e) => handleProjectDetailChange('projectContext', e.target.value)}
                                placeholder="Briefly describe your project, its goals, scope, and key features or technologies involved. This helps the AI generate a relevant outline and content."
                                className="mt-1 min-h-[120px] focus-visible:glow-primary"
                            />
                        </div>
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
                        {/* Add API Key input later if needed */}
                    </CardContent>
                     <CardFooter>
                        {/* Moved Generate Outline Button Here - more contextual */}
                         <Button
                             variant="default" // Make it primary action here
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
            ) : activeSectionIndex !== null && activeSection ? ( // Ensure index is valid and activeSection exists
              // Render Section Editor
              <div className="space-y-6">
                 {/* Only show prompt card if it's not the ToC section */}
                 {activeSection.name !== TOC_SECTION_NAME && (
                    <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle className="text-primary text-glow-primary">{activeSection.name} - AI Prompt</CardTitle>
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
                           className="min-h-[300px] text-base focus-visible:glow-primary" // Increased base text size
                         />
                    </CardContent>
                     {/* Only show footer with summarize button if it's not the ToC section */}
                     {activeSection.name !== TOC_SECTION_NAME && (
                         <CardFooter>
                             {/* Summarize Button */}
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
               <div className="flex items-center justify-center h-full">
                    {project.sections.length > 0 ? (
                       <p className="text-muted-foreground">Select a section from the sidebar or add a new one.</p>
                    ) : (
                       <Card className="text-center py-8 px-6">
                           <CardHeader>
                                <CardTitle className="text-lg text-muted-foreground">Project Outline Needed</CardTitle>
                                <CardDescription>
                                  Your project doesn't have any sections yet.
                                </CardDescription>
                           </CardHeader>
                            <CardContent>
                                <p className="mb-4">Go to <Button variant="link" className="p-0 h-auto" onClick={() => setActiveSectionIndex(-1)}>Project Details</Button> and provide some context, then click "Generate Section Outline".</p>
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
                                <p className="text-xs text-muted-foreground mt-3">Alternatively, you can add sections manually using the sidebar.</p>
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
