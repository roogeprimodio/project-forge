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
import { BookOpen, Settings, ChevronLeft, Save, Loader2, Wand2, ScrollText, List, Download, Lightbulb, FileText, Cloud, CloudOff, Home, Menu, Undo, MessageSquareQuote, Sparkles, UploadCloud, XCircle, ShieldAlert, FileWarning } from 'lucide-react'; // Added icons
import Link from 'next/link';
import type { Project, ProjectSection } from '@/types/project';
import { STANDARD_REPORT_PAGES, TOC_SECTION_NAME } from '@/types/project'; // Import standard pages
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useToast } from '@/hooks/use-toast';
import { generateSectionAction, summarizeSectionAction, generateOutlineAction, suggestImprovementsAction } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { marked } from 'marked'; // For rendering markdown suggestions
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface ProjectEditorProps {
  projectId: string;
}

// Minimum character length considered "sufficient" for context
const MIN_CONTEXT_LENGTH = 50;
const MAX_HISTORY_LENGTH = 10; // Limit undo history

// Assign negative indices to standard pages for sidebar identification
const STANDARD_PAGE_INDICES: { [key: string]: number } = {};
STANDARD_REPORT_PAGES.forEach((page, index) => {
  STANDARD_PAGE_INDICES[page] = -(index + 2); // Start from -2 (-1 is Project Details)
});

// New component for the local sidebar content (details, Standard Pages, ToC, actions)
function ProjectSidebarContent({
    project,
    activeSectionIndex,
    setActiveSectionIndex,
    handleGenerateTocClick,
    isGeneratingOutline,
    isGenerating,
    isSummarizing,
    isSuggesting,
    handleSaveOnline,
    canUndo,
    handleUndo,
    onCloseSheet
}: {
    project: Project;
    activeSectionIndex: number | null; // Includes negative indices for standard pages
    setActiveSectionIndex: (index: number) => void; // Now only accepts number
    handleGenerateTocClick: () => void;
    isGeneratingOutline: boolean;
    isGenerating: boolean;
    isSummarizing: boolean;
    isSuggesting: boolean;
    handleSaveOnline: () => void;
    canUndo: boolean;
    handleUndo: () => void;
    onCloseSheet?: () => void;
}) {
     const handleSectionClick = (index: number) => {
        setActiveSectionIndex(index);
        onCloseSheet?.(); // Close sheet on selection (mobile)
     };

     return (
        <div className="flex flex-col h-full border-r bg-card">
            <div className="p-4 border-b flex justify-between items-center">
                 <Input
                        id="projectTitleSidebar"
                        value={project.title}
                        readOnly
                        className="h-8 text-base font-semibold bg-transparent border-0 shadow-none focus-visible:ring-0 p-0 truncate flex-1 mr-2"
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
             <ScrollArea className="flex-1 px-2 py-2">
                 <nav className="flex flex-col gap-1">
                     {/* Project Details Button */}
                     <Button
                         variant={activeSectionIndex === -1 ? "secondary" : "ghost"}
                         size="sm"
                         onClick={() => handleSectionClick(-1)}
                         className="justify-start"
                         aria-current={activeSectionIndex === -1 ? "page" : undefined}
                     >
                         <Settings className="mr-2 h-4 w-4" />
                         Project Details
                     </Button>
                     <Separator className="my-2" />

                     {/* Standard Report Pages */}
                     <p className="px-2 text-xs font-semibold text-muted-foreground mb-1">STANDARD PAGES</p>
                     {STANDARD_REPORT_PAGES.map((pageName) => {
                        const pageIndex = STANDARD_PAGE_INDICES[pageName];
                        // Skip rendering TOC button here if it's managed by the sections list below
                        if (pageName === TOC_SECTION_NAME && project.sections.some(s => s.name === TOC_SECTION_NAME)) {
                            return null;
                        }
                        return (
                            <Button
                                key={pageName}
                                variant={activeSectionIndex === pageIndex ? "secondary" : "ghost"}
                                size="sm"
                                onClick={() => handleSectionClick(pageIndex)}
                                className="justify-start truncate"
                                aria-current={activeSectionIndex === pageIndex ? "page" : undefined}
                                title={pageName}
                            >
                                <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
                                <span className="truncate">{pageName}</span>
                            </Button>
                        );
                     })}

                     <Separator className="my-2" />

                      {/* Table of Contents (Generated Sections List) */}
                      <p className="px-2 text-xs font-semibold text-muted-foreground mb-1">REPORT SECTIONS</p>
                       {project.sections?.length > 0 ? (
                          project.sections.map((section, index) => (
                            <Button
                                key={`${section.name}-${index}`}
                                variant={activeSectionIndex === index ? "secondary" : "ghost"}
                                size="sm"
                                onClick={() => handleSectionClick(index)} // Use index >= 0 for regular sections
                                className="justify-start truncate"
                                aria-current={activeSectionIndex === index ? "page" : undefined}
                            >
                                <FileText className="mr-2 h-4 w-4 flex-shrink-0"/>
                                <span className="truncate">{section.name}</span>
                            </Button>
                          ))
                       ) : (
                         <p className="px-2 text-xs text-muted-foreground italic">Generate a ToC to populate sections.</p>
                       )}

                 </nav>
             </ScrollArea>
             <div className="p-4 border-t space-y-2">
                 {/* Generate/Update Outline Button */}
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
                     disabled={project.storageType === 'cloud'} // Example disabled state
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
                    "aspect-square h-32" // Consistent height, aspect-square ensures width adjusts
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

// Component to display placeholder for standard pages
const StandardPagePlaceholder = ({ pageName }: { pageName: string }) => (
    <Card className="shadow-md mb-6">
        <CardHeader>
            <CardTitle className="text-primary text-glow-primary flex items-center gap-2">
                <FileWarning className="w-5 h-5 text-amber-500" /> {pageName}
            </CardTitle>
            <CardDescription>
                This is a standard report page. Its content is typically generated automatically based on project details or requires specific formatting.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 min-h-[200px] flex flex-col items-center justify-center text-center">
            <ShieldAlert className="w-12 h-12 text-muted-foreground opacity-50 mb-4" />
            <p className="text-muted-foreground">
                Content for the "{pageName}" is usually auto-generated during the export process or needs manual creation following specific guidelines (like certificates).
            </p>
            <p className="text-xs text-muted-foreground">
                (Direct editing is not available for this standard page type in the editor.)
            </p>
        </CardContent>
    </Card>
);


export function ProjectEditor({ projectId }: ProjectEditorProps) {
  const [projects, setProjects] = useLocalStorage<Project[]>('projects', []);
  const { toast } = useToast();
  const [activeSectionIndex, setActiveSectionIndex] = useState<number | null>(null); // null initially, -1 for Details, <-1 for standard, >=0 for sections
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

  // Undo/Redo state
  const [history, setHistory] = useState<Project[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const isUpdatingHistory = useRef(false);

  // Floating Action Button state
  const [fabPosition, setFabPosition] = useState({ x: 0, y: 0 });
  const [isDraggingFab, setIsDraggingFab] = useState(false);
  const fabRef = useRef<HTMLButtonElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });


  // Mark as mounted on client
  useEffect(() => {
    setHasMounted(true);
     // Initialize FAB position (bottom right corner)
     if (fabRef.current?.parentElement) {
         const parentRect = fabRef.current.parentElement.getBoundingClientRect();
         const fabWidth = fabRef.current.offsetWidth || 56; // Default width if not rendered yet
         const fabHeight = fabRef.current.offsetHeight || 56; // Default height
         const initialX = parentRect.width - fabWidth - 24; // 24px margin
         const initialY = parentRect.height - fabHeight - 24; // 24px margin
         setFabPosition({ x: initialX, y: initialY });
     } else {
         // Fallback if parent isn't available immediately
         const initialX = window.innerWidth - 80;
         const initialY = window.innerHeight - 80;
         setFabPosition({ x: initialX, y: initialY });
     }
  }, []);

  // Derived state: current project
  const project = useMemo(() => {
      if (historyIndex >= 0 && historyIndex < history.length) {
          return history[historyIndex];
      }
      const currentProjects = Array.isArray(projects) ? projects : [];
      return currentProjects.find(p => p.id === projectId);
  }, [projects, projectId, history, historyIndex]);


   // Effect to initialize history
  useEffect(() => {
    if (hasMounted && project && history.length === 0 && historyIndex === -1) {
        setHistory([project]);
        setHistoryIndex(0);
    }
  }, [project, hasMounted, history.length, historyIndex]);

  // Update project and history
  const updateProject = useCallback((updatedData: Partial<Project> | ((prev: Project) => Project), saveToHistory: boolean = true) => {
      if (!project && !(typeof updatedData === 'function')) return; // Need existing project or function updater

      isUpdatingHistory.current = true;

      setProjects((prevProjects = []) => {
        const currentProjectsArray = Array.isArray(prevProjects) ? prevProjects : [];
        const currentProjectIndex = currentProjectsArray.findIndex(p => p.id === projectId);

        // Determine the project to update (current one or the one from the functional update)
         let projectToUpdate: Project | undefined;
         if (currentProjectIndex !== -1) {
             projectToUpdate = currentProjectsArray[currentProjectIndex];
         } else if (typeof updatedData === 'function' && project) {
             // This case might be problematic if project is null, handle carefully
              projectToUpdate = project; // Use the project from useMemo if index not found but project exists
         }

         if (!projectToUpdate) {
             console.error("Project not found in setProjects during update");
             requestAnimationFrame(() => { isUpdatingHistory.current = false; });
             return currentProjectsArray;
         }


        const updatedProject = typeof updatedData === 'function'
            ? updatedData(projectToUpdate)
            : { ...projectToUpdate, ...updatedData, updatedAt: new Date().toISOString() };

        if (saveToHistory) {
            setHistory(prevHistory => {
                const newHistory = prevHistory.slice(0, historyIndex + 1);
                // Avoid adding duplicate states
                 if (newHistory.length === 0 || JSON.stringify(newHistory[newHistory.length - 1]) !== JSON.stringify(updatedProject)) {
                    newHistory.push(updatedProject);
                 }
                if (newHistory.length > MAX_HISTORY_LENGTH) {
                    newHistory.shift();
                }
                 // Update index to the latest state
                const newIndex = Math.min(newHistory.length - 1, MAX_HISTORY_LENGTH - 1);
                 setHistoryIndex(newIndex); // Always set to the new latest index
                return newHistory;
            });
        } else {
             // Only update the current state in history without adding a new entry
             setHistory(prevHistory => {
                 const newHistory = [...prevHistory];
                 if (historyIndex >= 0 && historyIndex < newHistory.length) {
                     // Only update if the data is actually different
                    if(JSON.stringify(newHistory[historyIndex]) !== JSON.stringify(updatedProject)) {
                         newHistory[historyIndex] = updatedProject;
                     }
                 }
                 return newHistory;
             });
        }

        const updatedProjects = [...currentProjectsArray];
        // Ensure we don't mutate the state if the project hasn't actually changed
        if (currentProjectIndex !== -1 && JSON.stringify(updatedProjects[currentProjectIndex]) !== JSON.stringify(updatedProject)) {
            updatedProjects[currentProjectIndex] = updatedProject;
             return updatedProjects;
        } else if (currentProjectIndex === -1) {
             // If project wasn't found initially (edge case), maybe add it?
             // Or handle error appropriately. For now, let's just return the original array.
             console.warn("ProjectEditor updateProject: Project index not found, state may not be saved correctly.")
             return currentProjectsArray;
        }
        return currentProjectsArray; // Return original array if no change

      });

      requestAnimationFrame(() => {
        isUpdatingHistory.current = false;
      });

  }, [project, historyIndex, setProjects, projectId]);

   // Effect to check if project exists and set initial state
   useEffect(() => {
    if (!hasMounted || projects === undefined || isUpdatingHistory.current) return;

    const currentProjects = Array.isArray(projects) ? projects : [];
    const projectExists = currentProjects.some(p => p.id === projectId);

    if (projectExists && isProjectFound !== true) {
      setIsProjectFound(true);
      if (activeSectionIndex === null) {
        setActiveSectionIndex(-1); // Default to Project Details
      }
    } else if (!projectExists && isProjectFound !== false) {
        setIsProjectFound(false);
        toast({
            variant: "destructive",
            title: "Project Not Found",
            description: `Project with ID ${projectId} seems missing. Returning to dashboard.`,
        });
        const timer = setTimeout(() => router.push('/'), 2000);
        return () => clearTimeout(timer);
    }
   }, [projectId, projects, activeSectionIndex, toast, router, isProjectFound, hasMounted]);

    // --- Undo/Redo Handlers ---
    const handleUndo = useCallback(() => {
        if (historyIndex > 0) {
            isUpdatingHistory.current = true;
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
             const undoneProject = history[newIndex];
             // Update the main projects array in localStorage WITHOUT adding to history again
             setProjects((prevProjects = []) => {
                  const currentProjectsArray = Array.isArray(prevProjects) ? prevProjects : [];
                  const projectIndex = currentProjectsArray.findIndex(p => p.id === projectId);
                  if (projectIndex !== -1) {
                      const updatedProjects = [...currentProjectsArray];
                      updatedProjects[projectIndex] = undoneProject;
                      return updatedProjects;
                  }
                  return currentProjectsArray;
              });
             toast({ title: "Undo successful" });
             // Use requestAnimationFrame to ensure state updates propagate before allowing next history change
             requestAnimationFrame(() => { isUpdatingHistory.current = false; });
        } else {
             toast({ variant: "destructive", title: "Nothing to undo" });
        }
    }, [historyIndex, history, setProjects, projectId, toast]);

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
    const validStringFields: (keyof Project)[] = ['title', 'projectContext', 'teamDetails', 'instituteName', 'collegeInfo', 'teamId', 'subject', 'semester', 'branch', 'guideName'];
    if (validStringFields.includes(field)) {
        updateProject({ [field]: value });
    } else {
        console.warn(`Attempted to update non-string/optional field ${String(field)} via handleProjectDetailChange`);
    }
  };

   const handleProjectTypeChange = (value: 'mini-project' | 'internship') => {
    if (!project) return;
    updateProject({ projectType: value });
  };

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
        updateProject({ [field]: reader.result as string });
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

  const handleRemoveLogo = (field: 'universityLogoUrl' | 'collegeLogoUrl') => {
       if (!project) return;
       updateProject({ [field]: undefined });
       toast({ title: 'Logo Removed', description: `${field === 'universityLogoUrl' ? 'University' : 'College'} logo removed.` });
   };


  const updateSectionsFromToc = useCallback((newSectionNames: string[]) => {
    if (!project) return;

    const existingSectionsMap = new Map(project.sections.map(s => [s.name.toLowerCase(), s]));
    const updatedSections: ProjectSection[] = [];
    let addedCount = 0;
    let preservedCount = 0;
    let sectionOrderChanged = false;
    let sectionsRemoved = false;

    const originalIndices = new Map(project.sections.map((s, i) => [s.name.toLowerCase(), i]));

    newSectionNames.forEach((name, newIndex) => {
        const trimmedName = name.trim();
        // Exclude standard pages and empty names from being added as regular sections
         // Keep TOC if it's explicitly generated
        if (!trimmedName || (STANDARD_REPORT_PAGES.map(p => p.toLowerCase()).includes(trimmedName.toLowerCase()) && trimmedName.toLowerCase() !== TOC_SECTION_NAME.toLowerCase())) return;


        const existingSection = existingSectionsMap.get(trimmedName.toLowerCase());

        if (existingSection) {
            updatedSections.push(existingSection);
            if (originalIndices.get(trimmedName.toLowerCase()) !== newIndex) {
                sectionOrderChanged = true;
            }
            existingSectionsMap.delete(trimmedName.toLowerCase());
            preservedCount++;
        } else {
            updatedSections.push({
                name: trimmedName,
                prompt: `Generate the ${trimmedName} section for the project titled "${project.title}". Consider the project context: ${project.projectContext || '[No context provided]'}. [Add more specific instructions here if needed]`,
                content: '',
                lastGenerated: undefined,
            });
            addedCount++;
            sectionOrderChanged = true;
        }
    });

     // Check if any non-standard sections were removed
     for (const [removedName] of existingSectionsMap.entries()) {
        if (!STANDARD_REPORT_PAGES.map(p => p.toLowerCase()).includes(removedName)) {
             sectionsRemoved = true;
             sectionOrderChanged = true; // Order changes if sections are removed
             break;
        }
     }

    if (addedCount === 0 && !sectionOrderChanged && !sectionsRemoved) {
        toast({ title: "Sections Unchanged", description: "The generated outline matches the current section structure." });
        return;
    }

    updateProject(prev => ({
        ...prev,
        sections: updatedSections,
    }), true); // Save this change to history

    let toastDescription = "Report sections updated.";
    if (addedCount > 0) toastDescription += ` ${addedCount} new section(s) added.`;
    if (preservedCount > 0) toastDescription += ` ${preservedCount} existing section(s) preserved.`;
    if (sectionsRemoved) toastDescription += ` Some sections removed.`;
    if (sectionOrderChanged && addedCount === 0 && !sectionsRemoved) toastDescription = "Section order updated.";

    toast({ title: "Sections Updated", description: toastDescription, duration: 7000 });

    // If the currently active section was removed, switch to Project Details
     const currentActiveSectionName = activeSectionIndex !== null && activeSectionIndex >= 0 && activeSectionIndex < project.sections.length ? project.sections[activeSectionIndex]?.name : null;
     if (currentActiveSectionName && sectionsRemoved && !updatedSections.some(s => s.name === currentActiveSectionName)) {
         setActiveSectionIndex(-1);
     } else if (updatedSections.length > 0 && activeSectionIndex === null) {
         // If sections were just added and nothing was selected, select the first section
         setActiveSectionIndex(0);
     }

    setIsMobileSheetOpen(false);

}, [project, updateProject, toast, setActiveSectionIndex, activeSectionIndex]);


  const handleGenerateSection = async (index: number) => {
    if (!project || index < 0 || index >= project.sections.length || isGenerating || isSummarizing || isGeneratingOutline || isSuggesting) return;

    const section = project.sections[index];
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

      if ('error' in result) throw new Error(result.error);

       updateProject(prev => {
           const updatedSections = [...prev.sections];
           updatedSections[index] = {
               ...updatedSections[index],
               content: result.reportSectionContent,
               lastGenerated: new Date().toISOString(),
           };
           return { ...prev, sections: updatedSections };
       }, true); // Save change to history


      toast({ title: "Section Generated", description: `"${section.name}" content updated.` });

    } catch (error) {
      console.error("Generation failed:", error);
      toast({ variant: "destructive", title: "Generation Failed", description: error instanceof Error ? error.message : "Could not generate content." });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSummarizeSection = async (index: number) => {
      if (!project || index < 0 || index >= project.sections.length || isGenerating || isSummarizing || isGeneratingOutline || isSuggesting) return;

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
          toast({ variant: "destructive", title: "Summarization Failed", description: error instanceof Error ? error.message : "Could not summarize." });
      } finally {
          setIsSummarizing(false);
      }
  };

  const proceedWithTocGeneration = useCallback(async () => {
    if (!project || isGenerating || isSummarizing || isGeneratingOutline || isSuggesting) return;

    setIsGeneratingOutline(true);
    try {
        const result = await generateOutlineAction({ projectTitle: project.title, projectContext: project.projectContext || '' });
        if ('error' in result) throw new Error(result.error);

        if (!result.suggestedSections?.length) {
             toast({ variant: "destructive", title: "Section Generation Failed", description: "AI did not return suggested sections." });
             setIsGeneratingOutline(false);
             return;
        }

        updateSectionsFromToc(result.suggestedSections);

    } catch (error) {
        console.error("Section generation failed:", error);
        toast({ variant: "destructive", title: "Section Generation Failed", description: error instanceof Error ? error.message : "Could not generate sections." });
    } finally {
        setIsGeneratingOutline(false);
    }
}, [project, isGenerating, isSummarizing, isGeneratingOutline, isSuggesting, updateSectionsFromToc, toast]);


    const handleGenerateTocClick = () => {
        if (!project || isGenerating || isSummarizing || isGeneratingOutline || isSuggesting) return;

        const contextLength = project.projectContext?.trim().length || 0;

        if (contextLength < MIN_CONTEXT_LENGTH) {
            setShowOutlineContextAlert(true);
        } else {
            proceedWithTocGeneration();
        }
    };

   const handleGetSuggestions = async () => {
     if (!project || isGenerating || isSummarizing || isGeneratingOutline || isSuggesting) return;

     setIsSuggesting(true);
     setSuggestions(null);
     try {
       const allSectionsContent = project.sections
         .map(s => `## ${s.name}\n\n${s.content || '[Empty Section]'}`)
         .join('\n\n---\n\n');

       const result = await suggestImprovementsAction({
         projectTitle: project.title,
         projectContext: project.projectContext,
         allSectionsContent: allSectionsContent,
         focusArea: suggestionInput || undefined,
       });

       if ('error' in result) throw new Error(result.error);

       setSuggestions(result.suggestions);
       toast({ title: "AI Suggestions Ready", description: "Suggestions for improvement generated." });

     } catch (error) {
       console.error("Suggestion generation failed:", error);
       toast({ variant: "destructive", title: "Suggestion Failed", description: error instanceof Error ? error.message : "Could not generate suggestions." });
     } finally {
       setIsSuggesting(false);
     }
   };


  const handleSaveOnline = () => {
     if (!project) return;
     toast({ title: "Save Online (Coming Soon)", description: "This will save your project to the cloud." });
     // Placeholder: Update storageType optimistically or after successful save
     // updateProject({ storageType: 'cloud' });
  };

   const handleNavigateToExport = () => {
     if (project) {
       router.push(`/project/${projectId}/export`);
     } else {
        toast({ variant: "destructive", title: "Navigation Error", description: "Project data not found." });
     }
   };


    // --- FAB Drag Handlers ---
    const onFabMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (e.button !== 0) return; // Only left click
        const target = fabRef.current;
        if (!target) return;
        setIsDraggingFab(true);
        const rect = target.getBoundingClientRect();
        dragOffset.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
        target.style.cursor = 'grabbing';
        e.preventDefault(); // Prevent text selection
    };

    const onFabMouseMove = useCallback((e: MouseEvent) => {
        if (!isDraggingFab || !fabRef.current) return;
        const parentRect = fabRef.current.parentElement?.getBoundingClientRect();
        if (!parentRect) return;

        let newX = e.clientX - dragOffset.current.x; // Use clientX/Y directly
        let newY = e.clientY - dragOffset.current.y;

        // Constrain within viewport bounds (considering FAB size)
        const fabWidth = fabRef.current.offsetWidth;
        const fabHeight = fabRef.current.offsetHeight;
         const margin = 16; // Keep FAB away from edges

        newX = Math.max(margin, Math.min(newX, window.innerWidth - fabWidth - margin));
        newY = Math.max(margin, Math.min(newY, window.innerHeight - fabHeight - margin));


        setFabPosition({ x: newX, y: newY });
    }, [isDraggingFab]);

    const onFabMouseUp = useCallback(() => {
        if (isDraggingFab && fabRef.current) {
            setIsDraggingFab(false);
            fabRef.current.style.cursor = 'grab';
        }
    }, [isDraggingFab]);

    // Add window listeners for FAB drag
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

   if (!hasMounted || isProjectFound === null) {
     return ( <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height,60px))] text-center p-4"><Loader2 className="h-16 w-16 animate-spin text-primary mb-4" /><p className="text-lg text-muted-foreground">Loading project...</p></div> );
   }

   if (isProjectFound === false || !project) {
       // This part should ideally not be reached due to the effect that redirects
       return ( <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height,60px))] text-center p-4"><CloudOff className="h-16 w-16 text-destructive mb-4" /><h2 className="text-2xl font-semibold text-destructive mb-2">Project Not Found</h2><p className="text-muted-foreground mb-6">The project with ID <code className="bg-muted px-1 rounded">{projectId}</code> could not be found.</p><Button onClick={() => router.push('/')}><Home className="mr-2 h-4 w-4" /> Go to Dashboard</Button></div> );
   }

   const activeSection = activeSectionIndex !== null && activeSectionIndex >= 0 && activeSectionIndex < project.sections.length
    ? project.sections[activeSectionIndex]
    : null;

   // Determine the name of the currently active view (Details, Standard Page, or Section)
    let activeViewName = project.title ?? 'Project';
    if (activeSectionIndex === -1) {
        activeViewName = 'Project Details';
    } else if (activeSectionIndex < -1) {
        // Find the standard page name corresponding to the negative index
        const standardPageEntry = Object.entries(STANDARD_PAGE_INDICES).find(([, index]) => index === activeSectionIndex);
        activeViewName = standardPageEntry ? standardPageEntry[0] : 'Standard Page';
    } else if (activeSection) {
        activeViewName = activeSection.name;
    }

  return (
    <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
      <div className="flex h-full relative"> {/* Added relative for FAB positioning context */}

        {/* Mobile: Sidebar inside Sheet */}
        <SheetContent side="left" className="p-0 w-64 bg-card md:hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>Project Menu</SheetTitle>
            <SheetDescription>Navigate project sections and details</SheetDescription>
          </SheetHeader>
          <ProjectSidebarContent
            project={project}
            activeSectionIndex={activeSectionIndex}
            setActiveSectionIndex={setActiveSectionIndex}
            handleGenerateTocClick={handleGenerateTocClick}
            isGeneratingOutline={isGeneratingOutline}
            isGenerating={isGenerating}
            isSummarizing={isSummarizing}
            isSuggesting={isSuggesting}
            handleSaveOnline={handleSaveOnline}
            canUndo={canUndo}
            handleUndo={handleUndo}
            onCloseSheet={() => setIsMobileSheetOpen(false)}
          />
        </SheetContent>

        {/* Desktop: Static Sidebar */}
        <div
          className={cn(
            "hidden md:flex md:flex-col transition-all duration-300 ease-in-out overflow-y-auto overflow-x-hidden",
            "w-64 border-r" // Fixed width for desktop sidebar
          )}
        >
           <ProjectSidebarContent
              project={project}
              activeSectionIndex={activeSectionIndex}
              setActiveSectionIndex={setActiveSectionIndex}
              handleGenerateTocClick={handleGenerateTocClick}
              isGeneratingOutline={isGeneratingOutline}
              isGenerating={isGenerating}
              isSummarizing={isSummarizing}
              isSuggesting={isSuggesting}
              handleSaveOnline={handleSaveOnline}
              canUndo={canUndo}
              handleUndo={handleUndo}
            />
        </div>

        {/* --- Main Content Area --- */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-4 lg:px-6 flex-shrink-0">
            <h1 className="flex-1 text-lg font-semibold md:text-xl text-primary truncate text-glow-primary">
              {activeViewName} {/* Use dynamic view name */}
            </h1>
            <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto mr-2" title={`Project stored ${project.storageType === 'local' ? 'locally' : 'in the cloud'}`}>
              {project.storageType === 'local' ? <CloudOff className="h-4 w-4" /> : <Cloud className="h-4 w-4 text-green-500" />}
              <span>{project.storageType === 'local' ? 'Local' : 'Cloud'}</span>
            </div>
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
              <Card className="shadow-md mb-6">
                <CardHeader>
                  <CardTitle className="text-glow-primary">Project Details</CardTitle>
                  <CardDescription>Edit general information. Context helps AI generate relevant sections.</CardDescription>
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

                   <div className="space-y-2">
                      <Label>Project Type</Label>
                      <RadioGroup
                        value={project.projectType}
                        onValueChange={(value: 'mini-project' | 'internship') => handleProjectTypeChange(value)}
                        className="flex items-center gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="mini-project" id="type-mini" />
                          <Label htmlFor="type-mini" className="cursor-pointer">Mini Project</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="internship" id="type-internship" />
                          <Label htmlFor="type-internship" className="cursor-pointer">Internship</Label>
                        </div>
                      </RadioGroup>
                    </div>

                  <div>
                    <Label htmlFor="projectContext">Project Context *</Label>
                    <Textarea
                      id="projectContext"
                      value={project.projectContext}
                      onChange={(e) => handleProjectDetailChange('projectContext', e.target.value)}
                      placeholder="Briefly describe your project, goals, scope, technologies..."
                      className="mt-1 min-h-[120px] focus-visible:glow-primary"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">Crucial for AI section generation.</p>
                  </div>

                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <LogoUpload
                          label="University Logo"
                          logoUrl={project.universityLogoUrl}
                          field="universityLogoUrl"
                          onUpload={handleLogoUpload}
                          onRemove={handleRemoveLogo}
                          isUploading={isUploadingLogo.universityLogoUrl}
                      />
                      <LogoUpload
                          label="College Logo"
                          logoUrl={project.collegeLogoUrl}
                          field="collegeLogoUrl"
                          onUpload={handleLogoUpload}
                          onRemove={handleRemoveLogo}
                          isUploading={isUploadingLogo.collegeLogoUrl}
                      />
                   </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="instituteName">Institute Name</Label>
                      <Input id="instituteName" value={project.instituteName || ''} onChange={(e) => handleProjectDetailChange('instituteName', e.target.value)} placeholder="e.g., L. D. College of Engineering" className="mt-1"/>
                    </div>
                    <div>
                      <Label htmlFor="branch">Branch</Label>
                      <Input id="branch" value={project.branch || ''} onChange={(e) => handleProjectDetailChange('branch', e.target.value)} placeholder="e.g., Computer Engineering" className="mt-1"/>
                    </div>
                    <div>
                      <Label htmlFor="semester">Semester</Label>
                      <Input id="semester" value={project.semester || ''} onChange={(e) => handleProjectDetailChange('semester', e.target.value)} placeholder="e.g., 5" type="number" className="mt-1"/>
                    </div>
                    <div>
                      <Label htmlFor="subject">Subject</Label>
                      <Input id="subject" value={project.subject || ''} onChange={(e) => handleProjectDetailChange('subject', e.target.value)} placeholder="e.g., Design Engineering - 1A" className="mt-1"/>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="teamId">Team ID</Label>
                      <Input id="teamId" value={project.teamId || ''} onChange={(e) => handleProjectDetailChange('teamId', e.target.value)} placeholder="Enter Team ID" className="mt-1"/>
                    </div>
                    <div>
                      <Label htmlFor="guideName">Faculty Guide Name</Label>
                      <Input id="guideName" value={project.guideName || ''} onChange={(e) => handleProjectDetailChange('guideName', e.target.value)} placeholder="Enter Guide's Name" className="mt-1"/>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="teamDetails">Team Details (Members & Enrollment)</Label>
                    <Textarea id="teamDetails" value={project.teamDetails} onChange={(e) => handleProjectDetailChange('teamDetails', e.target.value)} placeholder="John Doe - 123456789&#10;Jane Smith - 987654321" className="mt-1 min-h-[100px]"/>
                    <p className="text-xs text-muted-foreground mt-1">One member per line.</p>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button variant="default" size="sm" onClick={handleGenerateTocClick} disabled={isGeneratingOutline || isGenerating || isSummarizing || isSuggesting || !project.projectContext?.trim()} className="hover:glow-primary focus-visible:glow-primary">
                    {isGeneratingOutline ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                    {isGeneratingOutline ? 'Generating Sections...' : 'Generate/Update Sections'}
                  </Button>
                </CardFooter>
              </Card>
            ) : activeSectionIndex < -1 ? (
                 // Standard Page Placeholder
                 <StandardPagePlaceholder pageName={activeViewName} />
            ) : activeSection ? (
              // Section Editor
              <div className="space-y-6">
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
                        <Textarea id={`section-prompt-${activeSectionIndex}`} value={activeSection.prompt} onChange={(e) => handleSectionPromptChange(activeSectionIndex, e.target.value)} placeholder="Instructions for the AI..." className="mt-1 min-h-[100px] font-mono text-sm focus-visible:glow-primary" />
                      </div>
                      <Button onClick={() => handleGenerateSection(activeSectionIndex)} disabled={isGenerating || isSummarizing || isGeneratingOutline || isSuggesting} className="hover:glow-primary focus-visible:glow-primary">
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                        {isGenerating ? 'Generating...' : 'Generate Content'}
                      </Button>
                    </CardContent>
                  </Card>

                <Card className="shadow-md mb-6">
                  <CardHeader>
                    <CardTitle>{activeSection.name} - Content</CardTitle>
                    <CardDescription>Edit the content below.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea id={`section-content-${activeSectionIndex}`} value={activeSection.content} onChange={(e) => handleSectionContentChange(activeSectionIndex, e.target.value)} placeholder={"Generated content appears here..."} className="min-h-[400px] text-base focus-visible:glow-primary" />
                  </CardContent>
                    <CardFooter className="flex justify-end">
                      <Button variant="outline" onClick={() => handleSummarizeSection(activeSectionIndex)} disabled={isSummarizing || isGenerating || isGeneratingOutline || isSuggesting || !activeSection.content?.trim()} className="hover:glow-accent focus-visible:glow-accent">
                        {isSummarizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScrollText className="mr-2 h-4 w-4" />}
                        {isSummarizing ? 'Summarizing...' : 'Summarize'}
                      </Button>
                    </CardFooter>
                </Card>
              </div>
            ) : (
              // Initial state or section not found
              <div className="flex items-center justify-center h-full">
                 <Card className="text-center py-8 px-6 max-w-md mx-auto shadow-md">
                    <CardHeader>
                      <CardTitle className="text-xl text-primary text-glow-primary">Select or Generate Sections</CardTitle>
                      <CardDescription className="mt-2">Choose an item from the sidebar or generate sections if none exist.</CardDescription>
                    </CardHeader>
                    <CardContent className="mt-4 space-y-4">
                       <p>Go to <Button variant="link" className="p-0 h-auto text-base" onClick={() => setActiveSectionIndex(-1)}>Project Details</Button>, provide context, then click "Generate Sections".</p>
                      <Button variant="default" size="sm" onClick={handleGenerateTocClick} disabled={isGeneratingOutline || isGenerating || isSummarizing || isSuggesting || !project.projectContext?.trim()} className="hover:glow-primary focus-visible:glow-primary">
                        {isGeneratingOutline ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                        {isGeneratingOutline ? 'Generating...' : 'Generate Sections'}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-3">The AI will create sections based on your project context.</p>
                    </CardContent>
                  </Card>
              </div>
            )}

            {/* AI Suggestions Section */}
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
                             <div className="prose prose-sm max-w-none dark:prose-invert text-foreground" dangerouslySetInnerHTML={{ __html: marked.parse(suggestions) }} />
                        </div>
                    )}
                </CardContent>
            </Card>

          </ScrollArea>
        </div>

        {/* Floating Action Button (FAB) for Mobile/Draggable Sidebar Toggle */}
        {/* This button now triggers the Sheet */}
         <SheetTrigger asChild>
             <Button
                ref={fabRef}
                variant="default" // Use default style for FAB
                size="icon"
                className={cn(
                    "fixed z-20 rounded-full shadow-lg w-14 h-14 hover:glow-primary focus-visible:glow-primary cursor-grab active:cursor-grabbing",
                    "md:hidden" // Hide on medium and larger screens
                )}
                 style={{
                    left: `${fabPosition.x}px`,
                    top: `${fabPosition.y}px`,
                    position: 'fixed', // Ensure it uses fixed positioning relative to viewport
                 }}
                onMouseDown={onFabMouseDown}
                onClick={(e) => {
                    // Prevent sheet opening if it was a drag
                    if (isDraggingFab) {
                         e.preventDefault();
                         // Optional: reset drag state here if needed, though mouseUp should handle it
                    }
                     // Otherwise, let the default SheetTrigger behavior open the sheet
                }}
                title="Open project menu"
                aria-label="Open project menu"
             >
                <Menu className="h-6 w-6" />
             </Button>
         </SheetTrigger>

        {/* Context Warning Dialog */}
        <AlertDialog open={showOutlineContextAlert} onOpenChange={setShowOutlineContextAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Project Context May Be Limited</AlertDialogTitle>
              <AlertDialogDescription>
                The project context is short. Generating accurate sections might be difficult.
                Consider adding more details in "Project Context" for better results. Proceed anyway?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={proceedWithTocGeneration}>Generate Anyway</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </Sheet>
  );
}

    