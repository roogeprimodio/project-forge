// src/components/project-editor.tsx
"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { BookOpen, Settings, ChevronLeft, Save, Loader2, Wand2, ScrollText, List, Download, Lightbulb, FileText, Cloud, CloudOff, Home, Menu, Undo, MessageSquareQuote, Sparkles } from 'lucide-react'; // Replaced MessageSquareQuestion with MessageSquareQuote
import Link from 'next/link';
import type { Project, ProjectSection } from '@/types/project';
import { COMMON_SECTIONS } from '@/types/project'; // Removed TOC_SECTION_NAME import
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useToast } from '@/hooks/use-toast';
import { generateSectionAction, summarizeSectionAction, generateOutlineAction, suggestImprovementsAction } from '@/app/actions'; // Removed generateTocAction, added generateOutlineAction
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { marked } from 'marked'; // For rendering markdown suggestions

interface ProjectEditorProps {
  projectId: string;
}

// Minimum character length considered "sufficient" for context
const MIN_CONTEXT_LENGTH = 50;
const MAX_HISTORY_LENGTH = 10; // Limit undo history

// New component for the local sidebar content (details, sections, add)
function ProjectSidebarContent({
    project,
    activeSectionIndex,
    setActiveSectionIndex,
    addSection,
    customSectionName,
    setCustomSectionName,
    handleGenerateOutlineClick, // Renamed prop
    isGeneratingOutline,
    isGenerating,
    isSummarizing,
    // Removed isGeneratingToc
    handleSaveOnline,
    canUndo,
    handleUndo,
    onCloseSheet
}: {
    project: Project;
    activeSectionIndex: number | null | -1;
    setActiveSectionIndex: (index: number | -1) => void;
    addSection: (name: string) => void;
    customSectionName: string;
    setCustomSectionName: (name: string) => void;
    handleGenerateOutlineClick: () => void; // Renamed prop type
    isGeneratingOutline: boolean;
    isGenerating: boolean;
    isSummarizing: boolean;
    // Removed isGeneratingToc prop type
    handleSaveOnline: () => void;
    canUndo: boolean;
    handleUndo: () => void;
    onCloseSheet?: () => void;
}) {
     const handleSectionClick = (index: number | -1) => {
        setActiveSectionIndex(index);
        onCloseSheet?.(); // Close sheet on selection (mobile)
     };

     return (
        <div className="flex flex-col h-full border-r bg-card"> {/* Use Card background */}
            <div className="p-4 border-b flex justify-between items-center"> {/* Flex container for title and undo */}
                 <Input
                        id="projectTitleSidebar"
                        value={project.title}
                        readOnly // Title editing now in main area
                        className="h-8 text-base font-semibold bg-transparent border-0 shadow-none focus-visible:ring-0 p-0 truncate flex-1 mr-2" // Make title flexible
                        placeholder="Project Title"
                        aria-label="Project Title (Readonly)"
                    />
                {/* Undo Button */}
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
             <ScrollArea className="flex-1 px-2 py-2">
                 {/* Simplified menu structure */}
                 <nav className="flex flex-col gap-1">
                     <Button
                         variant={activeSectionIndex === -1 ? "secondary" : "ghost"}
                         size="sm"
                         onClick={() => handleSectionClick(-1)} // Use handler
                         className="justify-start"
                         aria-current={activeSectionIndex === -1 ? "page" : undefined}
                     >
                         <Settings className="mr-2 h-4 w-4" />
                         Project Details
                     </Button>
                     <Separator className="my-2" />
                      <p className="px-2 text-xs font-semibold text-muted-foreground mb-1">SECTIONS</p>
                       {project.sections?.map((section, index) => (
                         <Button
                             key={`${section.name}-${index}`}
                             variant={activeSectionIndex === index ? "secondary" : "ghost"}
                             size="sm"
                             onClick={() => handleSectionClick(index)} // Use handler
                             className="justify-start truncate"
                             aria-current={activeSectionIndex === index ? "page" : undefined}
                         >
                             {/* Removed specific icon for ToC */}
                             <FileText className="mr-2 h-4 w-4 flex-shrink-0"/>
                             <span className="truncate">{section.name}</span>
                         </Button>
                     ))}

                     {/* Add Standard Sections */}
                     <div className="mt-4 px-2">
                         <p className="text-xs font-semibold text-muted-foreground mb-2">Add Standard Section</p>
                         <div className="flex flex-col gap-1">
                             {COMMON_SECTIONS
                              // Removed ToC filter
                              .filter(cs => !project.sections?.some(s => s.name.toLowerCase() === cs.toLowerCase()))
                              .map(sectionName => (
                                 <Button key={sectionName} variant="ghost" size="sm" className="justify-start text-muted-foreground hover:text-foreground" onClick={() => addSection(sectionName)}>
                                     {sectionName}
                                 </Button>
                             ))}
                             {COMMON_SECTIONS.every(cs => project.sections?.some(s => s.name.toLowerCase() === cs.toLowerCase())) && ( // Removed ToC filter
                                  <p className="text-xs text-muted-foreground">All standard sections added.</p>
                             )}
                         </div>
                      </div>

                      {/* Add Custom Section */}
                       <div className="mt-4 px-2">
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
                 </nav>
             </ScrollArea>
             <div className="p-4 border-t space-y-2">
                 <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateOutlineClick} // Use renamed handler
                    disabled={isGeneratingOutline || isGenerating || isSummarizing /* || isGeneratingToc */ || !project.projectContext?.trim()} // Removed isGeneratingToc
                    className="w-full hover:glow-accent focus-visible:glow-accent"
                    title={!project.projectContext?.trim() ? "Add project context in Project Details first" : "Generate section outline based on project context"}
                >
                    {isGeneratingOutline ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                    {isGeneratingOutline ? 'Generating Outline...' : 'Generate/Update Outline'} {/* Updated text */}
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


export function ProjectEditor({ projectId }: ProjectEditorProps) {
  const [projects, setProjects] = useLocalStorage<Project[]>('projects', []);
  const { toast } = useToast();
  const [activeSectionIndex, setActiveSectionIndex] = useState<number | null | -1>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  // Removed isGeneratingToc state
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false); // State for suggestion generation
  const [suggestionInput, setSuggestionInput] = useState(''); // State for suggestion text input
  const [suggestions, setSuggestions] = useState<string | null>(null); // State to store AI suggestions
  const [customSectionName, setCustomSectionName] = useState('');
  const [isProjectFound, setIsProjectFound] = useState<boolean | null>(null);
  const [isLocalSidebarOpen, setIsLocalSidebarOpen] = useState(true); // State for local sidebar visibility (desktop)
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false); // State for mobile sheet visibility
  const [hasMounted, setHasMounted] = useState(false); // Track hydration
  const [showOutlineContextAlert, setShowOutlineContextAlert] = useState(false); // Renamed from showTocContextAlert
  const router = useRouter();

  // Undo/Redo state
  const [history, setHistory] = useState<Project[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const isUpdatingHistory = useRef(false); // Flag to prevent history loops

  // Mark as mounted on client
  useEffect(() => {
    setHasMounted(true);
  }, []);


  // Derived state: current project (use directly from history if available)
  const project = useMemo(() => {
      if (historyIndex >= 0 && historyIndex < history.length) {
          return history[historyIndex];
      }
      // Fallback to projects from localStorage if history is empty/invalid (should ideally not happen after init)
      return Array.isArray(projects) ? projects.find(p => p.id === projectId) : undefined;
  }, [projects, projectId, history, historyIndex]);

   // Effect to initialize history when project is loaded
  useEffect(() => {
    if (hasMounted && project && history.length === 0 && historyIndex === -1) {
        console.log("Initializing history with project:", project);
        setHistory([project]);
        setHistoryIndex(0);
    }
  }, [project, hasMounted, history.length, historyIndex]); // Run only when project is first defined and history is empty


  // Update project and history
  const updateProject = useCallback((updatedData: Partial<Project> | ((prev: Project) => Project), saveToHistory: boolean = true) => {
      if (!project) return;

      isUpdatingHistory.current = true; // Prevent triggering localStorage save from history update

      setProjects((prevProjects = []) => {
        const currentProjectIndex = (prevProjects || []).findIndex(p => p.id === projectId);
        if (currentProjectIndex === -1) {
            console.error("Project not found in setProjects during update");
            requestAnimationFrame(() => { isUpdatingHistory.current = false; });
            return prevProjects || []; // Return current state if project not found
        }

        const currentProject = prevProjects[currentProjectIndex];
        const updatedProject = typeof updatedData === 'function'
            ? updatedData(currentProject)
            : { ...currentProject, ...updatedData, updatedAt: new Date().toISOString() };

        if (saveToHistory) {
            setHistory(prevHistory => {
                const newHistory = prevHistory.slice(0, historyIndex + 1);
                newHistory.push(updatedProject);
                // Limit history size
                if (newHistory.length > MAX_HISTORY_LENGTH) {
                    newHistory.shift(); // Remove the oldest entry
                }
                const newIndex = Math.min(newHistory.length - 1, MAX_HISTORY_LENGTH - 1); // Index should correspond to the limited array
                setHistoryIndex(newIndex);
                return newHistory;
            });
        } else {
             // If not saving to history (e.g., undo/redo), just update the current history entry
             setHistory(prevHistory => {
                 const newHistory = [...prevHistory];
                 if (historyIndex >= 0 && historyIndex < newHistory.length) {
                     newHistory[historyIndex] = updatedProject;
                 }
                 return newHistory;
             });
        }


        // Update localStorage with the latest state
        const updatedProjects = [...prevProjects];
        updatedProjects[currentProjectIndex] = updatedProject;
        return updatedProjects;
      });

      requestAnimationFrame(() => {
        isUpdatingHistory.current = false;
      });

  }, [project, historyIndex, setProjects, projectId]); // Added projectId


   // Effect to check if project exists and set initial state
   useEffect(() => {
    if (!hasMounted || projects === undefined) return; // Don't run on server or before hydration

    const projectExists = Array.isArray(projects) && projects.some(p => p.id === projectId);
    setIsProjectFound(projectExists);

    if (projectExists && activeSectionIndex === null) {
        setActiveSectionIndex(-1); // Default to project details if project exists
    } else if (!projectExists && isProjectFound !== false) {
        // Only show toast and redirect if we newly detect the project is missing
        setIsProjectFound(false); // Set definitively to false
        toast({
            variant: "destructive",
            title: "Project Not Found",
            description: `Project with ID ${projectId} seems missing. Returning to dashboard.`,
        });
        const timer = setTimeout(() => router.push('/'), 2000);
        return () => clearTimeout(timer);
    }
   }, [projectId, projects, activeSectionIndex, toast, router, isProjectFound, hasMounted]); // Add hasMounted

    // --- Undo/Redo Handlers ---
    const handleUndo = useCallback(() => {
        if (historyIndex > 0) {
            isUpdatingHistory.current = true; // Prevent recursive updates
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
             // Update localStorage with the undone state from history
             const undoneProject = history[newIndex];
             setProjects((prevProjects = []) =>
                 (prevProjects || []).map(p =>
                     p.id === projectId ? undoneProject : p
                 )
             );
             toast({ title: "Undo successful" });
             requestAnimationFrame(() => { isUpdatingHistory.current = false; });
        } else {
             toast({ variant: "destructive", title: "Nothing to undo" });
        }
    }, [historyIndex, history, setProjects, projectId, toast]);

    // Simple check if undo is possible
    const canUndo = historyIndex > 0;


  const handleSectionContentChange = (index: number, content: string) => {
    if (!project || index < 0 || index >= project.sections.length) return;
     updateProject(prev => {
         const updatedSections = [...prev.sections];
         updatedSections[index] = { ...updatedSections[index], content };
         return { ...prev, sections: updatedSections };
     });
  };

  const handleSectionPromptChange = (index: number, prompt: string) => {
    if (!project || index < 0 || index >= project.sections.length) return;
     updateProject(prev => {
         const updatedSections = [...prev.sections];
         updatedSections[index] = { ...updatedSections[index], prompt };
         return { ...prev, sections: updatedSections };
     });
  }

  const handleProjectDetailChange = (field: keyof Project, value: string) => {
    if (!project) return;
    if (field === 'storageType') return; // Prevent direct modification of storageType
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
     updateProject(prev => ({ ...prev, sections: [...prev.sections, newSection] }));
    setActiveSectionIndex(project.sections.length); // Set index for the newly added section
    setCustomSectionName('');
    toast({
      title: "Section Added",
      description: `"${name.trim()}" section has been added.`,
    });
     setIsMobileSheetOpen(false); // Close mobile sheet after adding
  };

  // Renamed: addMultipleSections to setSectionsFromOutline
  const setSectionsFromOutline = useCallback((newSectionNames: string[]) => {
    if (!project) return;

    const existingSectionsMap = new Map(project.sections.map(s => [s.name.toLowerCase(), s]));
    const updatedSections: ProjectSection[] = [];
    let addedCount = 0;
    let preservedCount = 0;
    let sectionOrderChanged = false;

    newSectionNames.forEach((name, index) => {
        const trimmedName = name.trim();
        if (!trimmedName) return; // Skip empty names

        const existingSection = existingSectionsMap.get(trimmedName.toLowerCase());

        if (existingSection) {
            // Preserve existing section, update its order
            updatedSections.push(existingSection);
            existingSectionsMap.delete(trimmedName.toLowerCase()); // Mark as used
            if (project.sections[index]?.name.toLowerCase() !== trimmedName.toLowerCase()) {
                sectionOrderChanged = true; // Check if order changed
            }
            preservedCount++;
        } else {
            // Add new section
            updatedSections.push({
                name: trimmedName,
                prompt: `Generate the ${trimmedName} section for the project titled "${project.title}". Consider the project context: ${project.projectContext || '[No context provided]'}. [Add more specific instructions here if needed]`,
                content: '',
                lastGenerated: undefined,
            });
            addedCount++;
            sectionOrderChanged = true; // Adding is a change in order/content
        }
    });

     // Check if any sections were removed (not present in new outline but existed before)
     const sectionsRemoved = existingSectionsMap.size > 0;

    if (addedCount === 0 && !sectionOrderChanged && !sectionsRemoved) {
        toast({
            title: "Outline Unchanged",
            description: "The generated outline matches the current section structure.",
        });
        return;
    }

    updateProject(prev => ({
        ...prev,
        sections: updatedSections, // Replace sections entirely with the new ordered list
    }));

    let toastDescription = "Project sections have been updated based on the generated outline.";
    if (addedCount > 0) toastDescription += ` ${addedCount} new section(s) added.`;
    if (preservedCount > 0) toastDescription += ` ${preservedCount} existing section(s) preserved.`;
    if (sectionsRemoved) toastDescription += ` Some sections were removed.`;
    if (sectionOrderChanged && addedCount === 0 && !sectionsRemoved) toastDescription = "Section order has been updated based on the generated outline.";

    toast({
        title: "Project Outline Updated",
        description: toastDescription,
        duration: 7000, // Longer duration for more info
    });
    setActiveSectionIndex(0); // Go to the first section after update
    setIsMobileSheetOpen(false); // Close mobile sheet after adding/updating

}, [project, updateProject, toast, setActiveSectionIndex]);


  const handleGenerateSection = async (index: number) => {
    if (!project || index < 0 || index >= project.sections.length || isGenerating || isSummarizing /*|| isGeneratingToc */|| isGeneratingOutline || isSuggesting) return; // Removed isGeneratingToc

    const section = project.sections[index];
    setIsGenerating(true);

    try {
      // Ensure required fields for the AI action are present
      const input = {
        projectTitle: project.title || 'Untitled Project', // Provide fallback
        sectionName: section.name,
        prompt: section.prompt,
        teamDetails: project.teamDetails || '', // Provide fallback
        instituteName: project.instituteName || '', // Use instituteName, provide fallback
        // Add optional fields if they exist in the project, otherwise they remain undefined
        teamId: project.teamId,
        subject: project.subject,
        semester: project.semester,
        branch: project.branch,
        guideName: project.guideName,
      };

      // Type check (optional but good practice)
      // const validatedInput: GenerateReportSectionInput = GenerateReportSectionInputSchema.parse(input);

      const result = await generateSectionAction(input);


      if ('error' in result) throw new Error(result.error);

       // Use updateProject to manage state and history
       updateProject(prev => {
           const updatedSections = [...prev.sections];
           updatedSections[index] = {
               ...updatedSections[index],
               content: result.reportSectionContent,
               lastGenerated: new Date().toISOString(),
           };
           return { ...prev, sections: updatedSections };
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
      if (!project || index < 0 || index >= project.sections.length || isGenerating || isSummarizing /* || isGeneratingToc */|| isGeneratingOutline || isSuggesting) return; // Removed isGeneratingToc

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

  // Removed function extractSectionsFromToc

  // Renamed: proceedWithTocGeneration to proceedWithOutlineGeneration
  const proceedWithOutlineGeneration = useCallback(async () => {
    if (!project || isGenerating || isSummarizing /* || isGeneratingToc */ || isGeneratingOutline || isSuggesting) return; // Removed isGeneratingToc

    setIsGeneratingOutline(true);
    try {
        const result = await generateOutlineAction({ projectTitle: project.title, projectContext: project.projectContext || '' });
        if ('error' in result) throw new Error(result.error);

        if (!result.suggestedSections?.length) {
             toast({ variant: "destructive", title: "Outline Generation Failed", description: "AI did not return any suggested sections." });
             setIsGeneratingOutline(false);
             return;
        }

        // Use the new handler to update sections based on the outline
        setSectionsFromOutline(result.suggestedSections);

    } catch (error) {
        console.error("Outline generation failed:", error);
        toast({ variant: "destructive", title: "Outline Generation Failed", description: error instanceof Error ? error.message : "Could not generate project outline." });
    } finally {
        setIsGeneratingOutline(false);
    }
}, [project, isGenerating, isSummarizing, /* isGeneratingToc, */ isGeneratingOutline, isSuggesting, updateProject, toast, setActiveSectionIndex, setSectionsFromOutline]); // Added dependencies


    // Renamed: handleGenerateTocClick to handleGenerateOutlineClick
    const handleGenerateOutlineClick = () => {
        if (!project || isGenerating || isSummarizing /* || isGeneratingToc */ || isGeneratingOutline || isSuggesting) return; // Removed isGeneratingToc

        const contextLength = project.projectContext?.trim().length || 0;

        if (contextLength < MIN_CONTEXT_LENGTH) {
            setShowOutlineContextAlert(true); // Open the confirmation dialog
        } else {
            proceedWithOutlineGeneration(); // Context is sufficient, proceed directly
        }
    };

  // --- AI Suggestions ---
   const handleGetSuggestions = async () => {
     if (!project || isGenerating || isSummarizing /* || isGeneratingToc */ || isGeneratingOutline || isSuggesting) return; // Removed isGeneratingToc

     setIsSuggesting(true);
     setSuggestions(null); // Clear previous suggestions
     try {
       const allSectionsContent = project.sections
         .map(s => `## ${s.name}\n\n${s.content || '[Empty Section]'}`)
         .join('\n\n---\n\n');

       const result = await suggestImprovementsAction({
         projectTitle: project.title,
         projectContext: project.projectContext,
         allSectionsContent: allSectionsContent,
         focusArea: suggestionInput || undefined, // Pass user input if available
       });

       if ('error' in result) throw new Error(result.error);

       setSuggestions(result.suggestions);
       toast({
         title: "AI Suggestions Ready",
         description: "Suggestions for improvement have been generated below.",
       });

     } catch (error) {
       console.error("Suggestion generation failed:", error);
       toast({
         variant: "destructive",
         title: "Suggestion Failed",
         description: error instanceof Error ? error.message : "Could not generate suggestions.",
       });
     } finally {
       setIsSuggesting(false);
     }
   };


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

   if (!hasMounted || isProjectFound === null) { // Show loading until mounted and project status known
     return ( <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height,60px))] text-center p-4"><Loader2 className="h-16 w-16 animate-spin text-primary mb-4" /><p className="text-lg text-muted-foreground">Loading project...</p></div> );
   }

   if (isProjectFound === false || !project) { // Combine checks for safety
     // Show the "Not Found" message only if isProjectFound is definitively false
      if (isProjectFound === false) {
         return ( <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height,60px))] text-center p-4"><CloudOff className="h-16 w-16 text-destructive mb-4" /><h2 className="text-2xl font-semibold text-destructive mb-2">Project Not Found</h2><p className="text-muted-foreground mb-6">The project with ID <code className="bg-muted px-1 rounded">{projectId}</code> could not be found. It might have been deleted or the link is incorrect.</p><Button onClick={() => router.push('/')}><Home className="mr-2 h-4 w-4" /> Go to Dashboard</Button></div> );
      }
       // If isProjectFound is null or true but project is missing, show loading
       return ( <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height,60px))] text-center p-4"><Loader2 className="h-16 w-16 animate-spin text-primary mb-4" /><p className="text-lg text-muted-foreground">Finalizing project data...</p><Button onClick={() => router.push('/')} className="mt-4"><Home className="mr-2 h-4 w-4" /> Go to Dashboard</Button></div> );
   }

   const activeSection = activeSectionIndex !== null && activeSectionIndex >= 0 && activeSectionIndex < project.sections.length
    ? project.sections[activeSectionIndex]
    : null;

  return (
    // Wrap the entire return content with the Sheet component
    <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
      {/* Main container for the editor layout */}
      <div className="flex h-full relative"> {/* Use full height and relative positioning for floating button */}

        {/* --- Local Project Sidebar (Drawer on Mobile - Content only) --- */}
        {/* The SheetTrigger is now the floating button */}
        <SheetContent side="left" className="p-0 w-64 bg-card md:hidden"> {/* Hide on desktop */}
          <SheetHeader className="sr-only">
            <SheetTitle>Project Menu</SheetTitle>
            <SheetDescription>Navigate project sections and details</SheetDescription>
          </SheetHeader>
          <ProjectSidebarContent
            project={project}
            activeSectionIndex={activeSectionIndex}
            setActiveSectionIndex={setActiveSectionIndex}
            addSection={addSection}
            customSectionName={customSectionName}
            setCustomSectionName={setCustomSectionName}
            handleGenerateOutlineClick={handleGenerateOutlineClick} // Use renamed prop
            isGeneratingOutline={isGeneratingOutline}
            isGenerating={isGenerating}
            isSummarizing={isSummarizing}
            // Removed isGeneratingToc
            handleSaveOnline={handleSaveOnline}
            canUndo={canUndo} // Pass undo state
            handleUndo={handleUndo} // Pass undo handler
            onCloseSheet={() => setIsMobileSheetOpen(false)} // Pass close handler
          />
        </SheetContent>

        {/* Desktop Static Sidebar */}
        <div
          className={cn(
            "hidden md:block transition-all duration-300 ease-in-out overflow-y-auto overflow-x-hidden", // Hide on mobile
            isLocalSidebarOpen ? "w-64 border-r" : "w-0 border-r-0" // Adjust width and border based on state
          )}
          aria-hidden={!isLocalSidebarOpen}
        >
          {/* Only render content if open to prevent visual glitches when collapsed */}
          {isLocalSidebarOpen && (
            <ProjectSidebarContent
              project={project}
              activeSectionIndex={activeSectionIndex}
              setActiveSectionIndex={setActiveSectionIndex}
              addSection={addSection}
              customSectionName={customSectionName}
              setCustomSectionName={setCustomSectionName}
              handleGenerateOutlineClick={handleGenerateOutlineClick} // Use renamed prop
              isGeneratingOutline={isGeneratingOutline}
              isGenerating={isGenerating}
              isSummarizing={isSummarizing}
              // Removed isGeneratingToc
              handleSaveOnline={handleSaveOnline}
              canUndo={canUndo} // Pass undo state
              handleUndo={handleUndo} // Pass undo handler
              // No onCloseSheet needed for desktop
            />
          )}
        </div>

        {/* --- Main Content Area --- */}
        <div className="flex-1 flex flex-col overflow-hidden"> {/* Allow main content to scroll */}
          {/* Sticky Header for Main Content */}
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-4 lg:px-6 flex-shrink-0">
            {/* Global Sidebar Trigger (only if needed, usually handled by MainLayout) */}
            {/* Mobile Sheet Trigger (moved to FAB) */}

            <h1 className="flex-1 text-lg font-semibold md:text-xl text-primary truncate text-glow-primary">
              {activeSectionIndex === -1 ? 'Project Details' : activeSection?.name ?? project.title ?? 'Project'}
            </h1>
            <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto mr-2" title={`Project stored ${project.storageType === 'local' ? 'locally' : 'in the cloud'}`}>
              {project.storageType === 'local' ? <CloudOff className="h-4 w-4" /> : <Cloud className="h-4 w-4 text-green-500" />}
              <span>{project.storageType === 'local' ? 'Local' : 'Cloud'}</span>
            </div>
            {/* Removed Generate ToC Button */}
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

          <ScrollArea className="flex-1 p-4 md:p-6 relative"> {/* Make content scrollable & relative for floating button */}
            {activeSectionIndex === -1 ? (
              // Project Details Form
              <Card className="shadow-md mb-6">
                <CardHeader>
                  <CardTitle className="text-glow-primary">Project Details</CardTitle>
                  <CardDescription>Edit general information about your project. Providing context helps the AI generate a relevant outline and content.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="projectTitleMain">Project Title *</Label>
                    <Input
                      id="projectTitleMain"
                      value={project.title}
                      onChange={(e) => handleProjectDetailChange('title', e.target.value)}
                      placeholder="Enter Project Title"
                      className="mt-1 focus-visible:glow-primary"
                      required
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
                    <p className="text-xs text-muted-foreground mt-1">This context is used by the AI to generate the project outline.</p> {/* Updated description */}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="instituteName">Institute Name</Label>
                      <Input
                        id="instituteName"
                        value={project.instituteName || ''}
                        onChange={(e) => handleProjectDetailChange('instituteName', e.target.value)}
                        placeholder="e.g., L. D. College of Engineering"
                        className="mt-1 focus-visible:glow-primary"
                      />
                    </div>
                    <div>
                      <Label htmlFor="branch">Branch</Label>
                      <Input
                        id="branch"
                        value={project.branch || ''}
                        onChange={(e) => handleProjectDetailChange('branch', e.target.value)}
                        placeholder="e.g., Computer Engineering"
                        className="mt-1 focus-visible:glow-primary"
                      />
                    </div>
                    <div>
                      <Label htmlFor="semester">Semester</Label>
                      <Input
                        id="semester"
                        value={project.semester || ''}
                        onChange={(e) => handleProjectDetailChange('semester', e.target.value)}
                        placeholder="e.g., 5"
                        type="number" // Use number type for semester if appropriate
                        className="mt-1 focus-visible:glow-primary"
                      />
                    </div>
                    <div>
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        value={project.subject || ''}
                        onChange={(e) => handleProjectDetailChange('subject', e.target.value)}
                        placeholder="e.g., Design Engineering - 1A"
                        className="mt-1 focus-visible:glow-primary"
                      />
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="teamId">Team ID</Label>
                      <Input
                        id="teamId"
                        value={project.teamId || ''}
                        onChange={(e) => handleProjectDetailChange('teamId', e.target.value)}
                        placeholder="Enter Team ID"
                        className="mt-1 focus-visible:glow-primary"
                      />
                    </div>
                    <div>
                      <Label htmlFor="guideName">Faculty Guide Name</Label>
                      <Input
                        id="guideName"
                        value={project.guideName || ''}
                        onChange={(e) => handleProjectDetailChange('guideName', e.target.value)}
                        placeholder="Enter Guide's Name"
                        className="mt-1 focus-visible:glow-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="teamDetails">Team Details (Members & Enrollment)</Label>
                    <Textarea
                      id="teamDetails"
                      value={project.teamDetails}
                      onChange={(e) => handleProjectDetailChange('teamDetails', e.target.value)}
                      placeholder="Enter team member names and enrollment numbers, one per line (e.g., John Doe - 123456789)"
                      className="mt-1 min-h-[100px] focus-visible:glow-primary"
                    />
                    <p className="text-xs text-muted-foreground mt-1">This information will be used in the generated report sections and title page.</p>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleGenerateOutlineClick} // Use renamed handler
                    disabled={isGeneratingOutline || isGenerating || isSummarizing /*|| isGeneratingToc*/ || isSuggesting || !project.projectContext?.trim()} // Removed isGeneratingToc
                    className="hover:glow-primary focus-visible:glow-primary"
                    title={!project.projectContext?.trim() ? "Add project context above first" : "Generate section outline based on project context"}
                  >
                    {isGeneratingOutline ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                    {isGeneratingOutline ? 'Generating Outline...' : 'Generate/Update Outline'} {/* Updated text */}
                  </Button>
                </CardFooter>
              </Card>
            ) : activeSection ? (
              // Section Editor
              <div className="space-y-6">
                {/* Removed conditional check for TOC_SECTION_NAME */}
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
                      <Button onClick={() => handleGenerateSection(activeSectionIndex)} disabled={isGenerating || isSummarizing /* || isGeneratingToc */ || isGeneratingOutline || isSuggesting} className="hover:glow-primary focus-visible:glow-primary"> {/* Removed isGeneratingToc */}
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                        {isGenerating ? 'Generating...' : 'Generate Content'}
                      </Button>
                    </CardContent>
                  </Card>


                <Card className="shadow-md mb-6"> {/* Added margin-bottom */}
                  <CardHeader>
                    <CardTitle>{activeSection.name} - Content</CardTitle>
                    <CardDescription>
                      {/* Removed TOC-specific description */}
                      Edit the generated or existing content below.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      id={`section-content-${activeSectionIndex}`}
                      value={activeSection.content}
                      onChange={(e) => handleSectionContentChange(activeSectionIndex, e.target.value)}
                      placeholder={"Generated content will appear here. You can also write manually."} // Simplified placeholder
                      className="min-h-[400px] text-base focus-visible:glow-primary"
                    />
                  </CardContent>
                  {/* Removed conditional check for TOC_SECTION_NAME */}
                    <CardFooter className="flex justify-end">
                      <Button
                        variant="outline"
                        onClick={() => handleSummarizeSection(activeSectionIndex)}
                        disabled={isSummarizing || isGenerating /* || isGeneratingToc */ || isGeneratingOutline || isSuggesting || !activeSection.content?.trim()} // Removed isGeneratingToc
                        className="hover:glow-accent focus-visible:glow-accent"
                      >
                        {isSummarizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScrollText className="mr-2 h-4 w-4" />}
                        {isSummarizing ? 'Summarizing...' : 'Summarize'}
                      </Button>
                    </CardFooter>

                </Card>
              </div>
            ) : (
              // Initial State - No Section Selected or Empty Project
              <div className="flex items-center justify-center h-full">
                {project.sections && project.sections.length > 0 ? (
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
                      <p>Go to <Button variant="link" className="p-0 h-auto text-base" onClick={() => setActiveSectionIndex(-1)}>Project Details</Button> and provide some context, then click "Generate/Update Outline" below or in the details section.</p> {/* Updated text */}
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleGenerateOutlineClick} // Use renamed handler
                        disabled={isGeneratingOutline || isGenerating || isSummarizing /* || isGeneratingToc */ || isSuggesting || !project.projectContext?.trim()} // Removed isGeneratingToc
                        className="hover:glow-primary focus-visible:glow-primary"
                        title={!project.projectContext?.trim() ? "Add project context in Project Details first" : "Generate section outline based on project context"}
                      >
                        {isGeneratingOutline ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                        {isGeneratingOutline ? 'Generating Outline...' : 'Generate/Update Outline'} {/* Updated text */}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-3">Alternatively, you can add standard or custom sections manually using the sidebar.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* AI Suggestions Section (Always visible below content) */}
            <Card className="shadow-md mt-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-primary text-glow-primary">
                        <Sparkles className="w-5 h-5" /> AI Suggestions
                    </CardTitle>
                    <CardDescription>Ask the AI for feedback or specific improvements on your report.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="suggestion-input">What would you like suggestions on? (Optional)</Label>
                        <Input
                            id="suggestion-input"
                            value={suggestionInput}
                            onChange={(e) => setSuggestionInput(e.target.value)}
                            placeholder="e.g., Improve the flow, Add more technical details, Check clarity..."
                            className="mt-1 focus-visible:glow-primary"
                        />
                    </div>
                    <Button
                        onClick={handleGetSuggestions}
                        disabled={isSuggesting || isGenerating || isSummarizing /* || isGeneratingToc */ || isGeneratingOutline} // Removed isGeneratingToc
                        className="hover:glow-primary focus-visible:glow-primary"
                    >
                        {isSuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquareQuote className="mr-2 h-4 w-4" />} {/* Use MessageSquareQuote */}
                        {isSuggesting ? 'Getting Suggestions...' : 'Get Suggestions'}
                    </Button>

                    {/* Display Suggestions */}
                    {suggestions && (
                        <div className="mt-4 p-4 border rounded-md bg-muted/30">
                             <h4 className="font-semibold mb-2 text-foreground">Suggestions:</h4>
                             <div
                                className="prose prose-sm max-w-none dark:prose-invert text-foreground"
                                dangerouslySetInnerHTML={{ __html: marked.parse(suggestions) }}
                             />
                        </div>
                    )}
                </CardContent>
            </Card>


            {/* Floating Action Button (FAB) for Sidebar Toggle */}
            <div className="fixed bottom-6 right-6 z-20 md:bottom-8 md:right-8"> {/* Use fixed positioning */}
              {/* Mobile: Sheet Trigger */}
              <SheetTrigger asChild>
                <Button
                  variant="default" // Use default style for FAB
                  size="icon"
                  className="rounded-full w-14 h-14 shadow-lg md:hidden hover:glow-primary focus-visible:glow-primary"
                  aria-label="Open project menu"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>

              {/* Desktop: Static Sidebar Toggle */}
              <Button
                variant="default" // Use default style for FAB
                size="icon"
                onClick={() => setIsLocalSidebarOpen(!isLocalSidebarOpen)}
                className="hidden md:flex rounded-full w-14 h-14 shadow-lg hover:glow-primary focus-visible:glow-primary"
                aria-label={isLocalSidebarOpen ? "Collapse project menu" : "Expand project menu"}
              >
                <Menu className="h-6 w-6" />
              </Button>
            </div>
          </ScrollArea>
        </div> {/* End Main Content Area */}

        {/* Context Warning Dialog for Outline Generation */}
        <AlertDialog open={showOutlineContextAlert} onOpenChange={setShowOutlineContextAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Project Context May Be Limited</AlertDialogTitle>
              <AlertDialogDescription>
                The project context provided is quite short. Generating an outline might be less accurate.
                Consider adding more details to the "Project Context" field in Project Details for better results.
                Do you want to proceed with outline generation anyway?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={proceedWithOutlineGeneration}>Generate Anyway</AlertDialogAction> {/* Use renamed handler */}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div> {/* End Main Flex Container */}
    </Sheet> // Close the wrapping Sheet component
  );
}
