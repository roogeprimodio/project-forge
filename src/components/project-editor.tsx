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
import { Settings, ChevronLeft, Save, Loader2, Wand2, ScrollText, Download, Lightbulb, FileText, Cloud, CloudOff, Home, Menu, Undo, MessageSquareQuote, Sparkles, UploadCloud, XCircle, ShieldAlert, FileWarning, Eye, Projector, BrainCircuit, Plus, Minus, CheckCircle } from 'lucide-react'; // Added CheckCircle
import Link from 'next/link';
import type { Project, HierarchicalProjectSection, GeneratedSectionOutline, SectionIdentifier, OutlineSection } from '@/types/project'; // Use hierarchical type
import { findSectionById, updateSectionById, deleteSectionById, STANDARD_REPORT_PAGES, STANDARD_PAGE_INDICES, TOC_SECTION_NAME } from '@/lib/project-utils'; // Import functions and constants
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useToast } from '@/hooks/use-toast';
import { generateSectionAction, summarizeSectionAction, generateOutlineAction, suggestImprovementsAction, generateDiagramAction } from '@/app/actions';
import type { GenerateDiagramMermaidInput } from '@/ai/flows/generate-diagram-mermaid';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { marked } from 'marked';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { v4 as uuidv4 } from 'uuid';
import AiDiagramGenerator from './ai-diagram-generator';
import MermaidDiagram from './mermaid-diagram';
import { ProjectSidebarContent } from '@/components/project-sidebar-content'; // Correct import path
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Import Tabs
import { updateProject as updateProjectHelper } from '@/lib/project-utils'; // Import the helper function
import MarkdownPreview from '@/components/markdown-preview'; // Import MarkdownPreview

// Recursive component to render the preview outline
const OutlinePreviewItem: React.FC<{ item: OutlineSection; level: number }> = ({ item, level }) => {
  const hasSubSections = item.subSections && item.subSections.length > 0;
  const isDiagram = item.name.toLowerCase().startsWith("diagram:") || item.name.toLowerCase().startsWith("figure");

  return (
    <div className="text-sm">
      <div className="flex items-center" style={{ paddingLeft: `${level * 1.5}rem` }}>
        <span className="mr-2 text-muted-foreground">-</span>
        <span className={cn(isDiagram && "italic text-muted-foreground")}>{item.name}</span>
      </div>
      {hasSubSections && (
        <div className="border-l border-muted/30 ml-2 pl-2">
          {item.subSections.map((subItem, index) => (
            <OutlinePreviewItem key={`${item.name}-${index}`} item={subItem} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};


interface ProjectEditorProps {
  projectId: string;
}

const MIN_CONTEXT_LENGTH = 50; // Minimum character length for context
const MIN_CONTEXT_WORDS = 10; // Minimum word count for context
const MAX_HISTORY_LENGTH = 10;

// Logo Upload Component (Optimized for Responsive Size)
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
                    "aspect-square h-24 sm:h-32" // Responsive height
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
            >
                {isUploading ? (
                     <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 mb-3 text-muted-foreground animate-spin" />
                        <p className="text-xs sm:text-sm text-muted-foreground">Uploading...</p>
                    </div>
                ) : logoUrl ? (
                    <>
                        <img
                            src={logoUrl}
                            alt={`${label} Preview`}
                            className="absolute inset-0 w-full h-full object-contain p-1 sm:p-2"
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
                            className="absolute top-1 right-1 z-10 bg-background/50 hover:bg-destructive hover:text-destructive-foreground h-5 w-5 sm:h-6 sm:w-6 rounded-full"
                            title={`Remove ${label}`}
                        >
                            <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                        <UploadCloud className="w-6 h-6 sm:w-8 sm:h-8 mb-2 sm:mb-3 text-muted-foreground" />
                        <p className="mb-1 text-xs sm:text-sm text-muted-foreground"><span className="font-semibold">Click or drag</span></p>
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
            <CardTitle className="text-primary text-glow-primary flex items-center gap-2 text-lg md:text-xl">
                <FileWarning className="w-5 h-5 text-amber-500" /> {pageName}
            </CardTitle>
            <CardDescription className="text-sm">
                This is a standard report page. Content is typically generated automatically during export.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 min-h-[200px] flex flex-col items-center justify-center text-center text-sm text-muted-foreground p-4">
            <ShieldAlert className="w-10 h-10 md:w-12 md:h-12 opacity-50 mb-3" />
            <p>
                Content for the "{pageName}" is usually auto-generated or requires manual creation following specific guidelines. Direct editing is not available here.
            </p>
             {pageName === TOC_SECTION_NAME && (
                <p className="text-xs mt-2">
                    The Table of Contents is based on the sections defined in the sidebar.
                </p>
             )}
        </CardContent>
    </Card>
);


// Counter Input Component
const CounterInput = ({ label, value, onChange, onBlur, min = 0 }: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    onBlur?: () => void;
    min?: number;
}) => {
    const handleIncrement = () => onChange(value + 1);
    const handleDecrement = () => onChange(Math.max(min, value - 1)); // Ensure value doesn't go below min

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const numValue = parseInt(e.target.value, 10);
        if (!isNaN(numValue)) {
            onChange(Math.max(min, numValue));
        } else if (e.target.value === '') {
            onChange(min); // Reset to min if input is cleared
        }
    };

    return (
        <div>
            <Label htmlFor={`counter-${label.toLowerCase().replace(/\s+/g, '-')}`}>{label}</Label>
            <div className="flex items-center gap-1 mt-1">
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleDecrement}
                    className="h-8 w-8"
                    aria-label={`Decrease ${label}`}
                >
                    <Minus className="h-4 w-4" />
                </Button>
                <Input
                    id={`counter-${label.toLowerCase().replace(/\s+/g, '-')}`}
                    type="number"
                    value={value}
                    onChange={handleInputChange}
                    onBlur={onBlur}
                    className="h-8 text-center w-16 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" // Hide number spinners
                    min={min}
                />
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleIncrement}
                    className="h-8 w-8"
                    aria-label={`Increase ${label}`}
                >
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};


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
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false); // State for mobile sidebar sheet
  const [hasMounted, setHasMounted] = useState(false);
  const [showOutlineContextAlert, setShowOutlineContextAlert] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState<Record<'universityLogoUrl' | 'collegeLogoUrl', boolean>>({ universityLogoUrl: false, collegeLogoUrl: false });
  const router = useRouter();
  const [isEditingSections, setIsEditingSections] = useState(false); // State for toggling section edit mode
  const [sectionToDelete, setSectionToDelete] = useState<string | null>(null); // State for delete confirmation
  const [history, setHistory] = useState<Project[]>([]); // History for undo
  const [historyIndex, setHistoryIndex] = useState<number>(-1); // Current position in history
  const isUpdatingHistory = useRef(false); // Flag to prevent history loops
  const [previewedOutline, setPreviewedOutline] = useState<GeneratedSectionOutline | null>(null); // State for the previewed outline

  // Floating Action Button (FAB) state for mobile sidebar trigger
  const [fabPosition, setFabPosition] = useState({ x: 0, y: 0 });
  const [isDraggingFab, setIsDraggingFab] = useState(false);
  const fabRef = useRef<HTMLButtonElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // State for diagram generator in section editor
  const [isGeneratingDiagram, setIsGeneratingDiagram] = useState(false);


  useEffect(() => {
    setHasMounted(true);
    // Set initial FAB position on mount (relative to viewport)
    const updateInitialFabPosition = () => {
        if (typeof window === 'undefined') return;
        const fabWidth = 56; // approx width of FAB (w-14)
        const fabHeight = 56; // approx height of FAB (h-14)
        const margin = 16; // margin from edge (space-4)
        const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
        const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
        const initialX = vw - fabWidth - margin;
        const initialY = vh - fabHeight - margin; // Position from bottom
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


  // --- Event Handlers for UI interactions ---

  // Set active section in the sidebar
    const handleSetActiveSection = useCallback((idOrIndex: SectionIdentifier) => {
        const newActiveId = String(idOrIndex);
        if (activeSectionId !== newActiveId) {
            setActiveSectionId(newActiveId);
            // Clear the outline preview when navigating away from Project Details
            if (newActiveId !== String(-1)) {
                setPreviewedOutline(null);
            }
        }
        setIsMobileSheetOpen(false);
    }, [activeSectionId]); // Depend on activeSectionId

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
        handleSetActiveSection(String(-1)); // -1 for Project Details
      }
    } else if (!projectExists && isProjectFound !== false) {
      setIsProjectFound(false);
      toast({
        variant: "destructive",
        title: "Project Not Found",
        description: `The project with ID ${projectId} could not be found. Redirecting...`,
      });
      const timer = setTimeout(() => router.push('/'), 2000); // Redirect after 2 seconds
      return () => clearTimeout(timer); // Cleanup timer on unmount
    }
     // Only run when projectId, projects, activeSectionId, or isProjectFound change
  }, [projectId, projects, activeSectionId, toast, router, isProjectFound, hasMounted, handleSetActiveSection]); // Added handleSetActiveSection dependency


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
      setPreviewedOutline(null); // Clear preview on undo
      toast({ title: "Undo successful" });
       requestAnimationFrame(() => { isUpdatingHistory.current = false; });
    } else {
      toast({ variant: "destructive", title: "Nothing to undo" });
    }
  }, [historyIndex, history, setProjects, projectId, toast]);

  const canUndo = historyIndex > 0;

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
  const handleProjectDetailChange = (field: keyof Project, value: string | number) => { // Allow number for counters
    if (!project) return;
    // Update fields based on type
    const validStringFields: (keyof Project)[] = ['title', 'projectContext', 'teamDetails', 'instituteName', 'collegeInfo', 'teamId', 'subject', 'semester', 'branch', 'guideName'];
    const validNumberFields: (keyof Project)[] = ['minSections', 'maxSubSectionsPerSection']; // Updated fields

    if (validStringFields.includes(field) && typeof value === 'string') {
        updateProject({ [field]: value }, false);
    } else if (validNumberFields.includes(field) && typeof value === 'number' && !isNaN(value)) {
         updateProject({ [field]: Math.max(0, value) }, false); // Ensure non-negative
    } else if (validNumberFields.includes(field) && typeof value === 'string') {
        // Handle string input for number fields, attempt conversion
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue)) {
             updateProject({ [field]: Math.max(0, numValue) }, false);
        } else if (value === '') {
             updateProject({ [field]: 0 }, false); // Treat empty string as 0 or keep previous? Let's use 0 for now.
        }
    } else {
        console.warn(`Attempted to update field ${String(field)} with incompatible value type: ${typeof value}`);
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

    if (!file.type.startsWith('image/')) {
        toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Please upload an image file.' });
        return;
    }
    const maxSizeInBytes = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSizeInBytes) {
         toast({ variant: 'destructive', title: 'File Too Large', description: `Image must be smaller than ${maxSizeInBytes / (1024 * 1024)}MB.` });
        return;
    }

    setIsUploadingLogo(prev => ({ ...prev, [field]: true }));
    const reader = new FileReader();
    reader.onloadend = () => {
        updateProject({ [field]: reader.result as string }, true);
        toast({ title: 'Logo Uploaded', description: `${field === 'universityLogoUrl' ? 'University' : 'College'} logo updated.` });
        setIsUploadingLogo(prev => ({ ...prev, [field]: false }));
    };
    reader.onerror = (error) => {
        console.error("Error reading file:", error);
        toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not read the file.' });
        setIsUploadingLogo(prev => ({ ...prev, [field]: false }));
    };
    reader.readAsDataURL(file);
  };

  // Handle logo removal - save immediately to history
  const handleRemoveLogo = (field: 'universityLogoUrl' | 'collegeLogoUrl') => {
       if (!project) return;
       updateProject({ [field]: undefined }, true);
       toast({ title: 'Logo Removed', description: `${field === 'universityLogoUrl' ? 'University' : 'College'} logo removed.` });
   };


  // Function to actually apply the generated outline to the project sections
    const applyGeneratedOutline = useCallback(() => {
        if (!project || !previewedOutline) return;

        if (!previewedOutline || !Array.isArray(previewedOutline.sections)) {
            toast({ variant: "destructive", title: "Section Update Failed", description: "No valid outline preview available to apply." });
            return;
        }

         const convertOutlineToSections = (outlineSections: OutlineSection[], level = 0): HierarchicalProjectSection[] => {
             // Limit top-level sections based on project setting or default
            const limitedTopLevel = outlineSections.slice(0, project.minSections || 5); // Use project setting or default

             return limitedTopLevel.map(outlineSection => {
                 const newId = uuidv4();
                 const isDiagram = outlineSection.name.toLowerCase().startsWith("diagram:") || outlineSection.name.toLowerCase().startsWith("figure");

                 // Recursively convert subsections, limiting depth based on project setting or default
                 let subSections: HierarchicalProjectSection[] = [];
                 if (outlineSection.subSections && level < (project.maxSubSectionsPerSection || 2)) { // Use project setting or default depth
                     subSections = convertOutlineToSections(outlineSection.subSections, level + 1);
                 } else if (outlineSection.subSections) {
                     console.warn(`Subsections for "${outlineSection.name}" ignored due to depth limit.`);
                 }


                 return {
                     id: newId,
                     name: outlineSection.name.trim(),
                     prompt: isDiagram
                         ? `Generate Mermaid code for: ${outlineSection.name.replace(/^(Diagram:|Figure \d+:)\s*/i, '').trim()}`
                         : `Generate the ${outlineSection.name.trim()} section for the project titled "${project.title}". Context: ${project.projectContext || '[No context]'}.`,
                     content: '',
                     lastGenerated: undefined,
                     subSections: subSections, // Assign converted (and possibly limited) subsections
                 };
             });
         };

         const newSections = convertOutlineToSections(previewedOutline.sections);

        updateProject(prev => ({
            ...prev,
            sections: newSections,
        }), true); // Save to history when applying

        toast({ title: "Sections Updated", description: `Project sections updated with the generated outline.`, duration: 7000 });
        setPreviewedOutline(null); // Clear the preview after applying

        // Reset active section if needed
        const currentActiveSection = activeSectionId ? findSectionById(project.sections, activeSectionId) : null;
        if (currentActiveSection && !findSectionById(newSections, activeSectionId)) {
            handleSetActiveSection(String(-1));
        } else if (newSections.length > 0 && activeSectionId === null) {
            handleSetActiveSection(newSections[0].id);
        } else if (newSections.length === 0) {
            handleSetActiveSection(String(-1));
        }
        setIsMobileSheetOpen(false);

    }, [project, updateProject, toast, activeSectionId, handleSetActiveSection, previewedOutline]);


  // Generate content for a specific section
    const handleGenerateSection = async (id: string) => {
      const section = project ? findSectionById(project.sections, id) : null;
      if (!project || !section || isGenerating || isSummarizing || isGeneratingOutline || isSuggesting || isGeneratingDiagram) return;

      const isDiagram = section.name.toLowerCase().startsWith("diagram:") || section.name.toLowerCase().startsWith("figure");

      if (isDiagram) {
         setIsGeneratingDiagram(true);
         try {
            const diagramInput: GenerateDiagramMermaidInput = {
                description: section.prompt || `Diagram for ${section.name}`,
            };
            const result = await generateDiagramAction(diagramInput);
            if ('error' in result) {
                 throw new Error(result.error);
            }
            updateProject(prev => ({
                 ...prev,
                 sections: updateSectionById(prev.sections, id, {
                    content: result.mermaidCode,
                    lastGenerated: new Date().toISOString(),
                 }),
            }), true);
            toast({ title: "Diagram Generated", description: `Mermaid code for "${section.name}" created.` });

         } catch (error) {
             console.error("Diagram generation failed:", error);
             toast({ variant: "destructive", title: "Diagram Generation Failed", description: error instanceof Error ? error.message : "Could not generate diagram." });
         } finally {
            setIsGeneratingDiagram(false);
         }

      } else {
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
           }), true);
           toast({ title: "Section Generated", description: `"${section.name}" content updated.` });
         } catch (error) {
           console.error("Generation failed:", error);
           toast({ variant: "destructive", title: "Generation Failed", description: error instanceof Error ? error.message : "Could not generate content." });
         } finally {
           setIsGenerating(false);
         }
      }
    };


  // Summarize content of a specific section (Only makes sense for text sections)
    const handleSummarizeSection = async (id: string) => {
      const section = project ? findSectionById(project.sections, id) : null;
      if (!project || !section || isGenerating || isSummarizing || isGeneratingOutline || isSuggesting) return;
       const isDiagram = section.name.toLowerCase().startsWith("diagram:") || section.name.toLowerCase().startsWith("figure");
       if (isDiagram) {
            toast({ variant: "destructive", title: "Cannot Summarize", description: "Diagram sections cannot be summarized." });
           return;
       }

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

        toast({
          title: `Summary for "${section.name}"`,
          description: (
            <ScrollArea className="h-32 w-full">
              <p className="text-sm">{result.summary}</p>
            </ScrollArea>
          ),
          duration: 9000,
        });
      } catch (error) {
        console.error("Summarization failed:", error);
        toast({ variant: "destructive", title: "Summarization Failed", description: error instanceof Error ? error.message : "Could not summarize." });
      } finally {
        setIsSummarizing(false);
      }
    };

  // Proceed with generating the outline PREVIEW (called after context check)
    const proceedWithOutlinePreviewGeneration = useCallback(async () => {
        if (!project || isGenerating || isSummarizing || isGeneratingOutline || isSuggesting) return;
        setIsGeneratingOutline(true);
        setPreviewedOutline(null); // Clear previous preview
        try {
            const result = await generateOutlineAction({
                projectTitle: project.title,
                projectContext: project.projectContext || '',
                minSections: project.minSections,
                maxSubSectionsPerSection: project.maxSubSectionsPerSection,
            });

            if (result && typeof result === 'object' && 'error' in result) {
                toast({ variant: "destructive", title: "Outline Generation Failed", description: result.error || "An unknown error occurred from the AI." });
                setIsGeneratingOutline(false);
                return;
            }

            if (!result || !Array.isArray(result.sections) || !validateOutlineStructure(result.sections)) {
                 console.error("Invalid outline structure received:", result);
                 toast({ variant: "destructive", title: "Outline Generation Failed", description: "AI did not return the expected hierarchical section structure. Check console for details." });
                 setIsGeneratingOutline(false);
                 return;
            }

             const outlineResult = result as GeneratedSectionOutline;

            if (!outlineResult.sections?.length) {
                toast({ variant: "destructive", title: "Outline Generation Failed", description: "AI did not return suggested sections." });
                 setIsGeneratingOutline(false);
                return;
            }

            // Set the previewed outline instead of applying directly
            setPreviewedOutline(outlineResult);
            toast({ title: "Outline Preview Generated", description: `Review the proposed outline below and click "Apply Outline".` });


        } catch (error) {
            console.error("Outline generation failed:", error);
            toast({ variant: "destructive", title: "Outline Generation Failed", description: error instanceof Error ? error.message : "Could not generate sections." });
        } finally {
            setIsGeneratingOutline(false);
        }
    }, [project, isGenerating, isSummarizing, isGeneratingOutline, isSuggesting, toast]);


   // Handle click on the "Generate TOC" button, includes context check
    const handleGenerateTocClick = () => {
        if (!project || isGenerating || isSummarizing || isGeneratingOutline || isSuggesting) return;

        const contextLength = project.projectContext?.trim().length || 0;
        const contextWords = project.projectContext?.trim().split(/\s+/).filter(Boolean).length || 0;

        if (contextLength < MIN_CONTEXT_LENGTH || contextWords < MIN_CONTEXT_WORDS) {
            setShowOutlineContextAlert(true);
        } else {
            proceedWithOutlinePreviewGeneration(); // Generate the preview
        }
    };


  // Get AI suggestions for improvement
    const handleGetSuggestions = async () => {
     if (!project || isGenerating || isSummarizing || isGeneratingOutline || isSuggesting) return;

     setIsSuggesting(true);
     setSuggestions(null);
     try {
        const flattenSections = (sections: HierarchicalProjectSection[], level = 0): string => {
            return sections.map(s =>
                `${'#'.repeat(level + 2)} ${s.name}\n\n${s.content || '[Empty Section]'}\n\n` +
                (s.subSections ? flattenSections(s.subSections, level + 1) : '')
            ).join('---\n\n');
        };

       // Use the currently applied sections (not the preview) for suggestions
       const currentSectionsContent = project.sections ? flattenSections(project.sections) : '';

       const suggestionActionInput = {
         projectTitle: project.title,
         projectContext: project.projectContext,
         allSectionsContent: currentSectionsContent, // Use current content
         focusArea: suggestionInput || undefined,
         existingSections: project.sections.map(s => s.name).join(', '),
         projectType: project.projectType,
       };

       const result = await suggestImprovementsAction(suggestionActionInput);

       if ('error' in result) {
         throw new Error(result.error);
       }

       setSuggestions(result.suggestions);
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
         }), true);
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
        }), true);
        toast({ title: "Section Deleted" });
        setSectionToDelete(null);
        if (activeSectionId === sectionToDelete) {
            handleSetActiveSection(String(-1));
        }
    };

   // Cancel deletion from dialog
    const cancelDeleteSection = () => {
        setSectionToDelete(null);
    };

    // Handler for adding a NEW top-level section
     const handleAddNewSection = () => {
         if (!project) return;
         const newSection: HierarchicalProjectSection = {
             id: uuidv4(),
             name: `New Section ${project.sections.length + 1}`,
             prompt: `Generate content for this new section.`,
             content: '',
             lastGenerated: undefined,
             subSections: [],
         };
         updateProject(prev => ({
             ...prev,
             sections: [...prev.sections, newSection],
         }), true);
         toast({ title: "Section Added", description: `"${newSection.name}" added.` });
         setActiveSectionId(newSection.id); // Optionally activate the new section
         setPreviewedOutline(null); // Clear preview if adding manually
     };


  // --- Placeholder Actions ---
  const handleSaveOnline = () => {
     if (!project) return;
     toast({ title: "Save Online (Coming Soon)", description: "This will save your project to the cloud." });
     // updateProject({ storageType: 'cloud' }, true); // Example state update
  };

   const handleNavigateToExport = () => {
     if (project) {
       router.push(`/project/${projectId}/export`);
     } else {
        toast({ variant: "destructive", title: "Navigation Error", description: "Project data not found." });
     }
   };

   // --- Diagram Generator Specific Handler for Section Editor ---
  const handleDiagramGeneratedInSection = (mermaidCode: string) => {
    if (!project || !activeSectionId) return;

    const section = findSectionById(project.sections, activeSectionId);
    if (!section) return;

    updateProject(prev => ({
        ...prev,
        sections: updateSectionById(prev.sections, activeSectionId!, {
            content: mermaidCode,
            lastGenerated: new Date().toISOString(),
        }),
    }), true);

    toast({ title: 'Diagram Code Saved', description: `Mermaid code saved for "${section.name}".` });
  };


   // --- FAB Drag Handlers ---
  const onFabMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    const target = fabRef.current;
    if (!target) return;

    setIsDraggingFab(true);
    const rect = target.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    target.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none'; // Prevent text selection during drag
    e.preventDefault();
  };

  const onFabMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingFab || !fabRef.current) return;

     const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
     const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

    let newX = e.clientX - dragOffset.current.x;
    let newY = e.clientY - dragOffset.current.y;

    const fabWidth = fabRef.current.offsetWidth;
    const fabHeight = fabRef.current.offsetHeight;
    const margin = 16; // Same as Tailwind's space-4

    // Constrain movement within viewport boundaries
    newX = Math.max(margin, Math.min(newX, vw - fabWidth - margin));
    newY = Math.max(margin, Math.min(newY, vh - fabHeight - margin));

    setFabPosition({ x: newX, y: newY });
  }, [isDraggingFab]);

  const onFabMouseUp = useCallback(() => {
    if (isDraggingFab) {
      setIsDraggingFab(false);
      if (fabRef.current) {
        fabRef.current.style.cursor = 'grab';
      }
      document.body.style.userSelect = ''; // Re-enable text selection
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
    };
    return () => {
      window.removeEventListener('mousemove', onFabMouseMove);
      window.removeEventListener('mouseup', onFabMouseUp);
      document.body.style.userSelect = ''; // Ensure cleanup on unmount
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
  let isDiagramSection = false; // Flag for diagram sections

  const activeSection = activeSectionId ? findSectionById(project.sections, activeSectionId) : null;
  const standardPageIndex = !isNaN(parseInt(activeSectionId ?? '', 10)) ? parseInt(activeSectionId!, 10) : NaN;

  if (activeSection) {
      isDiagramSection = activeSection.name.toLowerCase().startsWith("diagram:") || activeSection.name.toLowerCase().startsWith("figure");
  }

    if (activeSectionId === String(-1)) {
      // Display Project Details Form
      activeViewName = 'Project Details';
      activeViewContent = (
            <Card className="shadow-md mb-6">
              <CardHeader>
                <CardTitle className="text-glow-primary text-xl md:text-2xl">Project Details</CardTitle>
                <CardDescription>Edit general information. Context helps AI generate relevant sections.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Title */}
                <div>
                  <Label htmlFor="projectTitleMain">Project Title *</Label>
                  <Input id="projectTitleMain" value={project.title} onChange={(e) => handleProjectDetailChange('title', e.target.value)} onBlur={handleProjectDetailBlur} placeholder="Enter Project Title" className="mt-1 focus-visible:glow-primary" required />
                </div>
                 {/* Project Type Toggle */}
                <div className="space-y-2">
                    <Label>Project Type</Label>
                    <RadioGroup value={project.projectType} onValueChange={(value: 'mini-project' | 'internship') => handleProjectTypeChange(value)} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <div className="flex items-center space-x-2"> <RadioGroupItem value="mini-project" id="type-mini" /> <Label htmlFor="type-mini" className="cursor-pointer">Mini Project</Label> </div>
                      <div className="flex items-center space-x-2"> <RadioGroupItem value="internship" id="type-internship" /> <Label htmlFor="type-internship" className="cursor-pointer">Internship</Label> </div>
                    </RadioGroup>
                </div>
                 {/* Project Context */}
                <div>
                  <Label htmlFor="projectContext">Project Context *</Label>
                  <Textarea id="projectContext" value={project.projectContext} onChange={(e) => handleProjectDetailChange('projectContext', e.target.value)} onBlur={handleProjectDetailBlur} placeholder="Briefly describe your project, goals, scope, technologies..." className="mt-1 min-h-[120px] focus-visible:glow-primary" required />
                  <p className="text-xs text-muted-foreground mt-1">Crucial for AI section generation ({MIN_CONTEXT_WORDS}+ words, {MIN_CONTEXT_LENGTH}+ chars recommended).</p>
                </div>
                 {/* Section Limits Counters */}
                 <div className="grid grid-cols-2 gap-4">
                     <CounterInput
                         label="Min Sections"
                         value={project.minSections ?? 5} // Use default if undefined
                         onChange={(val) => handleProjectDetailChange('minSections', val)}
                         onBlur={handleProjectDetailBlur}
                         min={1}
                     />
                     <CounterInput
                         label="Max Sub-Section Depth"
                         value={project.maxSubSectionsPerSection ?? 2} // Use default if undefined
                         onChange={(val) => handleProjectDetailChange('maxSubSectionsPerSection', val)}
                         onBlur={handleProjectDetailBlur}
                         min={0}
                     />
                 </div>
                 <p className="text-xs text-muted-foreground -mt-4">Control AI outline generation limits. Min sections aims for at least this many top-level sections. Max depth limits sub-section nesting (0=none, 1=1.1, 2=1.1.1).</p>

                 {/* Logos */}
                <div className="grid grid-cols-2 gap-4 md:gap-6">
                    <LogoUpload label="University Logo" logoUrl={project.universityLogoUrl} field="universityLogoUrl" onUpload={handleLogoUpload} onRemove={handleRemoveLogo} isUploading={isUploadingLogo.universityLogoUrl} />
                    <LogoUpload label="College Logo" logoUrl={project.collegeLogoUrl} field="collegeLogoUrl" onUpload={handleLogoUpload} onRemove={handleRemoveLogo} isUploading={isUploadingLogo.collegeLogoUrl} />
                </div>
                {/* Institute, Branch, Semester, Subject */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div> <Label htmlFor="instituteName">Institute Name</Label> <Input id="instituteName" value={project.instituteName || ''} onChange={(e) => handleProjectDetailChange('instituteName', e.target.value)} onBlur={handleProjectDetailBlur} placeholder="e.g., L. D. College of Engineering" className="mt-1"/> </div>
                  <div> <Label htmlFor="branch">Branch</Label> <Input id="branch" value={project.branch || ''} onChange={(e) => handleProjectDetailChange('branch', e.target.value)} onBlur={handleProjectDetailBlur} placeholder="e.g., Computer Engineering" className="mt-1"/> </div>
                  <div> <Label htmlFor="semester">Semester</Label> <Input id="semester" value={project.semester || ''} onChange={(e) => handleProjectDetailChange('semester', e.target.value)} onBlur={handleProjectDetailBlur} placeholder="e.g., 5" type="number" className="mt-1"/> </div>
                  <div> <Label htmlFor="subject">Subject</Label> <Input id="subject" value={project.subject || ''} onChange={(e) => handleProjectDetailChange('subject', e.target.value)} onBlur={handleProjectDetailBlur} placeholder="e.g., Design Engineering - 1A" className="mt-1"/> </div>
                </div>
                <Separator />
                {/* Team ID, Guide Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <CardFooter className="flex flex-col items-start gap-4">
                 <Button variant="default" size="sm" onClick={handleGenerateTocClick} disabled={isGeneratingOutline || isGenerating || isSummarizing || isSuggesting || !project.projectContext?.trim()} className="hover:glow-primary focus-visible:glow-primary">
                    {isGeneratingOutline ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                    {isGeneratingOutline ? 'Generating Outline...' : 'Generate Outline Preview'}
                 </Button>
                 {/* Outline Preview Section */}
                 {previewedOutline && (
                     <div className="w-full p-4 border rounded-md bg-muted/30 space-y-3">
                         <h4 className="font-semibold text-foreground">Generated Outline Preview:</h4>
                         <ScrollArea className="max-h-60">
                            {previewedOutline.sections.map((item, index) => (
                                <OutlinePreviewItem key={`preview-${index}`} item={item} level={0} />
                            ))}
                         </ScrollArea>
                         <div className="flex gap-2">
                             <Button
                                 variant="default"
                                 size="sm"
                                 onClick={applyGeneratedOutline}
                                 disabled={isGeneratingOutline}
                                 className="hover:glow-accent focus-visible:glow-accent"
                             >
                                 <CheckCircle className="mr-2 h-4 w-4" /> Apply Outline
                             </Button>
                              <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={() => setPreviewedOutline(null)}
                                 disabled={isGeneratingOutline}
                              >
                                  Discard Preview
                              </Button>
                         </div>
                     </div>
                 )}
              </CardFooter>
            </Card>
      );
    } else if (!isNaN(standardPageIndex) && standardPageIndex < -1) {
        const standardPageEntry = Object.entries(STANDARD_PAGE_INDICES).find(([, index]) => index === standardPageIndex);
        activeViewName = standardPageEntry ? standardPageEntry[0] : 'Standard Page';
        isStandardPage = true;
        activeViewContent = <StandardPagePlaceholder pageName={activeViewName} />;
    } else if (activeSection) {
        activeViewName = activeSection.name;

        if (isDiagramSection) {
             // Display Diagram Editor/Generator View
             activeViewContent = (
                <div className="space-y-6">
                    <Card className="shadow-md">
                      <CardHeader>
                        <CardTitle className="text-primary text-glow-primary flex items-center gap-2 text-lg md:text-xl"> <Projector className="w-5 h-5"/> {activeSection.name} - Diagram</CardTitle>
                        {activeSection.lastGenerated && ( <CardDescription className="text-xs md:text-sm">Last generated: {new Date(activeSection.lastGenerated).toLocaleString()}</CardDescription> )}
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">Use the AI generator below to create the diagram content. The generated Mermaid code will be stored.</p>
                        <AiDiagramGenerator onDiagramGenerated={handleDiagramGeneratedInSection} />
                        <Button onClick={() => handleGenerateSection(activeSection.id)} disabled={isGeneratingDiagram || isGenerating || isSummarizing || isGeneratingOutline || isSuggesting} className="hover:glow-primary focus-visible:glow-primary mt-2">
                          {isGeneratingDiagram ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
                          {isGeneratingDiagram ? 'Generating Diagram...' : 'Generate/Update Diagram with AI'}
                        </Button>
                         {activeSection.content && (
                            <div className="mt-4 space-y-2">
                                <Label>Current Diagram:</Label>
                                <MermaidDiagram chart={activeSection.content} id={`diagram-${activeSection.id}`} />
                                <details className="mt-2 text-xs">
                                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Show Mermaid Code</summary>
                                    <pre className="mt-1 p-2 bg-muted rounded-md text-muted-foreground overflow-x-auto max-h-40 text-[10px] md:text-xs">
                                      <code>{activeSection.content}</code>
                                    </pre>
                                </details>
                            </div>
                         )}
                      </CardContent>
                    </Card>
                </div>
             );
        } else {
            // Display Regular Section Editor (Text + Preview)
            activeViewContent = (
                <div className="space-y-6">
                    <Card className="shadow-md">
                      <CardHeader>
                        <CardTitle className="text-primary text-glow-primary text-lg md:text-xl">{activeSection.name} - AI Prompt</CardTitle>
                        {activeSection.lastGenerated && ( <CardDescription className="text-xs md:text-sm">Last generated: {new Date(activeSection.lastGenerated).toLocaleString()}</CardDescription> )}
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor={`section-prompt-${activeSection.id}`}>Generation Prompt</Label>
                          <Textarea id={`section-prompt-${activeSection.id}`} value={activeSection.prompt} onChange={(e) => handleSectionPromptChange(activeSection.id, e.target.value)} onBlur={handleSectionPromptBlur} placeholder="Instructions for the AI..." className="mt-1 min-h-[100px] font-mono text-sm focus-visible:glow-primary" />
                        </div>
                        <Button onClick={() => handleGenerateSection(activeSection.id)} disabled={isGenerating || isSummarizing || isGeneratingOutline || isSuggesting || isGeneratingDiagram} className="hover:glow-primary focus-visible:glow-primary">
                          {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                          {isGenerating ? 'Generating...' : 'Generate Content'}
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Content Editor and Preview */}
                    <Card className="shadow-md mb-6">
                       <CardHeader>
                         <CardTitle className="text-lg md:text-xl">{activeSection.name} - Content</CardTitle>
                         <CardDescription className="text-sm">Edit the content using Markdown and preview the output.</CardDescription>
                       </CardHeader>
                       <CardContent>
                         <Tabs defaultValue="edit" className="w-full">
                           <TabsList className="grid w-full grid-cols-2 mb-4">
                             <TabsTrigger value="edit">Edit</TabsTrigger>
                             <TabsTrigger value="preview">Preview</TabsTrigger>
                           </TabsList>
                           <TabsContent value="edit" className="space-y-4">
                               {/* Reduced height on mobile */}
                               <Textarea id={`section-content-${activeSection.id}`} value={activeSection.content} onChange={(e) => handleSectionContentChange(activeSection.id, e.target.value)} onBlur={handleSectionContentBlur} placeholder={"Generated content appears here. Use Markdown..."} className="min-h-[300px] md:min-h-[400px] text-sm md:text-base focus-visible:glow-primary font-mono" />
                           </TabsContent>
                           <TabsContent value="preview">
                               <MarkdownPreview content={activeSection.content || ''} />
                           </TabsContent>
                         </Tabs>
                       </CardContent>
                       <CardFooter className="flex justify-end">
                         <Button variant="outline" size="sm" onClick={() => handleSummarizeSection(activeSection.id)} disabled={isSummarizing || isGenerating || isGeneratingOutline || isSuggesting || !activeSection.content?.trim()} className="hover:glow-accent focus-visible:glow-accent">
                           {isSummarizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScrollText className="mr-2 h-4 w-4" />}
                           {isSummarizing ? 'Summarizing...' : 'Summarize'}
                         </Button>
                       </CardFooter>
                    </Card>
                </div>
            );
        }
    } else {
        // Placeholder if no section is selected
        activeViewContent = (
            <div className="flex items-center justify-center h-full p-4">
               <Card className="text-center py-8 px-6 max-w-md mx-auto shadow-md">
                  <CardHeader>
                    <CardTitle className="text-xl text-primary text-glow-primary">Select or Generate Sections</CardTitle>
                    <CardDescription className="mt-2 text-sm">Choose an item from the sidebar or generate sections if none exist.</CardDescription>
                  </CardHeader>
                  <CardContent className="mt-4 space-y-4">
                     <p className="text-sm">Go to <Button variant="link" className="p-0 h-auto text-base" onClick={() => handleSetActiveSection(String(-1))}>Project Details</Button>, provide context, then click "Generate Outline Preview".</p>
                    <Button variant="default" size="sm" onClick={handleGenerateTocClick} disabled={isGeneratingOutline || isGenerating || isSummarizing || isSuggesting || !project.projectContext?.trim()} className="hover:glow-primary focus-visible:glow-primary">
                      {isGeneratingOutline ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                      {isGeneratingOutline ? 'Generating...' : 'Generate Outline Preview'}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-3">The AI will create a proposed outline based on your project context.</p>
                  </CardContent>
                </Card>
            </div>
        );
    }

  // Main Editor Layout using Sheet for mobile sidebar
  return (
    <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
      <div className="flex h-full relative"> {/* Ensure relative for FAB positioning */}

        {/* --- Sidebar Area --- */}
        {/* Mobile: Sidebar inside Sheet */}
        <SheetContent side="left" className="p-0 w-72 sm:w-80 bg-card md:hidden"> {/* Adjust width */}
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Project Menu</SheetTitle>
            <SheetDescription>Navigate and manage your project.</SheetDescription>
          </SheetHeader>
          {/* Pass close handler to sidebar content */}
          <ProjectSidebarContent
            project={project}
            updateProject={updateProject}
            activeSectionId={activeSectionId}
            setActiveSectionId={handleSetActiveSection} // Already closes sheet
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
            handleAddNewSection={handleAddNewSection} // Pass the handler
          />
        </SheetContent>

        {/* Desktop: Static Sidebar */}
        <div className={cn(
             "hidden md:flex md:flex-col transition-all duration-300 ease-in-out overflow-y-auto overflow-x-hidden",
             "w-72 lg:w-80 border-r bg-card" // Slightly wider on desktop
         )}>
            <ProjectSidebarContent
                project={project}
                updateProject={updateProject}
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
                handleAddNewSection={handleAddNewSection} // Pass the handler
            />
        </div>

        {/* --- Main Content Area --- */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-2 sm:gap-4 border-b bg-background/95 backdrop-blur-sm px-3 sm:px-4 lg:px-6 flex-shrink-0">
            {/* Header Title */}
            <h1 className="flex-1 text-base sm:text-lg font-semibold md:text-xl text-primary truncate text-glow-primary">
               {activeViewName}
            </h1>
             {/* Storage Status */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto mr-1 sm:mr-2" title={`Project stored ${project.storageType === 'local' ? 'locally' : 'in the cloud'}`}>
              {project.storageType === 'local' ? <CloudOff className="h-4 w-4" /> : <Cloud className="h-4 w-4 text-green-500" />}
              <span className="hidden sm:inline">{project.storageType === 'local' ? 'Local' : 'Cloud'}</span>
            </div>
             {/* Export Button */}
            <Button variant="outline" size="sm" onClick={handleNavigateToExport} className="hover:glow-accent focus-visible:glow-accent text-xs px-2 sm:px-3 py-1 h-auto">
              <Download className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Export</span> Report
            </Button>
             {/* Back to Dashboard Button - More prominent */}
             <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="text-xs px-2 sm:px-3 py-1 h-auto">
                <Home className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4"/> Dashboard
             </Button>
          </header>

          <ScrollArea className="flex-1 p-3 sm:p-4 md:p-6">
              {activeViewContent}
             {/* AI Suggestions Section */}
             <Card className="shadow-md mt-6">
                 <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg md:text-xl text-primary text-glow-primary"><Sparkles className="w-5 h-5" /> AI Suggestions</CardTitle>
                    <CardDescription className="text-sm">Ask the AI for feedback on your report. Provide specific focus areas for targeted suggestions based on the current sections.</CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="suggestion-input">Focus area (Optional)</Label>
                        <Input id="suggestion-input" value={suggestionInput} onChange={(e) => setSuggestionInput(e.target.value)} placeholder="e.g., Improve flow, Check clarity, Add technical details..." className="mt-1 focus-visible:glow-primary" />
                    </div>
                    <Button onClick={handleGetSuggestions} disabled={isSuggesting || isGenerating || isSummarizing || isGeneratingOutline || isGeneratingDiagram} className="hover:glow-primary focus-visible:glow-primary">
                        {isSuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquareQuote className="mr-2 h-4 w-4" />}
                        {isSuggesting ? 'Getting Suggestions...' : 'Get Suggestions'}
                    </Button>
                    {suggestions && (
                        <div className="mt-4 p-4 border rounded-md bg-muted/30">
                            <h4 className="font-semibold mb-2 text-foreground">Suggestions:</h4>
                            <div className="prose prose-sm max-w-none dark:prose-invert text-foreground" dangerouslySetInnerHTML={{ __html: marked.parse(suggestions) }} />
                        </div>
                    )}
                 </CardContent>
             </Card>
          </ScrollArea>
        </div>

        {/* Floating Action Button (FAB) for Mobile Sidebar */}
         <SheetTrigger asChild>
             <Button
                 ref={fabRef}
                 variant="default"
                 size="icon"
                 className={cn(
                     "fixed z-20 rounded-full shadow-lg w-12 h-12 sm:w-14 sm:h-14 hover:glow-primary focus-visible:glow-primary cursor-grab active:cursor-grabbing",
                     "md:hidden" // Hide FAB on medium screens and up
                 )}
                 style={{ left: `${fabPosition.x}px`, top: `${fabPosition.y}px`, position: 'fixed' }}
                 onMouseDown={onFabMouseDown}
                 onClick={(e) => {
                     // Only trigger sheet open if not dragging
                     if (!isDraggingFab) {
                        setIsMobileSheetOpen(true);
                     }
                 }}
                 title="Open project menu"
                 aria-label="Open project menu"
             >
                 <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
             </Button>
         </SheetTrigger>


        <AlertDialog open={showOutlineContextAlert} onOpenChange={setShowOutlineContextAlert}>
          <AlertDialogContent>
            <AlertDialogHeader> <AlertDialogTitle>Project Context May Be Limited</AlertDialogTitle> <AlertDialogDescription> The project context is short ({project?.projectContext?.trim().split(/\s+/).filter(Boolean).length || 0} words). Generating an accurate outline might be difficult. Consider adding more details. Proceed anyway? </AlertDialogDescription> </AlertDialogHeader>
            <AlertDialogFooter> <AlertDialogCancel>Cancel</AlertDialogCancel> <AlertDialogAction onClick={proceedWithOutlinePreviewGeneration}>Generate Anyway</AlertDialogAction> </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

         <AlertDialog open={!!sectionToDelete} onOpenChange={(open) => !open && setSectionToDelete(null)}>
           <AlertDialogContent>
             <AlertDialogHeader> <AlertDialogTitle>Delete Section?</AlertDialogTitle> <AlertDialogDescription> Are you sure you want to delete "{sectionToDelete ? findSectionById(project.sections, sectionToDelete)?.name : ''}" and its sub-sections? This cannot be undone. </AlertDialogDescription> </AlertDialogHeader>
             <AlertDialogFooter> <AlertDialogCancel onClick={cancelDeleteSection}>Cancel</AlertDialogCancel> <AlertDialogAction onClick={confirmDeleteSection} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction> </AlertDialogFooter>
           </AlertDialogContent>
         </AlertDialog>
      </div>
    </Sheet>
  );
}


// Helper function to validate the structure of the generated outline
const validateOutlineStructure = (sections: any[] | undefined): sections is OutlineSection[] => {
    if (!Array.isArray(sections)) {
        console.warn("Validation failed: Main sections property is not an array.");
        return false;
    }
    return sections.every(section => {
        if (typeof section !== 'object' || !section || typeof section.name !== 'string' || !section.name.trim()) {
            console.warn("Validation failed: Section missing name or is not an object:", section);
            return false;
        }
        if (section.hasOwnProperty('subSections')) {
            if (!Array.isArray(section.subSections)) {
                console.warn("Validation failed: subSections exists but is not an array:", section);
                return false;
            }
            if (!validateOutlineStructure(section.subSections)) {
                 console.warn("Validation failed: Invalid structure within subSections of:", section.name);
                 return false;
            }
        }
        return true;
    });
};