// src/components/project-editor.tsx
"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Settings, ChevronLeft, Save, Loader2, Wand2, ScrollText, Download, Lightbulb, FileText, Cloud, CloudOff, Home, Menu, MessageSquareQuote, Sparkles, UploadCloud, XCircle, ShieldAlert, FileWarning, Eye, Projector, Undo } from 'lucide-react'; // Added Projector, Undo icons
import Link from 'next/link';
import type { Project, HierarchicalProjectSection, GeneratedSectionOutline, SectionIdentifier, OutlineSection } from '@/types/project'; // Use hierarchical type, Import OutlineSection
import { findSectionById, updateSectionById, deleteSectionById, STANDARD_REPORT_PAGES, STANDARD_PAGE_INDICES, TOC_SECTION_NAME } from '@/lib/project-utils'; // Import helpers from lib
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useToast } from '@/hooks/use-toast';
import { generateSectionAction, summarizeSectionAction, generateOutlineAction, suggestImprovementsAction } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet"; // Import Sheet components
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { marked } from 'marked';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { v4 as uuidv4 } from 'uuid';
import AiDiagramGenerator from './ai-diagram-generator'; // Import the new component
import MermaidDiagram from './mermaid-diagram'; // Import diagram renderer
import { ProjectSidebarContent } from '../project-sidebar-content'; // Correct import path
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Import Tabs
import { updateProject as updateProjectHelper } from '@/lib/project-utils'; // Import the helper function


interface ProjectEditorProps {
  projectId: string;
}

const MIN_CONTEXT_LENGTH = 50;
const MAX_HISTORY_LENGTH = 10;

// Logo Upload Component
const LogoUpload = ({
    label,
    logoUrl,
    field,
    onUpload,
    onRemove,
    isUploading,
}: {
    label: string;
    logoUrl?: string;
    field: 'universityLogoUrl' | 'collegeLogoUrl';
    onUpload: (field: 'universityLogoUrl' | 'collegeLogoUrl', file: File | null) => void;
    onRemove: (field: 'universityLogoUrl' | 'collegeLogoUrl') => void;
    isUploading?: boolean;
}) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        onUpload(field, event.target.files ? event.target.files[0] : null);
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        event.stopPropagation();
        const file = event.dataTransfer.files?.[0];
        if (file) {
            onUpload(field, file);
        }
        event.currentTarget.classList.remove('border-primary', 'bg-primary/10');
    };

    const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.classList.add('border-primary', 'bg-primary/10');
    };

    const handleDragLeave = (event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.classList.remove('border-primary', 'bg-primary/10');
    };

    return (
        <div className="space-y-2">
            <Label htmlFor={`${field}-input`}>{label}</Label>
            <Label
                htmlFor={`${field}-input`}
                className={cn(
                    "flex flex-col items-center justify-center w-full border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/80 transition-colors duration-200",
                    !logoUrl && "p-4 text-center",
                    logoUrl && "relative overflow-hidden",
                    "aspect-square h-32" // Fixed aspect ratio and height
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
            >
                {isUploading ? (
                     <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Loader2 className="w-8 h-8 mb-3 text-muted-foreground animate-spin" />
                        <p className="text-sm text-muted-foreground">Uploading...</p>
                    </div>
                ) : logoUrl ? (
                    <>
                        <img
                            src={logoUrl}
                            alt={`${label} Preview`}
                            className="absolute inset-0 w-full h-full object-contain p-2"
                            data-ai-hint={`${label.toLowerCase().replace(' logo', '')} logo`}
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                                e.preventDefault();
                                onRemove(field);
                            }}
                            className="absolute top-1 right-1 z-10 bg-background/50 hover:bg-destructive hover:text-destructive-foreground h-6 w-6 rounded-full"
                            title={`Remove ${label}`}
                        >
                            <XCircle className="h-4 w-4" />
                        </Button>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                        <UploadCloud className="w-8 h-8 mb-3 text-muted-foreground" />
                        <p className="mb-1 text-sm text-muted-foreground"><span className="font-semibold">Click or drag</span></p>
                        <p className="text-xs text-muted-foreground">PNG, JPG, WEBP</p>
                    </div>
                )}
                <Input
                    id={`${field}-input`}
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isUploading}
                />
            </Label>
        </div>
    );
};

// Placeholder for Standard Pages
const StandardPagePlaceholder = ({ pageName }: { pageName: string }) => (
    <Card className="shadow-md mb-6">
        <CardHeader>
            <CardTitle className="text-primary text-glow-primary flex items-center gap-2">
                <FileWarning className="w-5 h-5 text-amber-500" /> {pageName}
            </CardTitle>
            <CardDescription>
                This is a standard report page. Its content is typically generated automatically or requires specific formatting based on project details.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 min-h-[200px] flex flex-col items-center justify-center text-center">
            <ShieldAlert className="w-12 h-12 text-muted-foreground opacity-50 mb-4" />
            <p className="text-muted-foreground">
                Content for the "{pageName}" is usually auto-generated during export or needs manual creation following specific guidelines.
            </p>
            <p className="text-xs text-muted-foreground">
                (Direct editing is not available for this standard page type here.)
            </p>
             {pageName === TOC_SECTION_NAME && (
                <p className="text-xs text-muted-foreground mt-2">
                    The Table of Contents is automatically generated based on the sections defined in the sidebar.
                </p>
             )}
        </CardContent>
    </Card>
);

// Component for rendering Markdown preview
const MarkdownPreview = React.memo(({ content }: { content: string }) => {
    const [renderedHtml, setRenderedHtml] = useState('');
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true); // Mark as client-side
    }, []);

    useEffect(() => {
        if (isClient && content) {
            // Ensure marked runs only on the client after mount
             try {
                setRenderedHtml(marked.parse(content));
             } catch (error) {
                 console.error("Error parsing Markdown:", error);
                 setRenderedHtml("<p class='text-destructive'>Error rendering preview.</p>");
             }
        } else {
            setRenderedHtml(''); // Clear if no content or on server
        }
    }, [content, isClient]); // Re-render when content changes on the client

    if (!isClient) {
        // Render nothing or a placeholder on the server/during hydration
        return <div className="prose prose-sm dark:prose-invert max-w-none p-4 border rounded min-h-[400px] bg-muted/20 flex items-center justify-center"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground"/></div>;
    }

    return (
        <div
            className="prose prose-sm dark:prose-invert max-w-none p-4 border rounded min-h-[400px] bg-muted/20" // Added background for contrast
            dangerouslySetInnerHTML={{ __html: renderedHtml || '<p class="italic text-muted-foreground">Nothing to preview yet.</p>' }}
        />
    );
});
MarkdownPreview.displayName = 'MarkdownPreview';


export function ProjectEditor({ projectId }: ProjectEditorProps) {
  const [projects, setProjects] = useLocalStorage<Project[]>('projects', []);
  const { toast } = useToast();
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionInput, setSuggestionInput] = useState('');
  const [suggestions, setSuggestions] = useState<string | null>(null);
  const [isProjectFound, setIsProjectFound] = useState<boolean | null>(null);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [showOutlineContextAlert, setShowOutlineContextAlert] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState<Record<'universityLogoUrl' | 'collegeLogoUrl', boolean>>({ universityLogoUrl: false, collegeLogoUrl: false });
  const router = useRouter();
  const [isEditingSections, setIsEditingSections] = useState(false); // State for toggling section edit mode
  const [sectionToDelete, setSectionToDelete] = useState<string | null>(null); // State for delete confirmation
  const [history, setHistory] = useState<Project[]>([]); // History for undo
  const [historyIndex, setHistoryIndex] = useState<number>(-1); // Current position in history
  const isUpdatingHistory = useRef(false); // Flag to prevent history loops

  // Floating Action Button (FAB) state
  const [fabPosition, setFabPosition] = useState({ x: 0, y: 0 });
  const [isDraggingFab, setIsDraggingFab] = useState(false);
  const fabRef = useRef<HTMLButtonElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // State for diagram generator
  const [showDiagramGenerator, setShowDiagramGenerator] = useState(false);


  useEffect(() => {
    setHasMounted(true);
    // Set initial FAB position on mount
    const updateInitialFabPosition = () => {
        if (typeof window === 'undefined') return;
        const fabWidth = 56; // approx width of FAB
        const fabHeight = 56; // approx height of FAB
        const margin = 24; // margin from edge
        const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
        const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
        const initialX = vw - fabWidth - margin;
        const initialY = vh - fabHeight - margin;
        setFabPosition({ x: initialX, y: initialY });
    };
    updateInitialFabPosition();
    window.addEventListener('resize', updateInitialFabPosition);
    return () => window.removeEventListener('resize', updateInitialFabPosition);
  }, []);

  // Derive current project state from history if available, otherwise from main projects list
   const project = useMemo(() => {
     if (historyIndex >= 0 && historyIndex < history.length) {
       return history[historyIndex];
     }
     const currentProjects = Array.isArray(projects) ? projects : [];
     return currentProjects.find(p => p.id === projectId);
   }, [projects, projectId, history, historyIndex]);

  // Initialize history with the current project state on mount
  useEffect(() => {
    if (hasMounted && project && history.length === 0 && historyIndex === -1) {
      setHistory([project]);
      setHistoryIndex(0);
    }
  }, [project, hasMounted, history.length, historyIndex]);


  // Update project state and optionally save to history
   const updateProject = useCallback((updatedData: Partial<Project> | ((prev: Project) => Project), saveToHistory: boolean = true) => {
       updateProjectHelper(updatedData, saveToHistory, projectId, project, setProjects, setHistory, setHistoryIndex, isUpdatingHistory, historyIndex, MAX_HISTORY_LENGTH);
   }, [projectId, project, setProjects, setHistory, setHistoryIndex, historyIndex]);


  // Check if project exists on mount and handle redirects
  useEffect(() => {
    // Prevent running this effect if project state is being updated by history changes
     if (!hasMounted || projects === undefined || isUpdatingHistory.current) return;

    const currentProjects = Array.isArray(projects) ? projects : [];
    const projectExists = currentProjects.some(p => p.id === projectId);

    if (projectExists && isProjectFound !== true) {
      setIsProjectFound(true);
      // Set initial active section (e.g., Project Details) if none is active
      if (activeSectionId === null) {
        setActiveSectionId(String(-1)); // -1 for Project Details
      }
    } else if (!projectExists && isProjectFound !== false) {
      setIsProjectFound(false);
      toast({
        variant: "destructive",
        title: "Project Not Found",
        description: `The project with ID ${projectId} could not be found. It might have been deleted or the link is incorrect.`,
      });
      const timer = setTimeout(() => router.push('/'), 2000); // Redirect after 2 seconds
      return () => clearTimeout(timer); // Cleanup timer on unmount
    }
     // Only run when projectId, projects, activeSectionId, or isProjectFound change
  }, [projectId, projects, activeSectionId, toast, router, isProjectFound, hasMounted]);


  // Handle Undo action
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
       isUpdatingHistory.current = true; // Prevent feedback loop
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex); // Move back in history
      const undoneProject = history[newIndex]; // Get the previous project state

      // Update the main projects state to reflect the undone state
      setProjects((prevProjects = []) => {
         const currentProjectsArray = Array.isArray(prevProjects) ? prevProjects : [];
         const projectIndex = currentProjectsArray.findIndex(p => p.id === projectId);
         if (projectIndex !== -1) {
            const updatedProjects = [...currentProjectsArray];
            updatedProjects[projectIndex] = undoneProject;
            return updatedProjects;
         }
         return currentProjectsArray; // Should ideally not happen if project exists
      });

      toast({ title: "Undo successful" });
       requestAnimationFrame(() => { isUpdatingHistory.current = false; });
    } else {
      toast({ variant: "destructive", title: "Nothing to undo" });
    }
  }, [historyIndex, history, setProjects, projectId, toast]);

  const canUndo = historyIndex > 0;


  // --- Event Handlers for UI interactions ---

  // Set active section in the sidebar
    const handleSetActiveSection = useCallback((idOrIndex: SectionIdentifier) => {
      const newActiveId = String(idOrIndex); // Always treat as string ID internally
       if (activeSectionId !== newActiveId) {
            setActiveSectionId(newActiveId);
            setShowDiagramGenerator(false); // Hide diagram generator when changing sections
        }
    }, [activeSectionId]); // Depend only on activeSectionId


  // Update section content (e.g., from textarea) - no history save on every change
  const handleSectionContentChange = (id: string, content: string) => {
    if (!project) return;
     updateProject(prev => ({
         ...prev,
         sections: updateSectionById(prev.sections, id, { content }),
     }), false); // saveToHistory = false
  };

   // Save content changes to history on blur
   const handleSectionContentBlur = () => {
       if (!project) return;
       updateProject(prev => ({ ...prev }), true); // saveToHistory = true
   };

  // Update section prompt - no history save on every change
  const handleSectionPromptChange = (id: string, prompt: string) => {
    if (!project) return;
     updateProject(prev => ({
         ...prev,
         sections: updateSectionById(prev.sections, id, { prompt }),
     }), false); // saveToHistory = false
  }

   // Save prompt changes to history on blur
   const handleSectionPromptBlur = () => {
       if (!project) return;
       updateProject(prev => ({ ...prev }), true); // saveToHistory = true
   };


  // Update project details fields - no history save on every change
  const handleProjectDetailChange = (field: keyof Project, value: string) => {
    if (!project) return;
    // Ensure we only update valid string fields this way
    const validStringFields: (keyof Project)[] = ['title', 'projectContext', 'teamDetails', 'instituteName', 'collegeInfo', 'teamId', 'subject', 'semester', 'branch', 'guideName'];
    if (validStringFields.includes(field)) {
        updateProject({ [field]: value }, false); // saveToHistory = false
    } else {
        console.warn(`Attempted to update non-string/optional field ${String(field)} via handleProjectDetailChange`);
    }
  };

  // Save project detail changes to history on blur
  const handleProjectDetailBlur = () => {
      if (!project) return;
      updateProject(prev => ({ ...prev }), true); // saveToHistory = true
  };


  // Update project type - save immediately to history
  const handleProjectTypeChange = (value: 'mini-project' | 'internship') => {
    if (!project) return;
    updateProject({ projectType: value }, true); // saveToHistory = true
  };

  // Handle logo upload - save immediately to history
  const handleLogoUpload = (field: 'universityLogoUrl' | 'collegeLogoUrl', file: File | null) => {
    if (!project || !file) return;

    // Basic file type validation
    if (!file.type.startsWith('image/')) {
        toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Please upload an image file.' });
        return;
    }
     // Basic size validation (e.g., 2MB limit)
    const maxSizeInBytes = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSizeInBytes) {
         toast({ variant: 'destructive', title: 'File Too Large', description: `Image must be smaller than ${maxSizeInBytes / (1024 * 1024)}MB.` });
        return;
    }


    setIsUploadingLogo(prev => ({ ...prev, [field]: true })); // Show loading state
    const reader = new FileReader();
    reader.onloadend = () => {
        updateProject({ [field]: reader.result as string }, true); // saveToHistory = true
        toast({ title: 'Logo Uploaded', description: `${field === 'universityLogoUrl' ? 'University' : 'College'} logo updated.` });
        setIsUploadingLogo(prev => ({ ...prev, [field]: false })); // Hide loading state
    };
    reader.onerror = (error) => {
        console.error("Error reading file:", error);
        toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not read the file.' });
        setIsUploadingLogo(prev => ({ ...prev, [field]: false })); // Hide loading state
    };
    reader.readAsDataURL(file); // Read file as Data URL
  };

  // Handle logo removal - save immediately to history
  const handleRemoveLogo = (field: 'universityLogoUrl' | 'collegeLogoUrl') => {
       if (!project) return;
       updateProject({ [field]: undefined }, true); // saveToHistory = true
       toast({ title: 'Logo Removed', description: `${field === 'universityLogoUrl' ? 'University' : 'College'} logo removed.` });
   };


  // Function to process the generated hierarchical outline and update project sections
    const updateSectionsFromToc = useCallback((outline: GeneratedSectionOutline) => {
        if (!project) return;

        // Recursive function to convert AI outline structure to Project Section structure
         const convertOutlineToSections = (outlineSections: OutlineSection[], level = 0): HierarchicalProjectSection[] => {
             return outlineSections.map(outlineSection => {
                 const newId = uuidv4(); // Generate unique ID for each section and sub-section
                 return {
                     id: newId,
                     name: outlineSection.name.trim(),
                     prompt: `Generate the ${outlineSection.name.trim()} section for the project titled "${project.title}". Consider the project context: ${project.projectContext || '[No context provided]'}. [Add specific instructions here.]`,
                     content: '',
                     lastGenerated: undefined,
                     // Recursively convert sub-sections
                     subSections: outlineSection.subSections ? convertOutlineToSections(outlineSection.subSections, level + 1) : [], // Pass level down
                 };
             });
         };

         // Convert the entire received outline
         const newSections = convertOutlineToSections(outline.sections);

        // Replace the existing sections entirely with the new hierarchical structure
        updateProject(prev => ({
            ...prev,
            sections: newSections, // Replace completely
        }), true); // saveToHistory = true

        toast({ title: "Sections Generated", description: `Hierarchical sections created based on AI outline.`, duration: 7000 });

        // Reset active section if it was deleted, or select first if none was active
        const currentActiveSection = activeSectionId ? findSectionById(project.sections, activeSectionId) : null;
        if (currentActiveSection && !findSectionById(newSections, activeSectionId)) {
            handleSetActiveSection(String(-1)); // Set back to Project Details
        } else if (newSections.length > 0 && activeSectionId === null) {
            handleSetActiveSection(newSections[0].id); // Select the first section
        } else if (newSections.length === 0) {
            handleSetActiveSection(String(-1)); // No sections, go to details
        }
        setIsMobileSheetOpen(false); // Close mobile sheet if open

    }, [project, updateProject, toast, activeSectionId, handleSetActiveSection]); // Dependencies


  // Generate content for a specific section
    const handleGenerateSection = async (id: string) => {
      const section = project ? findSectionById(project.sections, id) : null;
      if (!project || !section || isGenerating || isSummarizing || isGeneratingOutline || isSuggesting) return;

      setIsGenerating(true);
      try {
        const input = {
          projectTitle: project.title || 'Untitled Project',
          sectionName: section.name,
          prompt: section.prompt,
          teamDetails: project.teamDetails || '',
          instituteName: project.instituteName || '',
          teamId: project.teamId,
          subject: project.subject,
          semester: project.semester,
          branch: project.branch,
          guideName: project.guideName,
        };
        const result = await generateSectionAction(input);

        if ('error' in result) {
          throw new Error(result.error);
        }

        updateProject(prev => ({
          ...prev,
          sections: updateSectionById(prev.sections, id, {
            content: result.reportSectionContent,
            lastGenerated: new Date().toISOString(),
          }),
        }), true); // saveToHistory = true
        toast({ title: "Section Generated", description: `"${section.name}" content updated.` });
      } catch (error) {
        console.error("Generation failed:", error);
        toast({ variant: "destructive", title: "Generation Failed", description: error instanceof Error ? error.message : "Could not generate content." });
      } finally {
        setIsGenerating(false);
      }
    };


  // Summarize content of a specific section
    const handleSummarizeSection = async (id: string) => {
      const section = project ? findSectionById(project.sections, id) : null;
      if (!project || !section || isGenerating || isSummarizing || isGeneratingOutline || isSuggesting) return;

      if (!section.content?.trim()) {
        toast({ variant: "destructive", title: "Summarization Failed", description: "Section content is empty." });
        return;
      }

      setIsSummarizing(true);
      try {
        const result = await summarizeSectionAction({
          projectTitle: project.title,
          sectionText: section.content,
        });

        if ('error' in result) {
          throw new Error(result.error);
        }

        // Display summary in a toast
        toast({
          title: `Summary for "${section.name}"`,
          description: (
            <ScrollArea className="h-32 w-full">
              <p className="text-sm">{result.summary}</p>
            </ScrollArea>
          ),
          duration: 9000, // Longer duration for reading
        });
      } catch (error) {
        console.error("Summarization failed:", error);
        toast({ variant: "destructive", title: "Summarization Failed", description: error instanceof Error ? error.message : "Could not summarize." });
      } finally {
        setIsSummarizing(false);
      }
    };

  // Proceed with generating Table of Contents (called after context check)
    const proceedWithTocGeneration = useCallback(async () => {
        if (!project || isGenerating || isSummarizing || isGeneratingOutline || isSuggesting) return;
        setIsGeneratingOutline(true);
        try {
            const result = await generateOutlineAction({
                projectTitle: project.title,
                projectContext: project.projectContext || ''
            });

            if ('error' in result) {
                // Specific handling for invalid argument error (potentially bad context)
                 if (result.error.includes("Request contains an invalid argument")) {
                     toast({ variant: "destructive", title: "Section Generation Failed", description: "There might be an issue with the project context provided. Please review and try again." });
                 } else {
                     throw new Error(result.error); // Throw other errors
                 }
                 setIsGeneratingOutline(false);
                 return; // Stop execution
            }

            // Basic validation of the AI response format (now expecting hierarchical)
            if (!result || typeof result !== 'object' || !Array.isArray(result.sections)) {
                 toast({ variant: "destructive", title: "Section Generation Failed", description: "AI did not return the expected hierarchical section structure." });
                 setIsGeneratingOutline(false);
                 return; // Stop execution
             }

            // Type assertion to match the expected hierarchical structure
             const outlineResult = result as GeneratedSectionOutline;

            if (!outlineResult.sections?.length) {
                toast({ variant: "destructive", title: "Section Generation Failed", description: "AI did not return suggested sections." });
                 setIsGeneratingOutline(false);
                return; // Stop execution
            }

            updateSectionsFromToc(outlineResult); // Update project state with hierarchical structure

        } catch (error) {
            console.error("Section generation failed:", error);
            toast({ variant: "destructive", title: "Section Generation Failed", description: error instanceof Error ? error.message : "Could not generate sections." });
        } finally {
            setIsGeneratingOutline(false);
        }
    }, [project, isGenerating, isSummarizing, isGeneratingOutline, isSuggesting, updateSectionsFromToc, toast]); // Dependencies


   // Handle click on the "Generate TOC" button, includes context check
    const handleGenerateTocClick = () => {
        if (!project || isGenerating || isSummarizing || isGeneratingOutline || isSuggesting) return;

        const contextLength = project.projectContext?.trim().length || 0;
        if (contextLength < MIN_CONTEXT_LENGTH) {
            setShowOutlineContextAlert(true); // Show warning dialog
        } else {
            proceedWithTocGeneration(); // Proceed directly if context is sufficient
        }
    };


  // Get AI suggestions for improvement
    const handleGetSuggestions = async () => {
     if (!project || isGenerating || isSummarizing || isGeneratingOutline || isSuggesting) return;

     setIsSuggesting(true);
     setSuggestions(null); // Clear previous suggestions
     try {
        // Flatten the hierarchical structure into a single string for the AI
        const flattenSections = (sections: HierarchicalProjectSection[], level = 0): string => {
            return sections.map(s =>
                `${'#'.repeat(level + 2)} ${s.name}\n\n${s.content || '[Empty Section]'}\n\n` +
                (s.subSections ? flattenSections(s.subSections, level + 1) : '')
            ).join('---\n\n');
        };

       const allSectionsContent = flattenSections(project.sections);

       const result = await suggestImprovementsAction({
         projectTitle: project.title,
         projectContext: project.projectContext,
         allSectionsContent: allSectionsContent,
         focusArea: suggestionInput || undefined, // Pass focus area if provided
       });

       if ('error' in result) {
         throw new Error(result.error);
       }

       setSuggestions(result.suggestions); // Store suggestions
       toast({ title: "AI Suggestions Ready", description: "Suggestions for improvement generated." });

     } catch (error) {
       console.error("Suggestion generation failed:", error);
       toast({ variant: "destructive", title: "Suggestion Failed", description: error instanceof Error ? error.message : "Could not generate suggestions." });
     } finally {
       setIsSuggesting(false);
     }
   };

   // Handle editing section name (called from HierarchicalSectionItem)
     const handleEditSectionName = (id: string, newName: string) => {
         if (!project) return;
         updateProject(prev => ({
             ...prev,
             sections: updateSectionById(prev.sections, id, { name: newName }),
         }), true); // saveToHistory = true
         toast({ title: "Section Name Updated", description: `Section "${newName}" renamed.` });
     };

  // Initiate section deletion process (opens confirmation dialog)
    const handleDeleteSection = (id: string) => {
        setSectionToDelete(id);
    };

  // Confirm deletion after dialog confirmation
    const confirmDeleteSection = () => {
        if (!project || !sectionToDelete) return;
        updateProject(prev => ({
            ...prev,
            sections: deleteSectionById(prev.sections, sectionToDelete),
        }), true); // saveToHistory = true
        toast({ title: "Section Deleted" });
        setSectionToDelete(null); // Close dialog
        // If the active section was deleted, reset to project details
        if (activeSectionId === sectionToDelete) {
            handleSetActiveSection(String(-1));
        }
    };

   // Cancel deletion from dialog
    const cancelDeleteSection = () => {
        setSectionToDelete(null);
    };

    // Add Section is now handled internally by ProjectSidebarContent


  // --- Placeholder Actions ---
  const handleSaveOnline = () => {
     // Placeholder for future cloud save functionality
     if (!project) return;
     toast({ title: "Save Online (Coming Soon)", description: "This will save your project to the cloud." });
     // Later: Implement API call to save project data
     // updateProject({ storageType: 'cloud' }, true); // Example state update
  };

   const handleNavigateToExport = () => {
     if (project) {
       router.push(`/project/${projectId}/export`);
     } else {
        toast({ variant: "destructive", title: "Navigation Error", description: "Project data not found." });
     }
   };


  // --- Diagram Generator Handler ---
  const handleDiagramGenerated = (mermaidCode: string) => {
    // Ensure a section is selected and it's not a standard page placeholder
    if (!project || !activeSectionId || activeSectionId === String(-1) || !isNaN(parseInt(activeSectionId))) return;

    const section = findSectionById(project.sections, activeSectionId);
    if (!section) return;

    // Append the Mermaid code block to the section content
    const newContent = `${section.content || ''}\n\n\`\`\`mermaid\n${mermaidCode}\n\`\`\`\n`;

    updateProject(prev => ({
        ...prev,
        sections: updateSectionById(prev.sections, activeSectionId!, { content: newContent }),
    }), true); // saveToHistory = true

    toast({ title: 'Diagram Added', description: 'Mermaid diagram code inserted into the section content.' });
    setShowDiagramGenerator(false); // Hide generator after adding
  };


   // --- FAB Drag Handlers ---
  const onFabMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return; // Only handle left click
    const target = fabRef.current;
    if (!target) return;

    setIsDraggingFab(true);
    const rect = target.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    target.style.cursor = 'grabbing';
    e.preventDefault(); // Prevent text selection during drag
  };

  const onFabMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingFab || !fabRef.current) return;

    // Get viewport dimensions
     const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
     const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);


    let newX = e.clientX - dragOffset.current.x;
    let newY = e.clientY - dragOffset.current.y;

     // Constrain FAB within viewport boundaries
    const fabWidth = fabRef.current.offsetWidth;
    const fabHeight = fabRef.current.offsetHeight;
    const margin = 16; // Keep FAB away from edges

    newX = Math.max(margin, Math.min(newX, vw - fabWidth - margin));
    newY = Math.max(margin, Math.min(newY, vh - fabHeight - margin));


    setFabPosition({ x: newX, y: newY });
  }, [isDraggingFab]);

  const onFabMouseUp = useCallback(() => {
    if (isDraggingFab && fabRef.current) {
      setIsDraggingFab(false);
      fabRef.current.style.cursor = 'grab';
    }
  }, [isDraggingFab]);

  // Add/remove global mouse listeners for FAB dragging
  useEffect(() => {
    if (isDraggingFab) {
      window.addEventListener('mousemove', onFabMouseMove);
      window.addEventListener('mouseup', onFabMouseUp);
    } else {
      window.removeEventListener('mousemove', onFabMouseMove);
      window.removeEventListener('mouseup', onFabMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onFabMouseMove);
      window.removeEventListener('mouseup', onFabMouseUp);
    };
  }, [isDraggingFab, onFabMouseMove, onFabMouseUp]);


  // --- Render Logic ---

  // Loading State
  if (!hasMounted || isProjectFound === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height,60px))] text-center p-4">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading project...</p>
      </div>
    );
  }

  // Project Not Found State
  if (isProjectFound === false || !project) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height,60px))] text-center p-4">
            <CloudOff className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-2xl font-semibold text-destructive mb-2">Project Not Found</h2>
            <p className="text-muted-foreground mb-6">The project with ID <code className="bg-muted px-1 rounded">{projectId}</code> could not be found.</p>
            <Button onClick={() => router.push('/')}><Home className="mr-2 h-4 w-4" /> Go to Dashboard</Button>
          </div>
       );
  }

  // Determine content to display based on activeSectionId
  let activeViewContent: React.ReactNode = null;
  let activeViewName = project.title ?? 'Project';
  let isStandardPage = false;

  const activeSection = activeSectionId ? findSectionById(project.sections, activeSectionId) : null;
  const standardPageIndex = !isNaN(parseInt(activeSectionId ?? '', 10)) ? parseInt(activeSectionId!, 10) : NaN;


    if (activeSectionId === String(-1)) {
      // Display Project Details Form
      activeViewName = 'Project Details';
      activeViewContent = (
            <Card className="shadow-md mb-6">
              <CardHeader>
                <CardTitle className="text-glow-primary">Project Details</CardTitle>
                <CardDescription>Edit general information. Context helps AI generate relevant sections.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Project Title */}
                <div>
                  <Label htmlFor="projectTitleMain">Project Title *</Label>
                  <Input id="projectTitleMain" value={project.title} onChange={(e) => handleProjectDetailChange('title', e.target.value)} onBlur={handleProjectDetailBlur} placeholder="Enter Project Title" className="mt-1 focus-visible:glow-primary" required />
                </div>
                 {/* Project Type Toggle */}
                <div className="space-y-2">
                    <Label>Project Type</Label>
                    <RadioGroup value={project.projectType} onValueChange={(value: 'mini-project' | 'internship') => handleProjectTypeChange(value)} className="flex items-center gap-4">
                      <div className="flex items-center space-x-2"> <RadioGroupItem value="mini-project" id="type-mini" /> <Label htmlFor="type-mini" className="cursor-pointer">Mini Project</Label> </div>
                      <div className="flex items-center space-x-2"> <RadioGroupItem value="internship" id="type-internship" /> <Label htmlFor="type-internship" className="cursor-pointer">Internship</Label> </div>
                    </RadioGroup>
                </div>
                 {/* Project Context */}
                <div>
                  <Label htmlFor="projectContext">Project Context *</Label>
                  <Textarea id="projectContext" value={project.projectContext} onChange={(e) => handleProjectDetailChange('projectContext', e.target.value)} onBlur={handleProjectDetailBlur} placeholder="Briefly describe your project, goals, scope, technologies..." className="mt-1 min-h-[120px] focus-visible:glow-primary" required />
                  <p className="text-xs text-muted-foreground mt-1">Crucial for AI section generation.</p>
                </div>
                 {/* Logo Uploads */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <LogoUpload label="University Logo" logoUrl={project.universityLogoUrl} field="universityLogoUrl" onUpload={handleLogoUpload} onRemove={handleRemoveLogo} isUploading={isUploadingLogo.universityLogoUrl} />
                    <LogoUpload label="College Logo" logoUrl={project.collegeLogoUrl} field="collegeLogoUrl" onUpload={handleLogoUpload} onRemove={handleRemoveLogo} isUploading={isUploadingLogo.collegeLogoUrl} />
                </div>
                 {/* Institute, Branch, Semester, Subject */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div> <Label htmlFor="instituteName">Institute Name</Label> <Input id="instituteName" value={project.instituteName || ''} onChange={(e) => handleProjectDetailChange('instituteName', e.target.value)} onBlur={handleProjectDetailBlur} placeholder="e.g., L. D. College of Engineering" className="mt-1"/> </div>
                  <div> <Label htmlFor="branch">Branch</Label> <Input id="branch" value={project.branch || ''} onChange={(e) => handleProjectDetailChange('branch', e.target.value)} onBlur={handleProjectDetailBlur} placeholder="e.g., Computer Engineering" className="mt-1"/> </div>
                  <div> <Label htmlFor="semester">Semester</Label> <Input id="semester" value={project.semester || ''} onChange={(e) => handleProjectDetailChange('semester', e.target.value)} onBlur={handleProjectDetailBlur} placeholder="e.g., 5" type="number" className="mt-1"/> </div>
                  <div> <Label htmlFor="subject">Subject</Label> <Input id="subject" value={project.subject || ''} onChange={(e) => handleProjectDetailChange('subject', e.target.value)} onBlur={handleProjectDetailBlur} placeholder="e.g., Design Engineering - 1A" className="mt-1"/> </div>
                </div>
                <Separator />
                 {/* Team ID, Guide Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div> <Label htmlFor="teamId">Team ID</Label> <Input id="teamId" value={project.teamId || ''} onChange={(e) => handleProjectDetailChange('teamId', e.target.value)} onBlur={handleProjectDetailBlur} placeholder="Enter Team ID" className="mt-1"/> </div>
                  <div> <Label htmlFor="guideName">Faculty Guide Name</Label> <Input id="guideName" value={project.guideName || ''} onChange={(e) => handleProjectDetailChange('guideName', e.target.value)} onBlur={handleProjectDetailBlur} placeholder="Enter Guide's Name" className="mt-1"/> </div>
                </div>
                 {/* Team Details */}
                <div>
                  <Label htmlFor="teamDetails">Team Details (Members & Enrollment)</Label>
                  <Textarea id="teamDetails" value={project.teamDetails} onChange={(e) => handleProjectDetailChange('teamDetails', e.target.value)} onBlur={handleProjectDetailBlur} placeholder="John Doe - 123456789&#10;Jane Smith - 987654321" className="mt-1 min-h-[120px] focus-visible:glow-primary"/>
                  <p className="text-xs text-muted-foreground mt-1">One member per line.</p>
                </div>
              </CardContent>
              {/* Footer with Generate/Update Sections Button */}
              <CardFooter className="flex justify-end">
                <Button variant="default" size="sm" onClick={handleGenerateTocClick} disabled={isGeneratingOutline || isGenerating || isSummarizing || isSuggesting || !project.projectContext?.trim()} className="hover:glow-primary focus-visible:glow-primary">
                  {isGeneratingOutline ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                  {isGeneratingOutline ? 'Generating Sections...' : 'Generate/Update Sections'}
                </Button>
              </CardFooter>
            </Card>
      );
    } else if (!isNaN(standardPageIndex) && standardPageIndex < -1) {
        // Display Standard Page Placeholder
        const standardPageEntry = Object.entries(STANDARD_PAGE_INDICES).find(([, index]) => index === standardPageIndex);
        activeViewName = standardPageEntry ? standardPageEntry[0] : 'Standard Page';
        isStandardPage = true;
        activeViewContent = <StandardPagePlaceholder pageName={activeViewName} />;
    } else if (activeSection) {
        // Display Section Editor
        activeViewName = activeSection.name;
        activeViewContent = (
            <div className="space-y-6">
                {/* AI Prompt Card */}
                <Card className="shadow-md">
                  <CardHeader>
                    <CardTitle className="text-primary text-glow-primary">{activeSection.name} - AI Prompt</CardTitle>
                    {activeSection.lastGenerated && ( <CardDescription>Last generated: {new Date(activeSection.lastGenerated).toLocaleString()}</CardDescription> )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor={`section-prompt-${activeSection.id}`}>Generation Prompt</Label>
                      <Textarea id={`section-prompt-${activeSection.id}`} value={activeSection.prompt} onChange={(e) => handleSectionPromptChange(activeSection.id, e.target.value)} onBlur={handleSectionPromptBlur} placeholder="Instructions for the AI..." className="mt-1 min-h-[100px] font-mono text-sm focus-visible:glow-primary" />
                    </div>
                    <Button onClick={() => handleGenerateSection(activeSection.id)} disabled={isGenerating || isSummarizing || isGeneratingOutline || isSuggesting} className="hover:glow-primary focus-visible:glow-primary">
                      {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                      {isGenerating ? 'Generating...' : 'Generate Content'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Section Content Card with Edit/Preview Tabs */}
                <Card className="shadow-md mb-6">
                   <CardHeader>
                     <CardTitle>{activeSection.name} - Content</CardTitle>
                     <CardDescription>Edit the content using Markdown, insert diagrams, and preview the output.</CardDescription>
                   </CardHeader>
                   <CardContent>
                     <Tabs defaultValue="edit" className="w-full">
                       <TabsList className="grid w-full grid-cols-2 mb-4">
                         <TabsTrigger value="edit">Edit</TabsTrigger>
                         <TabsTrigger value="preview">Preview</TabsTrigger>
                       </TabsList>

                       {/* Edit Tab */}
                       <TabsContent value="edit" className="space-y-4">
                           {/* Toggle for Diagram Generator */}
                           <Button variant="outline" size="sm" onClick={() => setShowDiagramGenerator(!showDiagramGenerator)} className="hover:glow-accent focus-visible:glow-accent">
                               <Projector className="mr-2 h-4 w-4" /> {showDiagramGenerator ? 'Hide Diagram Generator' : 'AI Diagram Generator'}
                           </Button>

                           {/* AI Diagram Generator Component */}
                           {showDiagramGenerator && (
                               <Card className="bg-muted/50 p-4">
                                   <AiDiagramGenerator onDiagramGenerated={handleDiagramGenerated} />
                               </Card>
                           )}

                           <Textarea id={`section-content-${activeSection.id}`} value={activeSection.content} onChange={(e) => handleSectionContentChange(activeSection.id, e.target.value)} onBlur={handleSectionContentBlur} placeholder={"Generated content appears here. Use Markdown..."} className="min-h-[400px] text-base focus-visible:glow-primary font-mono" />

                       </TabsContent>

                       {/* Preview Tab */}
                       <TabsContent value="preview">
                           <MarkdownPreview content={activeSection.content || ''} />
                            {/* Render Mermaid diagrams specifically in preview */}
                            <div className="space-y-4 mt-4">
                                {activeSection.content?.match(/```mermaid\n([\s\S]*?)\n```/g)?.map((block, index) => {
                                    const code = block.replace(/```mermaid\n/, '').replace(/\n```/, '');
                                    return (
                                        <div key={`diagram-preview-${activeSection.id}-${index}`} className="my-4">
                                            <MermaidDiagram chart={code} />
                                        </div>
                                    );
                                })}
                            </div>
                       </TabsContent>
                     </Tabs>
                   </CardContent>
                   <CardFooter className="flex justify-end">
                     <Button variant="outline" onClick={() => handleSummarizeSection(activeSection.id)} disabled={isSummarizing || isGenerating || isGeneratingOutline || isSuggesting || !activeSection.content?.trim()} className="hover:glow-accent focus-visible:glow-accent">
                       {isSummarizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScrollText className="mr-2 h-4 w-4" />}
                       {isSummarizing ? 'Summarizing...' : 'Summarize'}
                     </Button>
                   </CardFooter>
                </Card>
            </div>
        );
    } else {
        // Display Placeholder if no section is selected
        activeViewContent = (
            <div className="flex items-center justify-center h-full">
               <Card className="text-center py-8 px-6 max-w-md mx-auto shadow-md">
                  <CardHeader>
                    <CardTitle className="text-xl text-primary text-glow-primary">Select or Generate Sections</CardTitle>
                    <CardDescription className="mt-2">Choose an item from the sidebar or generate sections if none exist.</CardDescription>
                  </CardHeader>
                  <CardContent className="mt-4 space-y-4">
                     <p>Go to <Button variant="link" className="p-0 h-auto text-base" onClick={() => handleSetActiveSection(String(-1))}>Project Details</Button>, provide context, then click "Generate Sections".</p>
                    <Button variant="default" size="sm" onClick={handleGenerateTocClick} disabled={isGeneratingOutline || isGenerating || isSummarizing || isSuggesting || !project.projectContext?.trim()} className="hover:glow-primary focus-visible:glow-primary">
                      {isGeneratingOutline ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                      {isGeneratingOutline ? 'Generating...' : 'Generate Sections'}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-3">The AI will create sections based on your project context.</p>
                  </CardContent>
                </Card>
            </div>
        );
    }

  // Main Editor Layout
  return (
    <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
      <div className="flex h-full relative"> {/* Ensure relative positioning for FAB */}

        {/* Mobile: Sidebar inside Sheet */}
        <SheetContent side="left" className="p-0 w-64 bg-card md:hidden">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Project Menu</SheetTitle>
          </SheetHeader>
          {/* Render Sidebar Content Component */}
          <ProjectSidebarContent
            project={project}
            updateProject={updateProject} // Pass updateProject function
            activeSectionId={activeSectionId}
            setActiveSectionId={handleSetActiveSection}
            handleGenerateTocClick={handleGenerateTocClick}
            isGeneratingOutline={isGeneratingOutline}
            isGenerating={isGenerating}
            isSummarizing={isSummarizing}
            isSuggesting={isSuggesting}
            handleSaveOnline={handleSaveOnline}
            canUndo={canUndo}
            handleUndo={handleUndo}
            onCloseSheet={() => setIsMobileSheetOpen(false)}
            isEditingSections={isEditingSections}
            setIsEditingSections={setIsEditingSections}
            onEditSectionName={handleEditSectionName}
            onDeleteSection={handleDeleteSection}
            // onAddSection is handled internally
          />
        </SheetContent>

        {/* Desktop: Static Sidebar */}
        <div className={cn("hidden md:flex md:flex-col transition-all duration-300 ease-in-out overflow-y-auto overflow-x-hidden", "w-64 border-r")}>
           {/* Render Sidebar Content Component */}
            <ProjectSidebarContent
                project={project}
                updateProject={updateProject} // Pass updateProject function
                activeSectionId={activeSectionId}
                setActiveSectionId={handleSetActiveSection}
                handleGenerateTocClick={handleGenerateTocClick}
                isGeneratingOutline={isGeneratingOutline}
                isGenerating={isGenerating}
                isSummarizing={isSummarizing}
                isSuggesting={isSuggesting}
                handleSaveOnline={handleSaveOnline}
                canUndo={canUndo}
                handleUndo={handleUndo}
                isEditingSections={isEditingSections}
                setIsEditingSections={setIsEditingSections}
                onEditSectionName={handleEditSectionName}
                onDeleteSection={handleDeleteSection}
                 // onAddSection is handled internally
            />
        </div>

        {/* --- Main Content Area --- */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-4 lg:px-6 flex-shrink-0">
            <h1 className="flex-1 text-lg font-semibold md:text-xl text-primary truncate text-glow-primary">
               {activeViewName}
            </h1>
            {/* Storage Type Indicator */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto mr-2" title={`Project stored ${project.storageType === 'local' ? 'locally' : 'in the cloud'}`}>
              {project.storageType === 'local' ? <CloudOff className="h-4 w-4" /> : <Cloud className="h-4 w-4 text-green-500" />}
              <span>{project.storageType === 'local' ? 'Local' : 'Cloud'}</span>
            </div>
             {/* Export Button */}
            <Button variant="outline" size="sm" onClick={handleNavigateToExport} className="hover:glow-accent focus-visible:glow-accent ml-2">
              <Download className="mr-2 h-4 w-4" /> Export Report
            </Button>
          </header>

          {/* Scrollable Content Area */}
          <ScrollArea className="flex-1 p-4 md:p-6">
              {activeViewContent}
              {/* AI Suggestions Card */}
             <Card className="shadow-md mt-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-primary text-glow-primary"><Sparkles className="w-5 h-5" /> AI Suggestions</CardTitle>
                    <CardDescription>Ask the AI for feedback on your report.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="suggestion-input">Focus area (Optional)</Label>
                        <Input id="suggestion-input" value={suggestionInput} onChange={(e) => setSuggestionInput(e.target.value)} placeholder="e.g., Improve flow, Check clarity..." className="mt-1 focus-visible:glow-primary" />
                    </div>
                    <Button onClick={handleGetSuggestions} disabled={isSuggesting || isGenerating || isSummarizing || isGeneratingOutline} className="hover:glow-primary focus-visible:glow-primary">
                        {isSuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquareQuote className="mr-2 h-4 w-4" />}
                        {isSuggesting ? 'Getting Suggestions...' : 'Get Suggestions'}
                    </Button>
                    {suggestions && (
                        <div className="mt-4 p-4 border rounded-md bg-muted/30">
                            <h4 className="font-semibold mb-2 text-foreground">Suggestions:</h4>
                            {/* Render suggestions using Markdown */}
                            <div className="prose prose-sm max-w-none dark:prose-invert text-foreground" dangerouslySetInnerHTML={{ __html: marked.parse(suggestions) }} />
                        </div>
                    )}
                </CardContent>
             </Card>
          </ScrollArea>
        </div>

        {/* Floating Action Button (FAB) for Mobile Sidebar */}
         <Button
             ref={fabRef}
             variant="default"
             size="icon"
             className={cn(
                 "fixed z-20 rounded-full shadow-lg w-14 h-14 hover:glow-primary focus-visible:glow-primary cursor-grab active:cursor-grabbing",
                 "md:hidden" // Hide FAB on medium screens and up
             )}
             style={{ left: `${fabPosition.x}px`, top: `${fabPosition.y}px`, position: 'fixed' }} // Ensure position is fixed
             onMouseDown={onFabMouseDown}
             onClick={(e) => {
                 if (!isDraggingFab) { // Only trigger sheet if not dragging
                    setIsMobileSheetOpen(true);
                 }
             }}
             title="Open project menu"
             aria-label="Open project menu"
         >
             <Menu className="h-6 w-6" />
         </Button>


        {/* Context Warning Dialog */}
        <AlertDialog open={showOutlineContextAlert} onOpenChange={setShowOutlineContextAlert}>
          <AlertDialogContent>
            <AlertDialogHeader> <AlertDialogTitle>Project Context May Be Limited</AlertDialogTitle> <AlertDialogDescription> The project context is short. Generating accurate sections might be difficult. Consider adding more details in "Project Context" for better results. Proceed anyway? </AlertDialogDescription> </AlertDialogHeader>
            <AlertDialogFooter> <AlertDialogCancel>Cancel</AlertDialogCancel> <AlertDialogAction onClick={proceedWithTocGeneration}>Generate Anyway</AlertDialogAction> </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Section Confirmation Dialog */}
         <AlertDialog open={!!sectionToDelete} onOpenChange={(open) => !open && setSectionToDelete(null)}>
           <AlertDialogContent>
             <AlertDialogHeader> <AlertDialogTitle>Delete Section?</AlertDialogTitle> <AlertDialogDescription> Are you sure you want to delete the section "{sectionToDelete ? findSectionById(project.sections, sectionToDelete)?.name : ''}" and all its sub-sections? This action cannot be undone. </AlertDialogDescription> </AlertDialogHeader>
             <AlertDialogFooter> <AlertDialogCancel onClick={cancelDeleteSection}>Cancel</AlertDialogCancel> <AlertDialogAction onClick={confirmDeleteSection} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction> </AlertDialogFooter>
           </AlertDialogContent>
         </AlertDialog>
      </div>
    </Sheet>
  );
}
