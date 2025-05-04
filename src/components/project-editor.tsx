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
import { COMMON_SECTIONS, TOC_SECTION_NAME } from '@/types/project';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useToast } from '@/hooks/use-toast';
import { generateSectionAction, summarizeSectionAction, generateTocAction, generateOutlineAction, suggestImprovementsAction } from '@/app/actions'; // Added suggestImprovementsAction
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
    handleGenerateOutline,
    isGeneratingOutline,
    isGenerating,
    isSummarizing,
    isGeneratingToc,
    handleSaveOnline,
    canUndo, // Added prop
    handleUndo, // Added prop
    onCloseSheet // Added prop to close the sheet on mobile
}: {
    project: Project;
    activeSectionIndex: number | null | -1;
    setActiveSectionIndex: (index: number | -1) => void;
    addSection: (name: string) => void;
    customSectionName: string;
    setCustomSectionName: (name: string) => void;
    handleGenerateOutline: () => void;
    isGeneratingOutline: boolean;
    isGenerating: boolean;
    isSummarizing: boolean;
    isGeneratingToc: boolean;
    handleSaveOnline: () => void;
    canUndo: boolean; // Added type
    handleUndo: () => void; // Added type
    onCloseSheet?: () => void; // Optional close handler
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
                             {section.name === TOC_SECTION_NAME ? <List className="mr-2 h-4 w-4 flex-shrink-0"/> : <FileText className="mr-2 h-4 w-4 flex-shrink-0"/>}
                             <span className="truncate">{section.name}</span>
                         </Button>
                     ))}

                     {/* Add Standard Sections */}
                     <div className="mt-4 px-2">
                         <p className="text-xs font-semibold text-muted-foreground mb-2">Add Standard Section</p>
                         <div className="flex flex-col gap-1">
                             {COMMON_SECTIONS
                              .filter(cs => cs !== TOC_SECTION_NAME)
                              .filter(cs => !project.sections?.some(s => s.name.toLowerCase() === cs.toLowerCase()))
                              .map(sectionName => (
                                 <Button key={sectionName} variant="ghost" size="sm" className="justify-start text-muted-foreground hover:text-foreground" onClick={() => addSection(sectionName)}>
                                     {sectionName}
                                 </Button>
                             ))}
                             {COMMON_SECTIONS.filter(cs => cs !== TOC_SECTION_NAME).every(cs => project.sections?.some(s => s.name.toLowerCase() === cs.toLowerCase())) && (
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
  const [isGeneratingToc, setIsGeneratingToc] = useState(false);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false); // State for suggestion generation
  const [suggestionInput, setSuggestionInput] = useState(''); // State for suggestion text input
  const [suggestions, setSuggestions] = useState<string | null>(null); // State to store AI suggestions
  const [customSectionName, setCustomSectionName] = useState('');
  const [isProjectFound, setIsProjectFound] = useState<boolean | null>(null);
  const [isLocalSidebarOpen, setIsLocalSidebarOpen] = useState(true); // State for local sidebar visibility (desktop)
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false); // State for mobile sheet visibility
  const [hasMounted, setHasMounted] = useState(false); // Track hydration
  const [showTocContextAlert, setShowTocContextAlert] = useState(false); // State for context warning dialog
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

   const addMultipleSections = useCallback((sectionNames: string[]) => {
       if (!project) return;

       const existingSectionNamesLower = new Set(project.sections.map(s => s.name.toLowerCase()));
       const newSections: ProjectSection[] = sectionNames
           .map(name => name.trim())
           .filter(name => name)
           .filter(name => !existingSectionNamesLower.has(name.toLowerCase()))
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

       updateProject(prev => ({ ...prev, sections: [...prev.sections, ...newSections] }));
       toast({
            title: "Sections Added",
            description: `${newSections.length} new sections based on the generated outline have been added.`,
       });
        setIsMobileSheetOpen(false); // Close mobile sheet after adding
   }, [project, updateProject, toast]);


  const handleGenerateSection = async (index: number) => {
    if (!project || index < 0 || index >= project.sections.length || isGenerating || isSummarizing || isGeneratingToc || isGeneratingOutline || isSuggesting) return;

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
      if (!project || index < 0 || index >= project.sections.length || isGenerating || isSummarizing || isGeneratingToc || isGeneratingOutline || isSuggesting) return;

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

  // Function to extract section names from ToC Markdown (simple example)
  const extractSectionsFromToc = (tocContent: string): string[] => {
    const lines = tocContent.split('\n');
    const sections: string[] = [];
    const sectionRegex = /^\s*[\*\-]\s*(.+)/; // Matches lines starting with * or - (markdown list items)

    lines.forEach(line => {
      const match = line.match(sectionRegex);
      if (match && match[1]) {
        // Basic cleaning: remove potential page numbers or extra formatting
        const sectionName = match[1].replace(/\s+\(\d+\)$/, '').trim();
        if (sectionName) {
          sections.push(sectionName);
        }
      }
    });
    return sections;
  };

  const proceedWithTocGeneration = useCallback(async () => {
    if (!project || isGenerating || isSummarizing || isGeneratingToc || isGeneratingOutline || isSuggesting) return;

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
        const extractedSections = extractSectionsFromToc(tocContent);

        // --- Update Project State ---
        updateProject(prev => {
            let tocSectionIndex = prev.sections.findIndex(s => s.name === TOC_SECTION_NAME);
            let updatedSections = [...prev.sections];
            let sectionAdded = false;

            // 1. Update or Add ToC Section
            if (tocSectionIndex > -1) {
                updatedSections[tocSectionIndex] = { ...updatedSections[tocSectionIndex], content: tocContent, lastGenerated: now };
            } else {
                const newTocSection: ProjectSection = { name: TOC_SECTION_NAME, prompt: "Table of Contents generated by AI.", content: tocContent, lastGenerated: now };
                updatedSections.unshift(newTocSection);
                tocSectionIndex = 0;
                sectionAdded = true;
            }

            // 2. Add missing sections based on ToC
            const existingSectionNamesLower = new Set(updatedSections.map(s => s.name.toLowerCase()));
            const missingSections = extractedSections
                .map(name => name.trim())
                .filter(name => name && !existingSectionNamesLower.has(name.toLowerCase()))
                .map(name => ({
                    name: name,
                    prompt: `Generate the ${name} section for the project titled "${prev.title}". Consider the project context: ${prev.projectContext || '[No context provided]'}. [Add more specific instructions here if needed]`,
                    content: '',
                    lastGenerated: undefined,
                }));

            if (missingSections.length > 0) {
                 // Insert missing sections after the ToC section
                 updatedSections.splice(tocSectionIndex + 1, 0, ...missingSections);
                toast({
                     title: "Sections Added",
                     description: `${missingSections.length} missing sections were added based on the generated ToC.`,
                 });
            }

             // 3. Schedule UI Updates (Toast and Active Index)
             requestAnimationFrame(() => {
                 toast({
                     title: "Table of Contents Generated",
                     description: `The "${TOC_SECTION_NAME}" section has been ${sectionAdded ? 'added' : 'updated'}.`,
                 });
                 setActiveSectionIndex(tocSectionIndex);
                 setIsMobileSheetOpen(false); // Close mobile sheet after generating
             });

            return { ...prev, sections: updatedSections, updatedAt: now };
        });


    } catch (error) {
        console.error("Table of Contents generation failed:", error);
        toast({ variant: "destructive", title: "ToC Generation Failed", description: error instanceof Error ? error.message : "Could not generate Table of Contents." });
    } finally {
        setIsGeneratingToc(false);
    }
  }, [project, isGenerating, isSummarizing, isGeneratingToc, isGeneratingOutline, isSuggesting, updateProject, toast, setActiveSectionIndex]); // Added isSuggesting, updateProject


    const handleGenerateTocClick = () => {
        if (!project || isGenerating || isSummarizing || isGeneratingToc || isGeneratingOutline || isSuggesting) return;

        const contextLength = project.projectContext?.trim().length || 0;

        if (contextLength < MIN_CONTEXT_LENGTH) {
            setShowTocContextAlert(true); // Open the confirmation dialog
        } else {
            proceedWithTocGeneration(); // Context is sufficient, proceed directly
        }
    };

  const handleGenerateOutline = useCallback(async () => {
      if (!project || isGenerating || isSummarizing || isGeneratingToc || isGeneratingOutline || isSuggesting) return;

      if (!project.projectContext?.trim()) {
          toast({ variant: "destructive", title: "Cannot Generate Outline", description: "Please provide some project context in Project Details first." });
          setActiveSectionIndex(-1);
          setIsMobileSheetOpen(false); // Close mobile sheet
          return;
      }

      setIsGeneratingOutline(true);
      try {
          const result = await generateOutlineAction({ projectTitle: project.title, projectContext: project.projectContext });
          if ('error' in result) throw new Error(result.error);
          if (!result.suggestedSections?.length) throw new Error("AI did not return any suggested sections.");

          addMultipleSections(result.suggestedSections);

      } catch (error) {
          console.error("Outline generation failed:", error);
          toast({ variant: "destructive", title: "Outline Generation Failed", description: error instanceof Error ? error.message : "Could not generate project outline." });
      } finally {
          setIsGeneratingOutline(false);
      }
  }, [project, isGenerating, isSummarizing, isGeneratingToc, isGeneratingOutline, isSuggesting, toast, addMultipleSections, setActiveSectionIndex]); // Added isSuggesting, setActiveSectionIndex

    // --- AI Suggestions ---
   const handleGetSuggestions = async () => {
     if (!project || isGenerating || isSummarizing || isGeneratingToc || isGeneratingOutline || isSuggesting) return;

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
            handleGenerateOutline={handleGenerateOutline}
            isGeneratingOutline={isGeneratingOutline}
            isGenerating={isGenerating}
            isSummarizing={isSummarizing}
            isGeneratingToc={isGeneratingToc}
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
              handleGenerateOutline={handleGenerateOutline}
              isGeneratingOutline={isGeneratingOutline}
              isGenerating={isGenerating}
              isSummarizing={isSummarizing}
              isGeneratingToc={isGeneratingToc}
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateTocClick} // Use the new click handler
              disabled={isGeneratingToc || isGenerating || isSummarizing || isGeneratingOutline || isSuggesting || !project.sections || project.sections.filter(s => s.name !== TOC_SECTION_NAME).length === 0}
              className="hover:glow-accent focus-visible:glow-accent"
              title={!project.sections || project.sections.filter(s => s.name !== TOC_SECTION_NAME).length === 0 ? "Add sections before generating ToC" : "Generate Table of Contents (updates sections)"}
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
                    <p className="text-xs text-muted-foreground mt-1">This context is used by the AI to generate the initial project outline and can influence the Table of Contents generation.</p>
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
                    onClick={handleGenerateOutline}
                    disabled={isGeneratingOutline || isGenerating || isSummarizing || isGeneratingToc || isSuggesting || !project.projectContext?.trim()}
                    className="hover:glow-primary focus-visible:glow-primary"
                    title={!project.projectContext?.trim() ? "Add project context above first" : "Generate section outline based on project context"}
                  >
                    {isGeneratingOutline ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                    {isGeneratingOutline ? 'Generating Section Outline...' : 'Generate Section Outline'}
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
                      <Button onClick={() => handleGenerateSection(activeSectionIndex)} disabled={isGenerating || isSummarizing || isGeneratingToc || isGeneratingOutline || isSuggesting} className="hover:glow-primary focus-visible:glow-primary">
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                        {isGenerating ? 'Generating...' : 'Generate Content'}
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <Card className="shadow-md mb-6"> {/* Added margin-bottom */}
                  <CardHeader>
                    <CardTitle>{activeSection.name} - Content</CardTitle>
                    <CardDescription>
                      {activeSection.name === TOC_SECTION_NAME
                        ? "This Table of Contents was generated by the AI. Generating it again may add missing sections based on its content. You can manually edit it below."
                        : "Edit the generated or existing content below."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      id={`section-content-${activeSectionIndex}`}
                      value={activeSection.content}
                      onChange={(e) => handleSectionContentChange(activeSectionIndex, e.target.value)}
                      placeholder={activeSection.name === TOC_SECTION_NAME ? "Table of Contents will appear here." : "Generated content will appear here. You can also write manually."}
                      className="min-h-[400px] text-base focus-visible:glow-primary"
                    />
                  </CardContent>
                  {activeSection.name !== TOC_SECTION_NAME && (
                    <CardFooter className="flex justify-end">
                      <Button
                        variant="outline"
                        onClick={() => handleSummarizeSection(activeSectionIndex)}
                        disabled={isSummarizing || isGenerating || isGeneratingToc || isGeneratingOutline || isSuggesting || !activeSection.content?.trim()}
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
                      <p>Go to <Button variant="link" className="p-0 h-auto text-base" onClick={() => setActiveSectionIndex(-1)}>Project Details</Button> and provide some context, then click "Generate Section Outline" below or in the details section.</p>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleGenerateOutline}
                        disabled={isGeneratingOutline || isGenerating || isSummarizing || isGeneratingToc || isSuggesting || !project.projectContext?.trim()}
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
                        disabled={isSuggesting || isGenerating || isSummarizing || isGeneratingToc || isGeneratingOutline}
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

        {/* Context Warning Dialog for ToC Generation */}
        <AlertDialog open={showTocContextAlert} onOpenChange={setShowTocContextAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Project Context May Be Limited</AlertDialogTitle>
              <AlertDialogDescription>
                The project context provided is quite short. Generating a Table of Contents might be less accurate, and it might not identify all necessary sections.
                Consider adding more details to the "Project Context" field in Project Details for better results.
                Do you want to proceed with generation anyway?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={proceedWithTocGeneration}>Generate Anyway</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div> {/* End Main Flex Container */}
    </Sheet> // Close the wrapping Sheet component
  );
}
